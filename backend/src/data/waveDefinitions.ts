import { EnemySpawnData } from '../types';

// Wave Generation Logic
// Progressively harder waves with increasing enemy variety and density
// Enemy IDs: 1=Pawn, 2=Knight, 3=Bishop, 4=Rook, 5=Queen, 6=King

export function generateWave(waveNumber: number): EnemySpawnData[] {
  const enemies: EnemySpawnData[] = [];

  // Wave 1-3: Mostly pawns (learning phase)
  if (waveNumber <= 3) {
    const count = 5 + waveNumber * 2; // 7, 9, 11 pawns
    for (let i = 0; i < count; i++) {
      enemies.push({
        enemyId: 1, // Pawn
        spawnDelay: i * 800 // Spawn every 0.8 seconds
      });
    }
  }

  // Wave 4-6: Pawns + Knights (introduce speed)
  else if (waveNumber <= 6) {
    // 8 pawns
    for (let i = 0; i < 8; i++) {
      enemies.push({
        enemyId: 1, // Pawn
        spawnDelay: i * 600
      });
    }
    // 3 knights
    for (let i = 0; i < 3; i++) {
      enemies.push({
        enemyId: 2, // Knight
        spawnDelay: 5000 + i * 1000 // After pawns
      });
    }
  }

  // Wave 7-10: Mix with bishops and rooks (introduce tanks)
  else if (waveNumber <= 10) {
    const enemyIds = [1, 2, 3, 4]; // Pawn, Knight, Bishop, Rook
    for (let i = 0; i < 15; i++) {
      const enemyId = enemyIds[Math.floor(Math.random() * enemyIds.length)];
      if (enemyId) {
        enemies.push({
          enemyId,
          spawnDelay: i * 500
        });
      }
    }
  }

  // Wave 11+: Everything including queens/kings (endgame)
  else {
    for (let i = 0; i < 20; i++) {
      const rand = Math.random();
      let enemyId = 1; // Pawn

      // Weighted random selection (harder enemies rarer)
      if (rand > 0.95) enemyId = 6;        // King - 5% chance
      else if (rand > 0.85) enemyId = 5;  // Queen - 10% chance
      else if (rand > 0.65) enemyId = 4;   // Rook - 20% chance
      else if (rand > 0.45) enemyId = 3; // Bishop - 20% chance
      else if (rand > 0.25) enemyId = 2; // Knight - 20% chance
      // else Pawn                            // 25% chance

      enemies.push({
        enemyId,
        spawnDelay: i * 400
      });
    }
  }

  return enemies;
}

// Get wave difficulty estimate (for UI display)
export function getWaveDifficulty(waveNumber: number): string {
  if (waveNumber <= 3) return 'Easy';
  if (waveNumber <= 6) return 'Medium';
  if (waveNumber <= 10) return 'Hard';
  return 'Extreme';
}

// Get total enemy count for a wave
export function getWaveEnemyCount(waveNumber: number): number {
  return generateWave(waveNumber).length;
}
