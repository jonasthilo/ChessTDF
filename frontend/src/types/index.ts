// Shared TypeScript Type Definitions for Chess Tower Defense

// Tower Attack and Targeting Types (mirrored from backend)
export type AttackType = 'single' | 'pierce' | 'splash' | 'chain' | 'multi' | 'aura';
export type ProjectileType = 'homing' | 'ballistic' | 'lob';
export type TargetingMode = 'first' | 'last' | 'nearest' | 'strongest' | 'weakest';
export type StatusEffectType = 'none' | 'slow' | 'poison' | 'armor_shred' | 'mark';
export type AuraEffectType = 'none' | 'damage_buff' | 'speed_buff' | 'range_buff';

// Tower Definition (Static configuration - metadata only)
export interface TowerDefinition {
  id: number;
  name: string;
  color: string;
  description: string;
  maxLevel: number;
  attackType: AttackType;
  projectileType: ProjectileType;
  defaultTargeting: TargetingMode;
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
  // Projectile properties
  projectileSpeed: number;
  // Splash properties
  splashRadius: number;
  splashChance: number; // 0-100%
  // Multi-target properties
  chainCount: number;
  pierceCount: number;
  targetCount: number;
  // Status effect properties
  statusEffect: StatusEffectType;
  effectDuration: number; // milliseconds
  effectStrength: number; // percentage (e.g., 20 = 20% slow, or DPS for poison)
  // Aura properties
  auraRadius: number;
  auraEffect: AuraEffectType;
  auraStrength: number; // percentage (e.g., 15 = 15% buff)
}

// Tower definition with all its levels included
export interface TowerDefinitionWithLevels extends TowerDefinition {
  levels: TowerLevel[];
}

// Tower runtime stats (derived from TowerLevel at current level)
export interface TowerStats {
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  // Projectile properties
  projectileSpeed: number;
  // Splash properties
  splashRadius: number;
  splashChance: number;
  // Multi-target properties
  chainCount: number;
  pierceCount: number;
  targetCount: number;
  // Status effect properties
  statusEffect: StatusEffectType;
  effectDuration: number;
  effectStrength: number;
  // Aura properties
  auraRadius: number;
  auraEffect: AuraEffectType;
  auraStrength: number;
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

// Status Effect Instance (Runtime - active on an enemy)
export interface StatusEffect {
  type: StatusEffectType;
  duration: number; // remaining duration in ms
  strength: number; // effect strength (e.g., 20% slow, or DPS for poison)
  sourceId: string; // tower ID that applied this effect
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
  stats: TowerStats;
  lastFireTime: number;
  // Runtime properties (hydrated from definition)
  attackType: AttackType;
  targetingMode: TargetingMode;
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
  statusEffects: StatusEffect[];
}

// Projectile (Runtime game object)
export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number;
  // Attack behavior metadata (for collision resolution)
  attackType: AttackType;
  sourceTowerId: string; // tower that fired this projectile
  // Pierce/chain tracking
  hitEnemyIds: string[]; // enemies already hit (for pierce/chain)
  pierceRemaining: number;
  chainRemaining: number;
  // Splash properties
  splashRadius: number;
  splashChance: number;
  // Status effect to apply on hit
  statusEffect: StatusEffectType;
  effectDuration: number;
  effectStrength: number;
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
