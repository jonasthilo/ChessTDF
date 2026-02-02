import { EnemySpawnData } from '../types';
import { waveRepository } from '../database/repositories/WaveRepository';

// Wave generation service (database-driven)

interface WaveEnemyEntry {
  enemyId: number;
  count: number;
  spawnDelayMs: number;
}

interface WaveComposition {
  waveNumber: number;
  enemies: WaveEnemyEntry[];
}

export class WaveService {
  // Get all wave definitions grouped by wave number
  async getAllWaves(): Promise<WaveComposition[]> {
    const rows = await waveRepository.getAll();
    const waveMap = new Map<number, WaveEnemyEntry[]>();

    for (const row of rows) {
      let enemies = waveMap.get(row.waveNumber);
      if (!enemies) {
        enemies = [];
        waveMap.set(row.waveNumber, enemies);
      }
      enemies.push({
        enemyId: row.enemyId,
        count: row.count,
        spawnDelayMs: row.spawnDelayMs,
      });
    }

    const waves: WaveComposition[] = [];
    for (const [waveNumber, enemies] of waveMap) {
      waves.push({ waveNumber, enemies });
    }

    return waves;
  }

  // Generate enemies for a specific wave
  async getWaveEnemies(waveNumber: number): Promise<EnemySpawnData[]> {
    const definitions = await waveRepository.getWave(waveNumber);
    const enemies: EnemySpawnData[] = [];
    let currentDelay = 0;

    for (const def of definitions) {
      for (let i = 0; i < def.count; i++) {
        enemies.push({
          enemyId: def.enemyId,
          spawnDelay: currentDelay,
        });
        currentDelay += def.spawnDelayMs;
      }
    }

    return enemies;
  }

  // Get a single wave composition by wave number (exact match, no fallback)
  async getWave(waveNumber: number): Promise<WaveComposition | null> {
    const rows = await waveRepository.getWave(waveNumber);
    if (rows.length === 0 || rows[0]!.waveNumber !== waveNumber) {
      return null;
    }
    return {
      waveNumber,
      enemies: rows.map((r) => ({
        enemyId: r.enemyId,
        count: r.count,
        spawnDelayMs: r.spawnDelayMs,
      })),
    };
  }

  // Create a new wave (fails if wave already exists)
  async createWave(
    waveNumber: number,
    enemies: Array<{
      enemyId: number;
      count: number;
      spawnDelayMs: number;
      difficultyLabel: string;
    }>
  ): Promise<WaveComposition> {
    const existing = await this.getWave(waveNumber);
    if (existing) {
      throw new Error(`Wave ${waveNumber} already exists. Use PUT to replace it.`);
    }
    return this.replaceWave(waveNumber, enemies);
  }

  // Replace entire wave composition (upsert)
  async replaceWave(
    waveNumber: number,
    enemies: Array<{
      enemyId: number;
      count: number;
      spawnDelayMs: number;
      difficultyLabel: string;
    }>
  ): Promise<WaveComposition> {
    const rows = await waveRepository.replaceWave(waveNumber, enemies);
    return {
      waveNumber,
      enemies: rows.map((r) => ({
        enemyId: r.enemyId,
        count: r.count,
        spawnDelayMs: r.spawnDelayMs,
      })),
    };
  }

  // Delete entire wave
  async deleteWave(waveNumber: number): Promise<boolean> {
    return waveRepository.deleteWave(waveNumber);
  }
}

// Export singleton instance
export const waveService = new WaveService();
