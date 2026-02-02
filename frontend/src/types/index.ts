// Shared TypeScript Type Definitions for Chess Tower Defense

// Tower Definition (Static configuration - metadata only)
export interface TowerDefinition {
  id: number;
  name: string;
  color: string;
  description: string;
  maxLevel: number;
}

// Tower Level (Per-level stats for a tower type)
export interface TowerLevel {
  id?: number;
  towerId: number;
  level: number;
  cost: number;
  damage: number;
  range: number;
  fireRate: number; // shots per second
}

// Tower definition with all its levels included
export interface TowerDefinitionWithLevels extends TowerDefinition {
  levels: TowerLevel[];
}

// Tower runtime stats (derived from TowerLevel at current level)
export type TowerStats = Pick<TowerLevel, 'cost' | 'damage' | 'range' | 'fireRate'>;

// Enemy Definition (Static configuration)
export interface EnemyDefinition {
  id: number;
  name: string;
  description: string;
  health: number;
  speed: number; // pixels per second
  reward: number; // coins awarded on kill
  color: string;
  size: number;
}

// Tower Instance (Runtime game object)
export interface Tower {
  id: string;
  towerId: number; // references tower_definitions.id
  gridX: number;
  gridY: number;
  x: number; // pixel position
  y: number;
  level: number; // NOW REQUIRED
  stats: TowerStats; // Replaces definition field
  lastFireTime: number;
}

// Enemy Instance (Runtime game object)
export interface Enemy {
  id: string;
  enemyId: number; // references enemy_definitions.id
  definition: EnemyDefinition;
  health: number;
  maxHealth: number;
  scaledReward?: number; // wave-scaled reward (if different from definition.reward)
  x: number;
  y: number;
  isDead: boolean;
}

// Projectile (Runtime game object)
export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number;
}

// Enemy Spawn Data
export interface EnemySpawnData {
  enemyId: number;
  spawnDelay: number; // ms delay before spawning this enemy
}

// API Request/Response Types

export interface StartGameResponse {
  gameId: string;
  initialCoins: number;
  lives: number;
}

export interface GameConfigResponse {
  towers: TowerDefinitionWithLevels[];
  enemies: EnemyDefinition[];
}

export interface BuildTowerRequest {
  towerId: number;
  gridX: number;
  gridY: number;
}

export interface BuildTowerResponse {
  success: boolean;
  tower?: Tower;
  remainingCoins: number;
  message?: string;
}

export interface StartWaveResponse {
  waveNumber: number;
  enemies: EnemySpawnData[];
  enemyHealthWaveMultiplier: number;
  enemyRewardWaveMultiplier: number;
}

export interface EndGameRequest {
  finalWave: number;
  enemiesKilled: number;
}

export interface EndGameResponse {
  success: boolean;
}

export interface GameStateResponse {
  coins: number;
  lives: number;
  wave: number;
  towers: Tower[];
}

// Tower Upgrade/Sell API Types
export interface UpgradeTowerResponse {
  success: boolean;
  tower?: Tower;
  remainingCoins: number;
  message?: string;
}

export interface SellTowerResponse {
  success: boolean;
  refundAmount?: number;
  remainingCoins: number;
  message?: string;
}

// Statistics Types
export interface StatisticsSummary {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWaveReached: number;
  avgDuration: number;
  totalEnemiesKilled: number;
  totalTowersBuilt: number;
}

export interface GameStatistics {
  id?: number;
  gameId: string;
  timestamp: string;
  duration: number;
  outcome: 'win' | 'loss';
  gameMode: '10waves' | '20waves' | 'endless';
  finalWave: number;
  wavesCompleted: number;
  enemiesKilledTotal: number;
  towersBuiltTotal: number;
  coinsEarned: number;
  coinsSpent: number;
}

// Settings Types
export interface GameSettings {
  id?: number;
  mode: 'easy' | 'normal' | 'hard' | 'custom';
  initialCoins: number;
  initialLives: number;
  enemyHealthWaveMultiplier: number;
  enemyRewardWaveMultiplier: number;
}
