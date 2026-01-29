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
  async getWaveDefinitions(waveNumber: number): Promise<WaveDefinitionRow[]> {
    // For waves beyond the max defined, use the highest defined wave
    const result = await query<WaveDbRow>(
      `SELECT * FROM wave_definitions
       WHERE wave_number = LEAST($1, (SELECT MAX(wave_number) FROM wave_definitions))
       ORDER BY enemy_id`,
      [waveNumber]
    );
    return result.rows.map(this.mapRow);
  }

  async getMaxDefinedWave(): Promise<number> {
    const result = await query<MaxWaveRow>(
      'SELECT MAX(wave_number) as max_wave FROM wave_definitions'
    );
    return result.rows[0]?.max_wave || 1;
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
