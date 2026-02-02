import { query } from '../db';
import { GameSettings, SettingsMode } from '../../types';
import { buildUpdateFields } from '../helpers';

interface SettingsRow {
  id: number;
  mode: string;
  initial_coins: number;
  initial_lives: number;
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
        mode, initial_coins, initial_lives,
        enemy_health_wave_multiplier, enemy_reward_wave_multiplier
      ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        settings.mode,
        settings.initialCoins,
        settings.initialLives,
        settings.enemyHealthWaveMultiplier,
        settings.enemyRewardWaveMultiplier,
      ]
    );
    return this.mapToGameSettings(result.rows[0]!);
  }

  // Update existing settings
  async updateSettings(id: number, updates: Partial<GameSettings>): Promise<boolean> {
    const built = buildUpdateFields(updates, {
      mode: 'mode',
      initialCoins: 'initial_coins',
      initialLives: 'initial_lives',
      enemyHealthWaveMultiplier: 'enemy_health_wave_multiplier',
      enemyRewardWaveMultiplier: 'enemy_reward_wave_multiplier',
    });
    if (!built) return false;

    built.values.push(id);
    const sql = `UPDATE game_settings SET ${built.fields.join(', ')} WHERE id = $${built.nextParam}`;
    const result = await query(sql, built.values);
    return (result.rowCount ?? 0) > 0;
  }

  // Helper: Map database row to GameSettings
  private mapToGameSettings(row: SettingsRow): GameSettings {
    return {
      id: row.id,
      mode: row.mode as SettingsMode,
      initialCoins: row.initial_coins,
      initialLives: row.initial_lives,
      enemyHealthWaveMultiplier: parseFloat(row.enemy_health_wave_multiplier),
      enemyRewardWaveMultiplier: parseFloat(row.enemy_reward_wave_multiplier),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
