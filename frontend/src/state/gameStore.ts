/**
 * RESPONSIBILITY: Single source of truth for game state.
 * - All state (coins, lives, towers, enemies, projectiles)
 * - All mutations (add/update/remove)
 * - All API calls to backend
 * - All game rule validation (placement, affordability, game over)
 *
 * NO: Rendering, loop timing, system orchestration
 */
import { create } from 'zustand';
import type {
  TowerDefinitionWithLevels,
  TowerStats,
  EnemyDefinition,
  EnemySpawnData,
  Tower,
  Enemy,
  Projectile,
  TargetingMode,
  AttackType,
} from '../types';
import { gameApi } from '../services/gameApi';
import { GAME_CONFIG, CanvasState } from '../config/gameConfig';
import { GridManager } from '../game/managers/GridManager';
import { PathManager } from '../game/managers/PathManager';

type GameResult = 'win' | 'loss' | null;

interface GameStore {
  // Settings
  selectedDifficulty: string;
  setDifficulty: (difficulty: string) => void;
  gameSpeed: 1 | 3;
  toggleGameSpeed: () => void;

  // Game session
  gameId: string | null;
  coins: number;
  lives: number;
  wave: number;
  wavesSurvived: number;
  waveEnemiesTotal: number;
  waveEnemiesDealt: number;
  isPlaying: boolean;
  enemiesKilled: number;
  gameResult: GameResult;
  gameTime: number;
  updateGameTime: (deltaTime: number) => void;

  // Wave scaling multipliers (from startWave response)
  enemyHealthWaveMultiplier: number;
  enemyRewardWaveMultiplier: number;

  // Game configuration (from backend)
  towerDefinitions: TowerDefinitionWithLevels[];
  enemyDefinitions: EnemyDefinition[];

  // Helper methods for tower definitions
  getTowerDefinition: (towerId: number) => TowerDefinitionWithLevels | null;
  getTowerLevelStats: (towerId: number, level: number) => TowerStats | null;
  getTowerMaxLevel: (towerId: number) => number;

  // Game entities (client-side)
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];

  // Tower building
  selectedTowerId: number | null;
  selectTowerId: (towerId: number | null) => void;

  // Tower selection (for modal)
  selectedTower: Tower | null;
  selectTower: (tower: Tower | null) => void;

  // Enemy selection (for stats panel) - stores only ID for DRY
  selectedEnemyId: string | null;
  selectEnemy: (enemyId: string | null) => void;
  getSelectedEnemy: () => Enemy | null;

  // Tower targeting mode
  setTowerTargetingMode: (towerId: string, mode: TargetingMode) => void;

  // Tower upgrade/sell
  upgradeTower: (towerId: string) => Promise<boolean>;
  sellTower: (towerId: string) => Promise<boolean>;

  // Backend-synced game state updates
  addCoinsFromBackend: (amount: number) => Promise<void>;
  loseLifeFromBackend: () => Promise<void>;

  // Actions
  initializeGame: () => Promise<void>;
  startGame: () => Promise<string | null>;
  buildTower: (gridX: number, gridY: number) => Promise<boolean>;
  startWave: () => Promise<EnemySpawnData[] | undefined>;
  endGame: (result: GameResult) => Promise<void>;

  // Game logic (called by GameEngine)
  handleTowerPlacement: (gridX: number, gridY: number) => Promise<void>;
  checkGameOver: () => void;
  checkWaveComplete: () => void;

  // Client-side game state updates
  updateCoins: (amount: number) => void;
  updateLives: (amount: number) => void;
  addTower: (tower: Tower) => void;
  updateTower: (towerId: string, updates: Partial<Tower>) => void;
  addEnemy: (enemy: Enemy) => void;
  removeEnemy: (enemyId: string) => void;
  updateEnemy: (enemyId: string, updates: Partial<Enemy>) => void;
  addProjectile: (projectile: Projectile) => void;
  removeProjectile: (projectileId: string) => void;
  updateProjectile: (projectileId: string, updates: Partial<Projectile>) => void;
  incrementEnemiesKilled: () => void;
  incrementWaveEnemiesDealt: () => void;
  setWaveEnemiesTotal: (count: number) => void;
  markWaveSurvived: () => void;

  // Spawn queue (game-loop driven, respects gameSpeed)
  spawnQueue: EnemySpawnData[];
  spawnElapsed: number;
  setSpawnQueue: (queue: EnemySpawnData[]) => void;
  processSpawnQueue: (deltaTime: number) => void;

  // Resize
  repositionEntitiesAfterResize: () => void;

  // Reset
  resetGame: () => void;
}

/**
 * Hydrate a tower from backend with runtime properties from definition
 */
function hydrateTower(
  backendTower: Omit<Tower, 'attackType' | 'targetingMode'>,
  definition: TowerDefinitionWithLevels
): Tower {
  return {
    ...backendTower,
    attackType: definition.attackType,
    targetingMode: definition.defaultTargeting,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  selectedDifficulty: 'normal',
  gameSpeed: 1,
  gameId: null,
  coins: 0,
  lives: 0,
  wave: 0,
  wavesSurvived: 0,
  waveEnemiesTotal: 0,
  waveEnemiesDealt: 0,
  isPlaying: false,
  enemiesKilled: 0,
  gameResult: null,
  gameTime: 0,
  enemyHealthWaveMultiplier: 0.1,
  enemyRewardWaveMultiplier: 0.05,
  towerDefinitions: [],
  enemyDefinitions: [],
  towers: [],
  enemies: [],
  projectiles: [],
  selectedTowerId: null,
  selectedEnemyId: null,
  spawnQueue: [],
  spawnElapsed: 0,

  // Difficulty setting
  setDifficulty: (difficulty) => set({ selectedDifficulty: difficulty }),

  // Game speed
  toggleGameSpeed: () => set((state) => ({ gameSpeed: state.gameSpeed === 1 ? 3 : 1 })),

  // Tower selection (for building)
  selectTowerId: (towerId) => set({ selectedTowerId: towerId }),

  // Tower selection (for modal) - clears enemy selection for mutual exclusivity
  selectedTower: null,
  selectTower: (tower) =>
    set({ selectedTower: tower, selectedEnemyId: tower ? null : get().selectedEnemyId }),

  // Enemy selection (for stats panel) - clears tower selection for mutual exclusivity
  selectEnemy: (enemyId) =>
    set({ selectedEnemyId: enemyId, selectedTower: enemyId ? null : get().selectedTower }),

  // Get live enemy data from enemies array (single source of truth)
  getSelectedEnemy: () => {
    const { selectedEnemyId, enemies } = get();
    if (!selectedEnemyId) return null;
    return enemies.find((e) => e.id === selectedEnemyId) ?? null;
  },

  // Helper methods for tower definitions
  getTowerDefinition: (towerId) => {
    const { towerDefinitions } = get();
    return towerDefinitions.find((t) => t.id === towerId) ?? null;
  },

  getTowerLevelStats: (towerId, level) => {
    const def = get().getTowerDefinition(towerId);
    if (!def) return null;
    const levelData = def.levels.find((l) => l.level === level);
    if (!levelData) return null;
    return {
      cost: levelData.cost,
      damage: levelData.damage,
      range: levelData.range,
      fireRate: levelData.fireRate,
      projectileSpeed: levelData.projectileSpeed,
      splashRadius: levelData.splashRadius,
      splashChance: levelData.splashChance,
      chainCount: levelData.chainCount,
      pierceCount: levelData.pierceCount,
      targetCount: levelData.targetCount,
      statusEffect: levelData.statusEffect,
      effectDuration: levelData.effectDuration,
      effectStrength: levelData.effectStrength,
      auraRadius: levelData.auraRadius,
      auraEffect: levelData.auraEffect,
      auraStrength: levelData.auraStrength,
    };
  },

  getTowerMaxLevel: (towerId) => {
    const def = get().getTowerDefinition(towerId);
    return def?.maxLevel ?? 1;
  },

  // Tower targeting mode
  setTowerTargetingMode: (towerId, mode) => {
    set((state) => ({
      towers: state.towers.map((t) => (t.id === towerId ? { ...t, targetingMode: mode } : t)),
      selectedTower:
        state.selectedTower?.id === towerId
          ? { ...state.selectedTower, targetingMode: mode }
          : state.selectedTower,
    }));
  },

  // Tower upgrade
  upgradeTower: async (towerId) => {
    const { gameId, towers, towerDefinitions } = get();
    if (!gameId) {
      console.error('No gameId for upgrade');
      return false;
    }

    const currentTower = towers.find((t) => t.id === towerId);

    try {
      const response = await gameApi.upgradeTower(gameId, towerId);
      if (response.success && response.tower) {
        const upgradedTower = response.tower;
        // Get definition to preserve attackType, and keep current targetingMode
        const definition = towerDefinitions.find((d) => d.id === currentTower?.towerId);
        const attackType: AttackType = definition?.attackType ?? 'single';
        const targetingMode: TargetingMode = currentTower?.targetingMode ?? 'first';

        set((state) => ({
          towers: state.towers.map((t) =>
            t.id === towerId
              ? {
                  ...t,
                  level: upgradedTower.level,
                  stats: upgradedTower.stats,
                  attackType,
                  targetingMode,
                }
              : t
          ),
          coins: response.remainingCoins,
          selectedTower:
            state.selectedTower?.id === towerId
              ? {
                  ...state.selectedTower,
                  level: upgradedTower.level,
                  stats: upgradedTower.stats,
                  attackType,
                  targetingMode,
                }
              : state.selectedTower,
        }));
        return true;
      }
      console.error('Upgrade failed:', response.message);
      return false;
    } catch (error: unknown) {
      // Extract error message from axios error response
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        console.error(
          'Failed to upgrade tower:',
          axiosError.response?.data?.error || 'Unknown error'
        );
      } else {
        console.error('Failed to upgrade tower:', error);
      }
      return false;
    }
  },

  // Tower sell
  sellTower: async (towerId) => {
    const { gameId } = get();
    if (!gameId) return false;

    try {
      const response = await gameApi.sellTower(gameId, towerId);
      if (response.success) {
        set((state) => ({
          towers: state.towers.filter((t) => t.id !== towerId),
          coins: response.remainingCoins,
          selectedTower: null,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to sell tower:', error);
      return false;
    }
  },

  // Initialize game configuration from backend
  initializeGame: async () => {
    try {
      const config = await gameApi.getConfig();
      set({
        towerDefinitions: config.towers,
        enemyDefinitions: config.enemies,
      });
    } catch (error) {
      console.error('Failed to initialize game:', error);
    }
  },

  // Start new game session
  startGame: async () => {
    try {
      const { selectedDifficulty } = get();

      // Fetch fresh config and start game in parallel
      const [config, response] = await Promise.all([
        gameApi.getConfig(),
        gameApi.startGame(selectedDifficulty),
      ]);

      set({
        // Fresh definitions from database
        towerDefinitions: config.towers,
        enemyDefinitions: config.enemies,
        // Game session data
        gameId: response.gameId,
        coins: response.initialCoins,
        lives: response.lives,
        wave: 0,
        wavesSurvived: 0,
        waveEnemiesTotal: 0,
        waveEnemiesDealt: 0,
        isPlaying: false,
        enemiesKilled: 0,
        gameTime: 0,
        gameSpeed: 1,
        towers: [],
        enemies: [],
        projectiles: [],
        selectedTowerId: null,
        selectedTower: null,
        selectedEnemyId: null,
        gameResult: null,
      });
      return response.gameId;
    } catch (error) {
      console.error('Failed to start game:', error);
      return null;
    }
  },

  // Build tower
  buildTower: async (gridX, gridY) => {
    const { gameId, selectedTowerId, towerDefinitions } = get();
    if (!gameId || !selectedTowerId) return false;

    try {
      const response = await gameApi.buildTower(gameId, {
        towerId: selectedTowerId,
        gridX,
        gridY,
      });

      if (response.success && response.tower) {
        // Get tower definition for hydration
        const definition = towerDefinitions.find((d) => d.id === selectedTowerId);
        if (!definition) {
          console.error('Tower definition not found for ID:', selectedTowerId);
          return false;
        }

        // Recalculate tower position using frontend grid size
        const gridManager = new GridManager();
        const pixelPos = gridManager.gridToPixel(response.tower.gridX, response.tower.gridY);

        // Hydrate tower with runtime properties
        const hydratedTower = hydrateTower(
          {
            ...response.tower,
            x: pixelPos.x,
            y: pixelPos.y,
          },
          definition
        );

        set((state) => ({
          towers: [...state.towers, hydratedTower],
          coins: response.remainingCoins,
          selectedTowerId: null,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to build tower:', error);
      return false;
    }
  },

  // Start wave
  startWave: async () => {
    const { gameId } = get();
    if (!gameId) return;

    try {
      const response = await gameApi.startWave(gameId);
      set({
        wave: response.waveNumber,
        isPlaying: true,
        enemyHealthWaveMultiplier: response.enemyHealthWaveMultiplier,
        enemyRewardWaveMultiplier: response.enemyRewardWaveMultiplier,
      });

      // Return spawn data for game engine to handle
      return response.enemies;
    } catch (error) {
      console.error('Failed to start wave:', error);
    }
  },

  // End game
  endGame: async (result) => {
    const { gameId, wave, enemiesKilled } = get();
    if (!gameId) return;

    try {
      await gameApi.endGame(gameId, {
        finalWave: wave,
        enemiesKilled,
      });
      set({ gameResult: result });
    } catch (error) {
      console.error('Failed to end game:', error);
      set({ gameResult: result });
    }
  },

  // Handle tower placement (all validation + building)
  handleTowerPlacement: async (gridX, gridY) => {
    const state = get();
    const { towers, selectedTowerId, towerDefinitions, coins } = state;

    // Check if clicking on an existing tower
    const existingTower = towers.find((t) => t.gridX === gridX && t.gridY === gridY);

    if (existingTower) {
      // If no tower ID selected, open modal for this tower
      if (!selectedTowerId) {
        get().selectTower(existingTower);
        return;
      }
      // If tower ID is selected, cannot place on occupied cell
      console.warn('Cannot place tower: cell occupied');
      return;
    }

    // No existing tower - proceed with placement logic
    if (!selectedTowerId) return;

    // Validate grid bounds
    if (
      gridX < 0 ||
      gridX >= GAME_CONFIG.GRID_COLS ||
      gridY < 0 ||
      gridY >= GAME_CONFIG.GRID_ROWS
    ) {
      console.warn('Invalid tower placement: out of bounds');
      return;
    }

    // Check restricted rows (enemy path)
    if ((GAME_CONFIG.RESTRICTED_ROWS as readonly number[]).includes(gridY)) {
      console.warn('Invalid tower placement: restricted row');
      return;
    }

    // Get tower definition
    const towerDef = towerDefinitions.find((t) => t.id === selectedTowerId);
    if (!towerDef) return;

    // Check if player can afford (check level 1 cost)
    const level1 = towerDef.levels.find((l) => l.level === 1);
    if (!level1) {
      console.warn('No level 1 data for tower:', selectedTowerId);
      return;
    }

    if (coins < level1.cost) {
      console.warn('Not enough coins');
      return;
    }

    // Place tower via API
    await state.buildTower(gridX, gridY);
  },

  // Check if game is over (called after collision system)
  checkGameOver: () => {
    const { lives, isPlaying } = get();
    if (lives <= 0 && isPlaying) {
      get().endGame('loss');
    }
  },

  // Check if wave is complete (called each frame)
  checkWaveComplete: () => {
    const { isPlaying, waveEnemiesTotal, waveEnemiesDealt, lives } = get();

    if (isPlaying && waveEnemiesTotal > 0 && waveEnemiesDealt >= waveEnemiesTotal) {
      if (lives > 0) {
        get().markWaveSurvived();
      } else {
        set({ isPlaying: false });
      }
    }
  },

  // Backend-synced updates (call API, then update state)
  addCoinsFromBackend: async (amount) => {
    const { gameId } = get();
    if (!gameId) return;

    try {
      const response = await gameApi.addCoins(gameId, amount);
      set({ coins: response.coins });
    } catch (error) {
      console.error('Failed to add coins:', error);
    }
  },

  loseLifeFromBackend: async () => {
    const { gameId } = get();
    if (!gameId) return;

    try {
      const response = await gameApi.loseLife(gameId);
      set({ lives: response.lives });
      if (response.gameOver) {
        get().endGame('loss');
      }
    } catch (error) {
      console.error('Failed to lose life:', error);
    }
  },

  // Client-side updates (local only, for display purposes)
  updateCoins: (amount) => set((state) => ({ coins: state.coins + amount })),
  updateLives: (amount) => set((state) => ({ lives: state.lives + amount })),
  updateGameTime: (deltaTime) => set((state) => ({ gameTime: state.gameTime + deltaTime })),
  addTower: (tower) => set((state) => ({ towers: [...state.towers, tower] })),
  updateTower: (towerId, updates) =>
    set((state) => ({
      towers: state.towers.map((t) => (t.id === towerId ? { ...t, ...updates } : t)),
    })),

  addEnemy: (enemy) => set((state) => ({ enemies: [...state.enemies, enemy] })),
  removeEnemy: (enemyId) =>
    set((state) => ({ enemies: state.enemies.filter((e) => e.id !== enemyId) })),
  updateEnemy: (enemyId, updates) =>
    set((state) => ({
      enemies: state.enemies.map((e) => (e.id === enemyId ? { ...e, ...updates } : e)),
    })),

  addProjectile: (projectile) =>
    set((state) => ({ projectiles: [...state.projectiles, projectile] })),
  removeProjectile: (projectileId) =>
    set((state) => ({
      projectiles: state.projectiles.filter((p) => p.id !== projectileId),
    })),
  updateProjectile: (projectileId, updates) =>
    set((state) => ({
      projectiles: state.projectiles.map((p) => (p.id === projectileId ? { ...p, ...updates } : p)),
    })),

  incrementEnemiesKilled: () => set((state) => ({ enemiesKilled: state.enemiesKilled + 1 })),

  incrementWaveEnemiesDealt: () =>
    set((state) => ({ waveEnemiesDealt: state.waveEnemiesDealt + 1 })),

  setWaveEnemiesTotal: (count) => set({ waveEnemiesTotal: count, waveEnemiesDealt: 0 }),

  markWaveSurvived: () =>
    set((state) => ({
      wavesSurvived: state.wavesSurvived + 1,
      isPlaying: false,
      waveEnemiesTotal: 0,
      waveEnemiesDealt: 0,
    })),

  // Spawn queue management
  setSpawnQueue: (queue) => set({ spawnQueue: queue, spawnElapsed: 0 }),

  processSpawnQueue: (deltaTime) => {
    const state = get();
    if (state.spawnQueue.length === 0) return;

    const newElapsed = state.spawnElapsed + deltaTime;
    const pathManager = new PathManager();
    const remaining: EnemySpawnData[] = [];

    for (const data of state.spawnQueue) {
      if (data.spawnDelay <= newElapsed) {
        const spawnPos = pathManager.getSpawnPosition();
        const enemyDef = state.enemyDefinitions.find((e) => e.id === data.enemyId);
        if (!enemyDef) continue;

        const scaledHealth = Math.round(
          enemyDef.health * (1 + state.wave * state.enemyHealthWaveMultiplier)
        );
        const scaledReward = Math.round(
          enemyDef.reward * (1 + state.wave * state.enemyRewardWaveMultiplier)
        );

        state.addEnemy({
          id: `enemy-${Date.now()}-${Math.random()}`,
          enemyId: data.enemyId,
          definition: enemyDef,
          health: scaledHealth,
          maxHealth: scaledHealth,
          scaledReward,
          x: spawnPos.x,
          y: spawnPos.y,
          isDead: false,
          statusEffects: [], // Initialize with empty status effects
        });
      } else {
        remaining.push(data);
      }
    }

    set({ spawnQueue: remaining, spawnElapsed: newElapsed });
  },

  // Reposition entities after window resize
  repositionEntitiesAfterResize: () => {
    const gridManager = new GridManager();

    set((state) => ({
      towers: state.towers.map((tower) => {
        const pixelPos = gridManager.gridToPixel(tower.gridX, tower.gridY);
        return {
          ...tower,
          x: pixelPos.x,
          y: pixelPos.y,
        };
      }),
      enemies: state.enemies.map((enemy) => ({
        ...enemy,
        y: CanvasState.getEnemyPathY(),
      })),
    }));
  },

  // Reset game state
  resetGame: () =>
    set({
      gameSpeed: 1,
      gameId: null,
      coins: 0,
      lives: 0,
      wave: 0,
      wavesSurvived: 0,
      waveEnemiesTotal: 0,
      waveEnemiesDealt: 0,
      isPlaying: false,
      enemiesKilled: 0,
      gameResult: null,
      gameTime: 0,
      enemyHealthWaveMultiplier: 0.1,
      enemyRewardWaveMultiplier: 0.05,
      towers: [],
      enemies: [],
      projectiles: [],
      selectedTowerId: null,
      selectedTower: null,
      selectedEnemyId: null,
      spawnQueue: [],
      spawnElapsed: 0,
    }),
}));
