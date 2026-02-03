import { v4 as uuidv4 } from 'uuid';
import {
  GameSession,
  BuildTowerRequest,
  Tower,
  TowerDB,
  TowerStats,
  TowerLevel,
  GameMode,
  SettingsMode,
} from '../types';
import { GameSessionRepository } from '../database/repositories/GameSessionRepository';
import { ConfigService } from './ConfigService';
import { StatisticsService } from './StatisticsService';

/**
 * GameService
 * Manages game lifecycle with database persistence
 */
export class GameService {
  private static readonly GRID_SIZE = 60; // pixels per grid cell

  private gameSessionRepo: GameSessionRepository;
  private configService: ConfigService;
  private statsService: StatisticsService;

  constructor() {
    this.gameSessionRepo = new GameSessionRepository();
    this.configService = new ConfigService();
    this.statsService = new StatisticsService();
  }

  private static levelToStats(level: TowerLevel): TowerStats {
    return {
      cost: level.cost,
      damage: level.damage,
      range: level.range,
      fireRate: level.fireRate,
      projectileSpeed: level.projectileSpeed,
      splashRadius: level.splashRadius,
      splashChance: level.splashChance,
      chainCount: level.chainCount,
      pierceCount: level.pierceCount,
      targetCount: level.targetCount,
      statusEffect: level.statusEffect,
      effectDuration: level.effectDuration,
      effectStrength: level.effectStrength,
      auraRadius: level.auraRadius,
      auraEffect: level.auraEffect,
      auraStrength: level.auraStrength,
    };
  }

  private static towerToDb(t: Tower): TowerDB {
    return { id: t.id, towerId: t.towerId, gridX: t.gridX, gridY: t.gridY, level: t.level, stats: t.stats };
  }

  /**
   * Create a new game session with settings
   */
  async createGame(
    gameMode: GameMode = '10waves',
    difficulty: SettingsMode = 'normal'
  ): Promise<GameSession> {
    // Get settings for the difficulty
    const settings = await this.configService.getSettingsByMode(difficulty);
    if (!settings) {
      throw new Error('Failed to load game settings');
    }

    const gameId = uuidv4();

    // Create database session
    await this.gameSessionRepo.createGameSession({
      gameId,
      settingsId: settings.id ?? null,
      gameMode,
      currentWave: 0,
      wavesCompleted: 0,
      coins: settings.initialCoins,
      lives: settings.initialLives,
      towers: [],
      enemiesKilled: 0,
      coinsEarned: 0,
      coinsSpent: 0,
      damageDealt: 0,
      status: 'active',
    });

    // Return game session
    return {
      id: gameId,
      coins: settings.initialCoins,
      lives: settings.initialLives,
      wave: 0,
      towers: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
      gameMode,
      settingsId: settings.id ?? 0,
    };
  }

  /**
   * Get game state
   */
  async getGame(gameId: string): Promise<GameSession | undefined> {
    const session = await this.gameSessionRepo.getGameSession(gameId);
    if (!session) return undefined;

    // Convert database towers to game towers
    const towers: Tower[] = session.towers.map((t) => ({
      id: t.id,
      towerId: t.towerId,
      gridX: t.gridX,
      gridY: t.gridY,
      x: t.gridX * GameService.GRID_SIZE + GameService.GRID_SIZE / 2,
      y: t.gridY * GameService.GRID_SIZE + GameService.GRID_SIZE / 2,
      level: t.level ?? 1,
      stats: t.stats,
      lastFireTime: 0,
    }));

    return {
      id: session.gameId,
      coins: session.coins,
      lives: session.lives,
      wave: session.currentWave,
      towers,
      createdAt: session.startedAt,
      lastUpdated: session.lastUpdated,
      gameMode: session.gameMode,
      settingsId: session.settingsId ?? undefined,
    };
  }

  /**
   * Build a tower
   */
  async buildTower(
    gameId: string,
    request: BuildTowerRequest
  ): Promise<{ success: boolean; tower?: Tower; remainingCoins?: number; message?: string }> {
    const game = await this.getGame(gameId);
    if (!game) {
      return { success: false, message: 'Game not found' };
    }

    // Get level 1 stats for this tower ID
    const level1 = await this.configService.getTowerLevel(request.towerId, 1);
    if (!level1) {
      return { success: false, message: 'Invalid tower ID' };
    }

    // Check if player has enough coins
    if (game.coins < level1.cost) {
      return { success: false, message: 'Insufficient coins' };
    }

    // Check if position is occupied
    const isOccupied = game.towers.some(
      (t) => t.gridX === request.gridX && t.gridY === request.gridY
    );
    if (isOccupied) {
      return { success: false, message: 'Position already occupied' };
    }

    // Create stats from level 1 data
    const stats = GameService.levelToStats(level1);

    // Create tower
    const tower: Tower = {
      id: uuidv4(),
      towerId: request.towerId,
      gridX: request.gridX,
      gridY: request.gridY,
      x: request.gridX * GameService.GRID_SIZE + GameService.GRID_SIZE / 2,
      y: request.gridY * GameService.GRID_SIZE + GameService.GRID_SIZE / 2,
      level: 1,
      stats,
      lastFireTime: 0,
    };

    // Deduct coins and add tower
    const remainingCoins = game.coins - level1.cost;
    const dbSession = await this.gameSessionRepo.getGameSession(gameId);

    await this.gameSessionRepo.updateGameSession(gameId, {
      coins: remainingCoins,
      coinsSpent: (dbSession?.coinsSpent ?? 0) + level1.cost,
      towers: [...game.towers.map(GameService.towerToDb), GameService.towerToDb(tower)],
    });

    return { success: true, tower, remainingCoins };
  }

  /**
   * Upgrade a tower
   */
  async upgradeTower(
    gameId: string,
    towerId: string
  ): Promise<{ success: boolean; tower?: Tower; remainingCoins?: number; message?: string }> {
    const game = await this.getGame(gameId);
    if (!game) {
      return { success: false, message: 'Game not found' };
    }

    const tower = game.towers.find((t) => t.id === towerId);
    if (!tower) {
      return { success: false, message: 'Tower not found' };
    }

    // Get next level stats
    const nextLevel = tower.level + 1;
    const nextLevelData = await this.configService.getTowerLevel(tower.towerId, nextLevel);
    if (!nextLevelData) {
      return { success: false, message: 'Tower already at max level' };
    }

    // Check if player has enough coins
    if (game.coins < nextLevelData.cost) {
      return { success: false, message: 'Insufficient coins' };
    }

    // Create new stats from next level data
    const newStats = GameService.levelToStats(nextLevelData);

    // Create upgraded tower
    const upgradedTower: Tower = {
      ...tower,
      level: nextLevel,
      stats: newStats,
    };

    // Update game session
    const remainingCoins = game.coins - nextLevelData.cost;
    const dbSession = await this.gameSessionRepo.getGameSession(gameId);

    const updatedTowers = game.towers.map((t) =>
      t.id === towerId
        ? GameService.towerToDb({ ...t, level: nextLevel, stats: newStats })
        : GameService.towerToDb(t)
    );

    await this.gameSessionRepo.updateGameSession(gameId, {
      coins: remainingCoins,
      coinsSpent: (dbSession?.coinsSpent ?? 0) + nextLevelData.cost,
      towers: updatedTowers,
    });

    return { success: true, tower: upgradedTower, remainingCoins };
  }

  /**
   * Sell a tower (70% refund of total invested)
   */
  async sellTower(
    gameId: string,
    towerId: string
  ): Promise<{
    success: boolean;
    refundAmount?: number;
    remainingCoins?: number;
    message?: string;
  }> {
    const game = await this.getGame(gameId);
    if (!game) {
      return { success: false, message: 'Game not found' };
    }

    const tower = game.towers.find((t) => t.id === towerId);
    if (!tower) {
      return { success: false, message: 'Tower not found' };
    }

    // Calculate total invested (sum of all level costs up to current level)
    const levels = await this.configService.getTowerLevel(tower.towerId);
    let totalInvested = 0;
    for (const lvl of levels) {
      if (lvl.level <= tower.level) {
        totalInvested += lvl.cost;
      }
    }

    // Calculate refund (70% of total invested)
    const refundAmount = Math.floor(totalInvested * 0.7);
    const remainingCoins = game.coins + refundAmount;

    // Remove tower and add refund
    const updatedTowers = game.towers.filter((t) => t.id !== towerId).map(GameService.towerToDb);

    await this.gameSessionRepo.updateGameSession(gameId, {
      coins: remainingCoins,
      towers: updatedTowers,
    });

    return { success: true, refundAmount, remainingCoins };
  }

  /**
   * Start next wave
   */
  async startWave(gameId: string): Promise<boolean> {
    const game = await this.getGame(gameId);
    if (!game) {
      return false;
    }

    await this.gameSessionRepo.updateGameSession(gameId, {
      currentWave: game.wave + 1,
    });

    return true;
  }

  /**
   * Complete a wave (track success)
   */
  async completeWave(gameId: string): Promise<boolean> {
    const game = await this.getGame(gameId);
    if (!game) {
      return false;
    }

    const dbSession = await this.gameSessionRepo.getGameSession(gameId);
    await this.gameSessionRepo.updateGameSession(gameId, {
      wavesCompleted: (dbSession?.wavesCompleted ?? 0) + 1,
    });

    return true;
  }

  /**
   * Update coins (called when enemy dies)
   */
  async addCoins(gameId: string, amount: number): Promise<boolean> {
    const game = await this.getGame(gameId);
    if (!game) {
      return false;
    }

    const dbSession = await this.gameSessionRepo.getGameSession(gameId);
    await this.gameSessionRepo.updateGameSession(gameId, {
      coins: game.coins + amount,
      coinsEarned: (dbSession?.coinsEarned ?? 0) + amount,
    });

    return true;
  }

  /**
   * Lose a life (called when enemy reaches end)
   */
  async loseLife(gameId: string): Promise<boolean> {
    const game = await this.getGame(gameId);
    if (!game) {
      return false;
    }

    const newLives = Math.max(0, game.lives - 1);
    await this.gameSessionRepo.updateGameSession(gameId, {
      lives: newLives,
    });

    return newLives > 0; // Return false if game over
  }

  /**
   * End game (record statistics and delete session)
   */
  async endGame(
    gameId: string,
    outcome: 'win' | 'loss',
    stats: {
      duration: number;
      enemiesKilledTotal: number;
      enemiesKilledByType: Record<string, number>;
      towersBuiltTotal: number;
      towersBuiltByType: Record<string, number>;
      coinsEarned: number;
      coinsSpent: number;
      damageDealt: number;
    }
  ): Promise<boolean> {
    const game = await this.getGame(gameId);
    if (!game) {
      return false;
    }

    // Record statistics
    await this.statsService.recordGameStatistics({
      gameId,
      outcome,
      gameMode: game.gameMode ?? '10waves',
      finalWave: game.wave,
      wavesCompleted: outcome === 'win' ? game.wave : game.wave - 1,
      duration: stats.duration,
      enemiesKilledTotal: stats.enemiesKilledTotal,
      enemiesKilledByType: stats.enemiesKilledByType,
      towersBuiltTotal: stats.towersBuiltTotal,
      towersBuiltByType: stats.towersBuiltByType,
      coinsEarned: stats.coinsEarned,
      coinsSpent: stats.coinsSpent,
      damageDealt: stats.damageDealt,
      timestamp: new Date(),
    });

    // Delete game session
    return await this.gameSessionRepo.deleteGameSession(gameId);
  }
}

// Export singleton instance
export const gameService = new GameService();
