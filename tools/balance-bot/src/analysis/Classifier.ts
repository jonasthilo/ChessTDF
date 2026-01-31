import type {
  EnemyDefinition,
  TowerDefinition,
  ClassifiedEnemy,
  ClassifiedTower,
  EnemyArchetype,
  TowerRole,
} from '../types';

export function classifyEnemies(enemies: EnemyDefinition[]): ClassifiedEnemy[] {
  if (enemies.length === 0) return [];

  const meanHealth =
    enemies.reduce((sum, e) => sum + e.health, 0) / enemies.length;
  const meanSpeed =
    enemies.reduce((sum, e) => sum + e.speed, 0) / enemies.length;

  return enemies.map((enemy) => {
    const hpRatio = meanHealth > 0 ? enemy.health / meanHealth : 1;
    const spdRatio = meanSpeed > 0 ? enemy.speed / meanSpeed : 1;

    let archetype: EnemyArchetype;

    if (hpRatio > 1.3 && spdRatio < 0.7) {
      archetype = 'tank';
    } else if (spdRatio > 1.3 && hpRatio < 0.7) {
      archetype = 'rusher';
    } else if (hpRatio < 0.7 && spdRatio < 0.7) {
      archetype = 'fodder';
    } else if (hpRatio > 1.3 && spdRatio > 1.0) {
      archetype = 'elite';
    } else {
      archetype = 'balanced';
    }

    return { ...enemy, archetype };
  });
}

export function classifyTowers(towers: TowerDefinition[]): ClassifiedTower[] {
  if (towers.length === 0) return [];

  const level1Stats = towers
    .map((t) => t.levels.find((l) => l.level === 1))
    .filter((l): l is NonNullable<typeof l> => l != null);

  if (level1Stats.length === 0) {
    return towers.map((t) => ({ ...t, role: 'balanced' as TowerRole }));
  }

  const meanRange =
    level1Stats.reduce((sum, l) => sum + l.range, 0) / level1Stats.length;
  const meanFireRate =
    level1Stats.reduce((sum, l) => sum + l.fireRate, 0) / level1Stats.length;

  return towers.map((tower) => {
    const lvl1 = tower.levels.find((l) => l.level === 1);

    if (!lvl1) {
      return { ...tower, role: 'balanced' as TowerRole };
    }

    const rangeRatio = meanRange > 0 ? lvl1.range / meanRange : 1;
    const fireRateRatio = meanFireRate > 0 ? lvl1.fireRate / meanFireRate : 1;

    let role: TowerRole;

    if (rangeRatio > 1.3) {
      role = 'sniper';
    } else if (fireRateRatio > 1.5) {
      role = 'rapid';
    } else {
      role = 'balanced';
    }

    return { ...tower, role };
  });
}
