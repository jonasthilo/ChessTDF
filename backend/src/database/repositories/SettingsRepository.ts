import { query } from '../db';
import { GameSettings, SettingsMode } from '../../types';

interface SettingsRow {
  id: number;
  mode: string;
  initial_coins: number;
  initial_lives: number;
  tower_cost_multiplier: string;
  enemy_health_multiplier: string;
  enemy_speed_multiplier: string;
  enemy_reward_multiplier: string;
  enemy_health_wave_multiplier: string;
  enemy_reward_wave_multiplier: string;
  created_at: Date;
  updated_at: Date;
}

export class SettingsRepository {
  // Get all settings
  async getAllSettings(): Promise<GameSettings[]> {
    const result = await query<SettingsRow>('SELECT * FROM game_settings ORDER BY id ASC');
    return result.rows.map(this.mapToGameSettings);
  }

  // Get settings by mode
  async getSettingsByMode(mode: SettingsMode): Promise<GameSettings | null> {
    const result = await query<SettingsRow>('SELECT * FROM game_settings WHERE mode = $1 LIMIT 1', [
      mode,
    ]);
    if (result.rows.length === 0) return null;
    return this.mapToGameSettings(result.rows[0]!);
  }

  // Get settings by ID
  async getSettingsById(id: number): Promise<GameSettings | null> {
    const result = await query<SettingsRow>('SELECT * FROM game_settings WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapToGameSettings(result.rows[0]!);
  }

  // Create new custom settings
  async createSettings(settings: Omit<GameSettings, 'id'>): Promise<GameSettings> {
    const result = await query<SettingsRow>(
      `INSERT INTO game_settings (
        mode, initial_coins, initial_lives, tower_cost_multiplier,
        enemy_health_multiplier, enemy_speed_multiplier, enemy_reward_multiplier,
        enemy_health_wave_multiplier, enemy_reward_wave_multiplier
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        settings.mode,
        settings.initialCoins,
        settings.initialLives,
        settings.towerCostMultiplier,
        settings.enemyHealthMultiplier,
        settings.enemySpeedMultiplier,
        settings.enemyRewardMultiplier,
        settings.enemyHealthWaveMultiplier,
        settings.enemyRewardWaveMultiplier,
      ]
    );
    return this.mapToGameSettings(result.rows[0]!);
  }

  // Update existing settings
  async updateSettings(id: number, updates: Partial<GameSettings>): Promise<boolean> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.mode !== undefined) {
      fields.push(`mode = $${paramIndex++}`);
      values.push(updates.mode);
    }
    if (updates.initialCoins !== undefined) {
      fields.push(`initial_coins = $${paramIndex++}`);
      values.push(updates.initialCoins);
    }
    if (updates.initialLives !== undefined) {
      fields.push(`initial_lives = $${paramIndex++}`);
      values.push(updates.initialLives);
    }
    if (updates.towerCostMultiplier !== undefined) {
      fields.push(`tower_cost_multiplier = $${paramIndex++}`);
      values.push(updates.towerCostMultiplier);
    }
    if (updates.enemyHealthMultiplier !== undefined) {
      fields.push(`enemy_health_multiplier = $${paramIndex++}`);
      values.push(updates.enemyHealthMultiplier);
    }
    if (updates.enemySpeedMultiplier !== undefined) {
      fields.push(`enemy_speed_multiplier = $${paramIndex++}`);
      values.push(updates.enemySpeedMultiplier);
    }
    if (updates.enemyRewardMultiplier !== undefined) {
      fields.push(`enemy_reward_multiplier = $${paramIndex++}`);
      values.push(updates.enemyRewardMultiplier);
    }
    if (updates.enemyHealthWaveMultiplier !== undefined) {
      fields.push(`enemy_health_wave_multiplier = $${paramIndex++}`);
      values.push(updates.enemyHealthWaveMultiplier);
    }
    if (updates.enemyRewardWaveMultiplier !== undefined) {
      fields.push(`enemy_reward_wave_multiplier = $${paramIndex++}`);
      values.push(updates.enemyRewardWaveMultiplier);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const sql = `UPDATE game_settings SET ${fields.join(', ')} WHERE id = $${paramIndex}`;

    const result = await query(sql, values);
    return (result.rowCount ?? 0) > 0;
  }

  // Helper: Map database row to GameSettings
  private mapToGameSettings(row: SettingsRow): GameSettings {
    return {
      id: row.id,
      mode: row.mode as SettingsMode,
      initialCoins: row.initial_coins,
      initialLives: row.initial_lives,
      towerCostMultiplier: parseFloat(row.tower_cost_multiplier),
      enemyHealthMultiplier: parseFloat(row.enemy_health_multiplier),
      enemySpeedMultiplier: parseFloat(row.enemy_speed_multiplier),
      enemyRewardMultiplier: parseFloat(row.enemy_reward_multiplier),
      enemyHealthWaveMultiplier: parseFloat(row.enemy_health_wave_multiplier),
      enemyRewardWaveMultiplier: parseFloat(row.enemy_reward_wave_multiplier),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
