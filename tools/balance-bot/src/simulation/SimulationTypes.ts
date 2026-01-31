import type { TowerDefinition, GameSettings } from '../types';

export interface SimTower {
  id: number;
  towerId: number;
  gridX: number;
  gridY: number;
  x: number; // pixel position (gridX * gridSize + gridSize/2)
  y: number; // pixel position (gridY * gridSize + gridSize/2)
  level: number;
  damage: number;
  range: number;
  fireRate: number;
  lastFireTime: number;
  totalDamageDealt: number;
  totalInvested: number; // cumulative cost of this tower
}

export interface SimEnemy {
  id: number;
  enemyId: number;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number; // px/s, already scaled by difficulty
  reward: number; // already scaled by wave
  isDead: boolean;
  hasEscaped: boolean;
}

export interface SimProjectile {
  id: number;
  x: number;
  y: number;
  targetId: number;
  damage: number;
  speed: number; // 400 px/s
}

export interface SimState {
  towers: SimTower[];
  enemies: SimEnemy[];
  projectiles: SimProjectile[];
  coins: number;
  lives: number;
  wave: number;
  time: number; // ms elapsed in current wave
  nextTowerId: number;
  nextEnemyId: number;
  nextProjectileId: number;
  towerUsage: Record<number, number>; // towerId -> count of towers placed
  towerDamage: Record<number, number>; // towerId -> total damage dealt
  enemyKills: Record<number, number>; // enemyId -> kills
  enemyEscapes: Record<number, number>; // enemyId -> escapes
}

export interface SpawnEntry {
  enemyId: number;
  spawnTime: number; // ms when this enemy spawns
}

export interface StrategyAction {
  type: 'build' | 'upgrade' | 'sell' | 'none';
  towerId?: number; // tower definition ID (for build)
  gridX?: number;
  gridY?: number;
  targetTowerInstanceId?: number; // for upgrade/sell
}

export interface Strategy {
  name: string;
  decideActions(
    state: SimState,
    towers: TowerDefinition[],
    settings: GameSettings,
  ): StrategyAction[];
}
