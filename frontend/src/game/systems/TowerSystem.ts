import type { Tower, Enemy, Projectile } from '../../types';
import { useGameStore } from '../../state/gameStore';

export class TowerSystem {
  private nextProjectileId = 0;

  update(_deltaTime: number): void {
    const state = useGameStore.getState();
    const towers = state.towers;
    const enemies = state.enemies;
    const currentTime = state.gameTime;

    for (const tower of towers) {
      // Check cooldown
      const cooldown = 1000 / tower.stats.fireRate; // ms between shots
      if (currentTime - tower.lastFireTime < cooldown) {
        continue;
      }

      // Find nearest enemy in range
      const target = this.findNearestEnemy(tower, enemies);
      if (!target) continue;

      // Fire projectile
      this.fireProjectile(tower, target, state);

      // Update last fire time
      state.updateTower(tower.id, { lastFireTime: currentTime });
    }
  }

  private findNearestEnemy(tower: Tower, enemies: Enemy[]): Enemy | null {
    let nearest: Enemy | null = null;
    let minDistance = Infinity;

    for (const enemy of enemies) {
      const distance = this.calculateDistance(tower.x, tower.y, enemy.x, enemy.y);
      if (distance <= tower.stats.range && distance < minDistance) {
        nearest = enemy;
        minDistance = distance;
      }
    }

    return nearest;
  }

  private fireProjectile(
    tower: Tower,
    target: Enemy,
    state: ReturnType<typeof useGameStore.getState>
  ): void {
    const projectile: Projectile = {
      id: `proj-${this.nextProjectileId++}`,
      x: tower.x,
      y: tower.y,
      targetId: target.id,
      damage: tower.stats.damage,
      speed: 400, // pixels/second (fast)
    };

    state.addProjectile(projectile);
  }

  private calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
}
