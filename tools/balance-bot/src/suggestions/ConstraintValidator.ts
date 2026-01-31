interface Constraint {
  min: number;
  max: number;
}

const CONSTRAINTS: Record<string, Constraint> = {
  'tower_levels.cost': { min: 1, max: 999 },
  'tower_levels.damage': { min: 1, max: 999 },
  'tower_levels.range': { min: 50, max: 500 },
  'tower_levels.fireRate': { min: 0.1, max: 10.0 },
  'enemy_definitions.health': { min: 1, max: 9999 },
  'enemy_definitions.speed': { min: 10, max: 500 },
  'enemy_definitions.reward': { min: 1, max: 999 },
  'game_settings.towerCostMultiplier': { min: 0.5, max: 3.0 },
  'game_settings.enemyHealthMultiplier': { min: 0.5, max: 3.0 },
  'game_settings.enemySpeedMultiplier': { min: 0.5, max: 3.0 },
  'game_settings.enemyRewardMultiplier': { min: 0.5, max: 3.0 },
  'game_settings.enemyHealthWaveMultiplier': { min: 0, max: 1.0 },
  'game_settings.enemyRewardWaveMultiplier': { min: 0, max: 1.0 },
  'game_settings.initialCoins': { min: 50, max: 1000 },
  'game_settings.initialLives': { min: 1, max: 50 },
};

function getConstraint(
  table: string,
  field: string,
): Constraint | undefined {
  return CONSTRAINTS[`${table}.${field}`];
}

export function clampToConstraint(
  table: string,
  field: string,
  value: number,
): number {
  const constraint = getConstraint(table, field);
  if (!constraint) return value;
  return Math.max(constraint.min, Math.min(constraint.max, value));
}

export function isWithinConstraint(
  table: string,
  field: string,
  value: number,
): boolean {
  const constraint = getConstraint(table, field);
  if (!constraint) return true;
  return value >= constraint.min && value <= constraint.max;
}
