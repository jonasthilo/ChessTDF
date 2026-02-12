import type { Tower } from '../types';
import { distance } from './math';

/**
 * Calculate total damage buff percentage from nearby aura towers (King)
 * Returns percentage value (e.g., 15 means +15% damage)
 */
export function getAuraDamageBuff(tower: Tower, allTowers: Tower[]): number {
  const auraTowers = allTowers.filter(
    (t) => t.attackType === 'aura' && t.stats.auraEffect === 'damage_buff' && t.id !== tower.id
  );

  if (auraTowers.length === 0) return 0;

  let totalBuff = 0;
  for (const auraTower of auraTowers) {
    const dist = distance(tower.x, tower.y, auraTower.x, auraTower.y);
    if (dist <= auraTower.stats.auraRadius) {
      totalBuff += auraTower.stats.auraStrength;
    }
  }
  return totalBuff;
}

/**
 * Calculate damage multiplier from aura buffs
 * Returns multiplier (e.g., 1.15 for 15% buff)
 */
export function getAuraDamageMultiplier(tower: Tower, allTowers: Tower[]): number {
  const buff = getAuraDamageBuff(tower, allTowers);
  return 1 + buff / 100;
}
