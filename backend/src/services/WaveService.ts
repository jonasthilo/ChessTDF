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
    const definitions = await waveRepository.getWaveDefinitions(waveNumber);
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

  // Get wave metadata
  async getWaveInfo(waveNumber: number): Promise<{
    difficulty: string;
    enemyCount: number;
  }> {
    const definitions = await waveRepository.getWaveDefinitions(waveNumber);
    const enemyCount = definitions.reduce((sum, d) => sum + d.count, 0);
    const difficulty = definitions[0]?.difficultyLabel || 'normal';
    return { difficulty, enemyCount };
  }
}

// Export singleton instance
export const waveService = new WaveService();
