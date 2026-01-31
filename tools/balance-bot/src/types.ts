// --- API Response Types (matching backend) ---

export interface TowerLevel {
  towerId: number;
  level: number;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
}

export interface TowerDefinition {
  id: number;
  name: string;
  description: string;
  baseColor: string;
  maxLevel: number;
  levels: TowerLevel[];
}

export interface EnemyDefinition {
  id: number;
  name: string;
  description: string;
  health: number;
  speed: number;
  reward: number;
  color: string;
  size: number;
}

export interface GameSettings {
  id: number;
  mode: SettingsMode;
  initialCoins: number;
  initialLives: number;
  towerCostMultiplier: number;
  enemyHealthMultiplier: number;
  enemySpeedMultiplier: number;
  enemyRewardMultiplier: number;
  enemyHealthWaveMultiplier: number;
  enemyRewardWaveMultiplier: number;
}

export interface WaveEnemy {
  enemyId: number;
  count: number;
  spawnDelayMs: number;
}

export interface WaveDefinition {
  waveNumber: number;
  enemies: WaveEnemy[];
}

export type SettingsMode = 'easy' | 'normal' | 'hard' | 'custom';
export type GameMode = '10waves' | '20waves' | 'endless';

// --- Classification ---

export type EnemyArchetype = 'fodder' | 'rusher' | 'balanced' | 'tank' | 'elite';
export type TowerRole = 'sniper' | 'rapid' | 'balanced';

export interface ClassifiedEnemy extends EnemyDefinition {
  archetype: EnemyArchetype;
}

export interface ClassifiedTower extends TowerDefinition {
  role: TowerRole;
}

// --- Tier 1 Metrics ---

export interface TowerLevelMetrics {
  towerId: number;
  towerName: string;
  level: number;
  dps: number;
  cumulativeCost: number;
  dpsPerCoin: number;
}

export interface TowerEnemyMatchup {
  towerId: number;
  towerName: string;
  towerLevel: number;
  enemyId: number;
  enemyName: string;
  wave: number;
  scaledHealth: number;
  ttk: number;
  shotsToKill: number;
  overkillRatio: number;
  rangeCoverageTime: number;
  canKillBeforeEscape: boolean;
}

export interface Tier1Results {
  towerMetrics: TowerLevelMetrics[];
  matchups: TowerEnemyMatchup[];
  dpsSpread: number;
  issues: BalanceIssue[];
}

// --- Tier 2 Metrics ---

export interface WaveAnalysis {
  wave: number;
  difficulty: SettingsMode;
  totalScaledHP: number;
  totalReward: number;
  minDPSRequired: number;
  affordableDPS: number;
  surplusRatio: number;
  cumulativeCoins: number;
  netFlow: number;
}

export interface Tier2Results {
  waveAnalyses: WaveAnalysis[];
  impossibleWaves: WaveAnalysis[];
  difficultySpikes: Array<{ from: WaveAnalysis; to: WaveAnalysis; dropPercent: number }>;
  trivialWaves: WaveAnalysis[];
  economyStallWave: number | null;
  issues: BalanceIssue[];
}

// --- Tier 3 Metrics ---

export interface SimulationRunResult {
  strategy: string;
  difficulty: SettingsMode;
  wavesCompleted: number;
  totalWaves: number;
  enemiesKilled: number;
  enemiesEscaped: number;
  livesRemaining: number;
  finalCoins: number;
  towerUsage: Record<number, number>;
  towerDamageShare: Record<number, number>;
  enemyLeakRate: Record<number, number>;
  perWaveMetrics: WaveSimMetrics[];
}

export interface WaveSimMetrics {
  wave: number;
  enemiesSpawned: number;
  enemiesKilled: number;
  enemiesEscaped: number;
  damageDealt: number;
  coinsEarned: number;
  coinsSpent: number;
  towersBuilt: number;
  towersUpgraded: number;
}

export interface SensitivityResult {
  parameter: string;
  target: string;
  baselineValue: number;
  impact: number;
  direction: 'buff' | 'nerf';
}

export interface Tier3Results {
  runs: SimulationRunResult[];
  winRateByStrategy: Record<string, number>;
  towerPickRate: Record<number, number>;
  towerDamageShare: Record<number, number>;
  enemyLeakRate: Record<number, number>;
  sensitivity: SensitivityResult[];
  issues: BalanceIssue[];
}

// --- Balance Issues & Suggestions ---

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface BalanceIssue {
  severity: IssueSeverity;
  category: string;
  description: string;
  details: Record<string, unknown>;
}

export interface BalanceSuggestion {
  priority: IssueSeverity;
  description: string;
  target: {
    table: string;
    id: number;
    field: string;
    level?: number;
  };
  currentValue: number;
  suggestedValue: number;
  changePercent: number;
  reasoning: string;
  apiPatch: {
    method: string;
    url: string;
    body: Record<string, unknown>;
  };
  rollbackSQL: string;
}

// --- Game Constants ---

export const GAME_CONSTANTS = {
  GRID_COLS: 20,
  GRID_ROWS: 10,
  CANVAS_WIDTH: 1200,
  CANVAS_HEIGHT: 600,
  GRID_SCALE: 0.9,
  GRID_OFFSET: 0.05,
  RESTRICTED_ROWS: [4, 5] as readonly number[],
  PROJECTILE_SPEED: 400,
  HIT_THRESHOLD: 10,
  FPS: 60,
  SELL_REFUND_RATE: 0.7,
} as const;

export function getGridSize(): number {
  return (GAME_CONSTANTS.CANVAS_WIDTH * GAME_CONSTANTS.GRID_SCALE) / GAME_CONSTANTS.GRID_COLS;
}

export function getSpawnX(): number {
  return -getGridSize();
}

export function getDespawnX(): number {
  return GAME_CONSTANTS.CANVAS_WIDTH + getGridSize();
}

export function getEnemyPathY(): number {
  const gridSize = getGridSize();
  return GAME_CONSTANTS.RESTRICTED_ROWS[0]! * gridSize + gridSize;
}

// --- Analysis Config ---

export interface AnalysisConfig {
  baseUrl: string;
  tier: 1 | 2 | 3 | null;
  difficulty: SettingsMode;
  waves: number;
  simRuns: number;
  verbose: boolean;
}

// --- API Game-Playing Bot Types ---

export interface StartGameResponse {
  gameId: string;
  coins: number;
  lives: number;
  wave: number;
  gameMode: GameMode;
  difficulty: SettingsMode;
}

export interface GameStateResponse {
  gameId: string;
  coins: number;
  lives: number;
  wave: number;
  gameMode: GameMode;
  difficulty: SettingsMode;
  towers: Array<{
    id: string;
    towerId: number;
    gridX: number;
    gridY: number;
    level: number;
  }>;
  isOver: boolean;
}

export interface BuildTowerRequest {
  towerId: number;
  gridX: number;
  gridY: number;
}

export interface BuildTowerResponse {
  tower: {
    id: string;
    towerId: number;
    gridX: number;
    gridY: number;
    level: number;
    stats: { cost: number; damage: number; range: number; fireRate: number };
  };
  coins: number;
}

export interface UpgradeTowerResponse {
  tower: {
    id: string;
    level: number;
    stats: { cost: number; damage: number; range: number; fireRate: number };
  };
  coins: number;
}

export interface SellTowerResponse {
  refund: number;
  coins: number;
}

export interface StartWaveResponse {
  wave: number;
  enemies: Array<{
    enemyId: number;
    count: number;
    spawnDelayMs: number;
  }>;
  enemyHealthWaveMultiplier: number;
  enemyRewardWaveMultiplier: number;
}

export interface EndGameRequest {
  finalWave: number;
  enemiesKilled: number;
  outcome: 'win' | 'lose' | 'quit';
}

export interface EndGameResponse {
  gameId: string;
  outcome: string;
}
