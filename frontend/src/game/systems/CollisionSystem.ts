import { useGameStore } from '../../state/gameStore';

export class CollisionSystem {
  private readonly HIT_THRESHOLD = 10; // pixels

  update(): void {
    const state = useGameStore.getState();
    const projectiles = state.projectiles;
    const enemies = state.enemies;

    for (const projectile of projectiles) {
      const target = enemies.find((e) => e.id === projectile.targetId);
      if (!target) continue;

      // Check collision
      const distance = this.calculateDistance(
        projectile.x,
        projectile.y,
        target.x,
        target.y
      );

      if (distance < this.HIT_THRESHOLD) {
        // Apply damage
        const newHealth = target.health - projectile.damage;
        state.updateEnemy(target.id, { health: newHealth });

        // Remove projectile
        state.removeProjectile(projectile.id);

        // Check if enemy died
        if (newHealth <= 0) {
          // Auto-deselect if this enemy was selected
          if (state.selectedEnemy?.id === target.id) {
            state.selectEnemy(null);
          }
          state.removeEnemy(target.id);
          state.addCoinsFromBackend(target.scaledReward ?? target.definition.reward);
          state.incrementEnemiesKilled();
          state.incrementWaveEnemiesDealt();
        }
      }
    }
  }

  private calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
}
