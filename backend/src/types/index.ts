// Shared TypeScript Type Definitions for Chess Tower Defense

// Tower Definition (Static metadata - no stats, those are in TowerLevel)
export interface TowerDefinition {
  id: number;
  name: string;
  color: string;
  description: string;
  maxLevel: number;
}

// Tower Level (Per-level stats for a tower type)
// Level 1 = base tower stats, Level 2+ = upgrade stats
export interface TowerLevel {
  id?: number;
  towerId: number;
  level: number;
  cost: number; // cost to build (level 1) or upgrade to this level (level 2+)
  damage: number;
  range: number;
  fireRate: number; // shots per second
}

// Tower definition with all its levels included
export interface TowerDefinitionWithLevels extends TowerDefinition {
  levels: TowerLevel[];
  maxLevel: number;
}

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

// Tower runtime stats (derived from TowerLevel at current level)
export interface TowerStats {
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
}

// Tower Instance (Runtime game object)
export interface Tower {
  id: string;
  towerId: number; // references tower_definitions.id
  gridX: number;
  gridY: number;
  x: number; // pixel position
  y: number;
  level: number;
  stats: TowerStats; // current stats at this level
  lastFireTime: number;
}

// Enemy Instance (Runtime game object)
export interface Enemy {
  id: string;
  enemyId: number; // references enemy_definitions.id
  definition: EnemyDefinition;
  health: number;
  maxHealth: number;
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

// Game State
export interface GameState {
  gameId: string;
  coins: number;
  lives: number;
  wave: number;
  isPlaying: boolean;
  selectedTowerType: string | null;
}

// Game Session (Server-side)
export interface GameSession {
  id: string;
  coins: number;
  lives: number;
  wave: number;
  towers: Tower[];
  createdAt: Date;
  lastUpdated: Date;
  gameMode?: GameMode | undefined;
  settingsId?: number | undefined;
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

// Game Mode Types
export type GameMode = '10waves' | '20waves' | 'endless';
export type SettingsMode = 'easy' | 'normal' | 'hard' | 'custom';
export type GameOutcome = 'win' | 'loss';
export type SessionStatus = 'active' | 'completed' | 'abandoned';

// Database Models

export interface GameSettings {
  id?: number;
  mode: SettingsMode;
  initialCoins: number;
  initialLives: number;
  towerCostMultiplier: number;
  enemyHealthMultiplier: number;
  enemySpeedMultiplier: number;
  enemyRewardMultiplier: number;
  enemyHealthWaveMultiplier: number;
  enemyRewardWaveMultiplier: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WaveDefinition {
  waveNumber: number;
  enemyId: number;
  count: number;
  spawnDelayMs: number;
  difficultyLabel: string;
}

// Tower data as stored in JSONB (excludes runtime-computed fields)
export type TowerDB = Pick<Tower, 'id' | 'towerId' | 'gridX' | 'gridY' | 'level' | 'stats'>;

export interface GameSessionDB {
  id?: number;
  gameId: string;
  settingsId?: number | null;
  gameMode: GameMode;
  currentWave: number;
  wavesCompleted: number;
  coins: number;
  lives: number;
  towers: TowerDB[]; // JSONB
  enemiesKilled: number;
  coinsEarned: number;
  coinsSpent: number;
  damageDealt: number;
  startedAt: Date;
  lastUpdated: Date;
  status: SessionStatus;
}

export interface GameStatistics {
  id?: number;
  gameId: string;
  timestamp: Date;
  duration: number;
  outcome: GameOutcome;
  gameMode: GameMode;
  finalWave: number;
  wavesCompleted: number;
  enemiesKilledTotal: number;
  enemiesKilledByType: { [key: string]: number };
  towersBuiltTotal: number;
  towersBuiltByType: { [key: string]: number };
  coinsEarned: number;
  coinsSpent: number;
  damageDealt: number;
  settingsId?: number | null;
  createdAt?: Date;
}

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

// Tower info for UI display (includes next level preview)
export interface TowerInfo {
  currentLevel: number;
  maxLevel: number;
  currentStats: TowerStats;
  nextLevelStats: TowerStats | null; // null if at max level
  upgradeCost: number | null; // null if at max level
  totalInvested: number; // total coins spent on this tower
  refundAmount: number; // 70% of total invested
}

// API Request/Response Types for New Features

export interface UpgradeTowerResponse {
  success: boolean;
  tower?: Tower | undefined;
  remainingCoins: number;
  message?: string | undefined;
}

export interface SellTowerResponse {
  success: boolean;
  refundAmount: number;
  remainingCoins: number;
  message?: string | undefined;
}

export interface WaveCompleteRequest {
  wavesCompleted: number;
}

export interface WaveCompleteResponse {
  success: boolean;
  wavesCompleted: number;
}

export type GetSettingsResponse = GameSettings;

export type UpdateSettingsRequest = Partial<GameSettings>;

export interface GetStatisticsResponse {
  statistics: GameStatistics[];
  total: number;
}

export type GetStatisticsSummaryResponse = StatisticsSummary;
