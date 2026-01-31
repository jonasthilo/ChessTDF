import { query } from '../db';

export interface WaveDefinitionRow {
  id: number;
  waveNumber: number;
  enemyId: number;
  count: number;
  spawnDelayMs: number;
  difficultyLabel: string;
}

interface WaveDbRow {
  id: number;
  wave_number: number;
  enemy_id: number;
  count: number;
  spawn_delay_ms: number;
  difficulty_label: string;
}

interface MaxWaveRow {
  max_wave: number;
}

export class WaveRepository {
  async getWave(waveNumber: number): Promise<WaveDefinitionRow[]> {
    // For waves beyond the max defined, use the highest defined wave
    const result = await query<WaveDbRow>(
      `SELECT * FROM wave_definitions
       WHERE wave_number = LEAST($1, (SELECT MAX(wave_number) FROM wave_definitions))
       ORDER BY enemy_id`,
      [waveNumber]
    );
    return result.rows.map(this.mapRow);
  }

  async getAll(): Promise<WaveDefinitionRow[]> {
    const result = await query<WaveDbRow>(
      'SELECT * FROM wave_definitions ORDER BY wave_number, enemy_id'
    );
    return result.rows.map(this.mapRow);
  }

  async getMaxDefinedWave(): Promise<number> {
    const result = await query<MaxWaveRow>(
      'SELECT MAX(wave_number) as max_wave FROM wave_definitions'
    );
    return result.rows[0]?.max_wave || 1;
  }

  async replaceWave(
    waveNumber: number,
    enemies: Array<{
      enemyId: number;
      count: number;
      spawnDelayMs: number;
      difficultyLabel: string;
    }>
  ): Promise<WaveDefinitionRow[]> {
    // Delete existing entries for this wave
    await query('DELETE FROM wave_definitions WHERE wave_number = $1', [waveNumber]);

    // Insert new entries
    for (const enemy of enemies) {
      await query(
        `INSERT INTO wave_definitions (wave_number, enemy_id, count, spawn_delay_ms, difficulty_label)
         VALUES ($1, $2, $3, $4, $5)`,
        [waveNumber, enemy.enemyId, enemy.count, enemy.spawnDelayMs, enemy.difficultyLabel]
      );
    }

    return this.getWave(waveNumber);
  }

  async deleteWave(waveNumber: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM wave_definitions WHERE wave_number = $1',
      [waveNumber]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: WaveDbRow): WaveDefinitionRow {
    return {
      id: row.id,
      waveNumber: row.wave_number,
      enemyId: row.enemy_id,
      count: row.count,
      spawnDelayMs: row.spawn_delay_ms,
      difficultyLabel: row.difficulty_label,
    };
  }
}

export const waveRepository = new WaveRepository();
