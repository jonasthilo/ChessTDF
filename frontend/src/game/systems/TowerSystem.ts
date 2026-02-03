import type { Tower, Enemy, Projectile, TargetingMode } from '../../types';
import { useGameStore } from '../../state/gameStore';
import { distance } from '../../utils/math';

export class TowerSystem {
  private nextProjectileId = 0;

  update(_deltaTime: number): void {
    const state = useGameStore.getState();
    const towers = state.towers;
    const enemies = state.enemies;
    const currentTime = state.gameTime;

    for (const tower of towers) {
      // Aura towers don't fire projectiles (handled in Phase 6)
      if (tower.attackType === 'aura') {
        continue;
      }

      // Check cooldown
      const cooldown = 1000 / tower.stats.fireRate; // ms between shots
      if (currentTime - tower.lastFireTime < cooldown) {
        continue;
      }

      // Get enemies in range
      const inRange = this.getEnemiesInRange(tower, enemies);
      if (inRange.length === 0) continue;

      // Handle multi-target towers differently
      if (tower.attackType === 'multi') {
        const targets = this.findMultipleTargets(tower, inRange);
        for (const target of targets) {
          this.fireProjectile(tower, target, state);
        }
      } else {
        // Single target for all other attack types
        const target = this.findTarget(tower, inRange);
        if (!target) continue;
        this.fireProjectile(tower, target, state);
      }

      // Update last fire time
      state.updateTower(tower.id, { lastFireTime: currentTime });
    }
  }

  private getEnemiesInRange(tower: Tower, enemies: Enemy[]): Enemy[] {
    return enemies.filter(
      (e) => !e.isDead && distance(tower.x, tower.y, e.x, e.y) <= tower.stats.range
    );
  }

  private findTarget(tower: Tower, inRange: Enemy[]): Enemy | null {
    if (inRange.length === 0) return null;
    return this.selectByTargetingMode(tower.targetingMode, tower, inRange);
  }

  private findMultipleTargets(tower: Tower, inRange: Enemy[]): Enemy[] {
    const count = Math.min(tower.stats.targetCount, inRange.length);
    if (count <= 0) return [];

    // Sort by targeting mode priority, then take top N
    const sorted = this.sortByTargetingMode(tower.targetingMode, tower, inRange);
    return sorted.slice(0, count);
  }

  private selectByTargetingMode(
    mode: TargetingMode,
    tower: Tower,
    enemies: Enemy[]
  ): Enemy | null {
    if (enemies.length === 0) return null;

    switch (mode) {
      case 'first':
        // Furthest along path (highest x = closest to exit)
        return enemies.reduce((best, e) => (e.x > best.x ? e : best));

      case 'last':
        // Most recent to enter (lowest x = closest to spawn)
        return enemies.reduce((best, e) => (e.x < best.x ? e : best));

      case 'nearest':
        return enemies.reduce((best, e) =>
          distance(tower.x, tower.y, e.x, e.y) < distance(tower.x, tower.y, best.x, best.y)
            ? e
            : best
        );

      case 'strongest':
        // Highest current health
        return enemies.reduce((best, e) => (e.health > best.health ? e : best));

      case 'weakest':
        // Lowest current health
        return enemies.reduce((best, e) => (e.health < best.health ? e : best));

      default:
        return enemies[0] ?? null;
    }
  }

  private sortByTargetingMode(mode: TargetingMode, tower: Tower, enemies: Enemy[]): Enemy[] {
    const sorted = [...enemies];

    switch (mode) {
      case 'first':
        // Highest x first
        sorted.sort((a, b) => b.x - a.x);
        break;

      case 'last':
        // Lowest x first
        sorted.sort((a, b) => a.x - b.x);
        break;

      case 'nearest':
        sorted.sort(
          (a, b) =>
            distance(tower.x, tower.y, a.x, a.y) - distance(tower.x, tower.y, b.x, b.y)
        );
        break;

      case 'strongest':
        // Highest health first
        sorted.sort((a, b) => b.health - a.health);
        break;

      case 'weakest':
        // Lowest health first
        sorted.sort((a, b) => a.health - b.health);
        break;
    }

    return sorted;
  }

  private fireProjectile(
    tower: Tower,
    target: Enemy,
    state: ReturnType<typeof useGameStore.getState>
  ): void {
    const { stats, attackType } = tower;

    const projectile: Projectile = {
      id: `proj-${this.nextProjectileId++}`,
      x: tower.x,
      y: tower.y,
      targetId: target.id,
      damage: stats.damage,
      speed: stats.projectileSpeed,
      // Attack behavior metadata
      attackType,
      sourceTowerId: tower.id,
      // Pierce/chain tracking (initialized for use in collision system)
      hitEnemyIds: [],
      pierceRemaining: stats.pierceCount,
      chainRemaining: stats.chainCount,
      // Splash properties
      splashRadius: stats.splashRadius,
      splashChance: stats.splashChance,
      // Status effect to apply on hit
      statusEffect: stats.statusEffect,
      effectDuration: stats.effectDuration,
      effectStrength: stats.effectStrength,
    };

    state.addProjectile(projectile);
  }
}
