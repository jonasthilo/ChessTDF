import { TowerRepository } from '../database/repositories/TowerRepository';
import { EnemyRepository } from '../database/repositories/EnemyRepository';
import { SettingsRepository } from '../database/repositories/SettingsRepository';
import {
  TowerDefinition,
  TowerLevel,
  TowerDefinitionWithLevels,
  EnemyDefinition,
  GameSettings,
  SettingsMode,
} from '../types';

/**
 * ConfigService
 * Manages all game configuration: tower definitions, enemy definitions, tower levels, and game settings
 * Merged from DefinitionsService + SettingsService
 */
export class ConfigService {
  private towerRepo: TowerRepository;
  private enemyRepo: EnemyRepository;
  private settingsRepo: SettingsRepository;

  constructor() {
    this.towerRepo = new TowerRepository();
    this.enemyRepo = new EnemyRepository();
    this.settingsRepo = new SettingsRepository();
  }

  // ==================== Tower Definitions ====================

  // Get tower definitions with all levels
  // If id provided: return single tower, otherwise return all
  async getTowerDefinitionsWithLevels(id?: number): Promise<TowerDefinitionWithLevels[]> {
    const definitions = id
      ? [await this.towerRepo.getTowerDefinition(id)].filter((d): d is TowerDefinition => d !== null)
      : await this.towerRepo.getAllTowerDefinitions();

    const allLevels = id
      ? await this.towerRepo.getTowerLevels(id)
      : await this.towerRepo.getAllTowerLevels();

    return definitions.map(def => {
      const levels = allLevels.filter(l => l.towerId === def.id);
      return { ...def, levels };
    });
  }

  // Update tower definition metadata (name, description, color, maxLevel)
  async updateTowerDefinition(id: number, updates: Partial<TowerDefinition>): Promise<boolean> {
    if (updates.maxLevel !== undefined && (updates.maxLevel < 1 || updates.maxLevel > 10)) {
      throw new Error('Max level must be between 1 and 10');
    }

    const success = await this.towerRepo.updateTowerDefinition(id, updates);

    // If maxLevel was updated, ensure all levels up to maxLevel exist
    if (success && updates.maxLevel !== undefined) {
      await this.ensureTowerLevelsExist(id, updates.maxLevel);
    }

    return success;
  }

  // Ensure all tower levels from 1 to maxLevel exist, creating missing ones with default values
  private async ensureTowerLevelsExist(towerId: number, maxLevel: number): Promise<void> {
    const existingLevels = await this.towerRepo.getTowerLevels(towerId);
    const existingLevelNumbers = new Set(existingLevels.map(l => l.level));

    // Get level 1 as base for calculating defaults
    const baseLevel = existingLevels.find(l => l.level === 1);
    if (!baseLevel) {
      throw new Error(`Tower ${towerId} must have at least level 1 defined`);
    }

    // Create missing levels with progressive stats based on level 1
    for (let level = 1; level <= maxLevel; level++) {
      if (!existingLevelNumbers.has(level)) {
        // Calculate stats that scale with level
        const scaleFactor = level;
        const newLevel: TowerLevel = {
          towerId,
          level,
          cost: Math.round(baseLevel.cost * scaleFactor * 1.5),
          damage: Math.round(baseLevel.damage * scaleFactor * 1.2),
          range: Math.round(baseLevel.range + (level - 1) * 10),
          fireRate: parseFloat((baseLevel.fireRate * (1 + (level - 1) * 0.1)).toFixed(2)),
        };
        await this.towerRepo.upsertTowerLevel(newLevel);
      }
    }
  }

  // ==================== Tower Levels CRUD ====================

  // Get tower level(s) - if level provided: return single, otherwise return all for tower ID
  async getTowerLevel(towerId: number, level: number): Promise<TowerLevel | null>;
  async getTowerLevel(towerId: number): Promise<TowerLevel[]>;
  async getTowerLevel(towerId: number, level?: number): Promise<TowerLevel | TowerLevel[] | null> {
    if (level !== undefined) {
      return await this.towerRepo.getTowerLevel(towerId, level);
    }
    return await this.towerRepo.getTowerLevels(towerId);
  }

  async upsertTowerLevel(towerLevel: TowerLevel): Promise<boolean> {
    this.validateTowerLevel(towerLevel);
    return await this.towerRepo.upsertTowerLevel(towerLevel);
  }

  async deleteTowerLevel(towerId: number, level: number): Promise<boolean> {
    return await this.towerRepo.deleteTowerLevel(towerId, level);
  }

  private validateTowerLevel(level: TowerLevel): void {
    if (level.level < 1) throw new Error('Level must be at least 1');
    if (level.cost < 1) throw new Error('Cost must be at least 1');
    if (level.damage < 1) throw new Error('Damage must be at least 1');
    if (level.range < 1) throw new Error('Range must be at least 1');
    if (level.fireRate <= 0) throw new Error('Fire rate must be greater than 0');
  }

  // ==================== Enemy Definitions ====================

  async getAllEnemyDefinitions(): Promise<EnemyDefinition[]> {
    return await this.enemyRepo.getAllEnemyDefinitions();
  }

  async getEnemyDefinition(id: number): Promise<EnemyDefinition | null> {
    return await this.enemyRepo.getEnemyDefinition(id);
  }

  async updateEnemyDefinition(id: number, updates: Partial<EnemyDefinition>): Promise<boolean> {
    if (updates.health !== undefined && updates.health < 1) {
      throw new Error('Enemy health must be at least 1');
    }
    if (updates.speed !== undefined && updates.speed < 1) {
      throw new Error('Enemy speed must be at least 1');
    }
    if (updates.reward !== undefined && updates.reward < 0) {
      throw new Error('Enemy reward cannot be negative');
    }
    if (updates.size !== undefined && updates.size < 1) {
      throw new Error('Enemy size must be at least 1');
    }

    return await this.enemyRepo.updateEnemyDefinition(id, updates);
  }

  // ==================== Game Settings ====================

  async getAllSettings(): Promise<GameSettings[]> {
    return await this.settingsRepo.getAllSettings();
  }

  async getSettingsByMode(mode: SettingsMode): Promise<GameSettings | null> {
    return await this.settingsRepo.getSettingsByMode(mode);
  }

  async getSettingsById(id: number): Promise<GameSettings | null> {
    return await this.settingsRepo.getSettingsById(id);
  }

  async createCustomSettings(
    settings: Omit<GameSettings, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<GameSettings> {
    this.validateSettings(settings);
    return await this.settingsRepo.createSettings(settings);
  }

  async updateSettings(id: number, updates: Partial<GameSettings>): Promise<boolean> {
    this.validateSettings(updates);
    return await this.settingsRepo.updateSettings(id, updates);
  }

  async getDefaultSettings(): Promise<GameSettings | null> {
    return await this.getSettingsByMode('normal');
  }

  private validateSettings(settings: Partial<GameSettings>): void {
    const multipliers = [
      { name: 'towerCostMultiplier', value: settings.towerCostMultiplier },
      { name: 'enemyHealthMultiplier', value: settings.enemyHealthMultiplier },
      { name: 'enemySpeedMultiplier', value: settings.enemySpeedMultiplier },
      { name: 'enemyRewardMultiplier', value: settings.enemyRewardMultiplier },
    ];

    for (const { name, value } of multipliers) {
      if (value !== undefined && (value < 0.5 || value > 3.0)) {
        throw new Error(`${name} must be between 0.5 and 3.0, got ${value}`);
      }
    }

    const waveMultipliers = [
      { name: 'enemyHealthWaveMultiplier', value: settings.enemyHealthWaveMultiplier },
      { name: 'enemyRewardWaveMultiplier', value: settings.enemyRewardWaveMultiplier },
    ];

    for (const { name, value } of waveMultipliers) {
      if (value !== undefined && (value < 0 || value > 1.0)) {
        throw new Error(`${name} must be between 0 and 1.0, got ${value}`);
      }
    }

    if (settings.initialCoins !== undefined && (settings.initialCoins < 50 || settings.initialCoins > 1000)) {
      throw new Error(`initialCoins must be between 50 and 1000, got ${settings.initialCoins}`);
    }

    if (settings.initialLives !== undefined && (settings.initialLives < 1 || settings.initialLives > 50)) {
      throw new Error(`initialLives must be between 1 and 50, got ${settings.initialLives}`);
    }
  }
}

// Export singleton instance
export const configService = new ConfigService();
