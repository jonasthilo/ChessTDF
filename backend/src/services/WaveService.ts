import { EnemySpawnData } from '../types';
import { generateWave, getWaveDifficulty, getWaveEnemyCount } from '../data/waveDefinitions';

// Wave generation service

export class WaveService {
  // Generate enemies for a specific wave
  getWaveEnemies(waveNumber: number): EnemySpawnData[] {
    return generateWave(waveNumber);
  }

  // Get wave metadata
  getWaveInfo(waveNumber: number): {
    difficulty: string;
    enemyCount: number;
  } {
    return {
      difficulty: getWaveDifficulty(waveNumber),
      enemyCount: getWaveEnemyCount(waveNumber)
    };
  }
}

// Export singleton instance
export const waveService = new WaveService();
