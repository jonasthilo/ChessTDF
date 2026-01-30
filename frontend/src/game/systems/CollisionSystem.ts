import { useGameStore } from '../../state/gameStore';
import { distance } from '../../utils/math';

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
      const dist = distance(projectile.x, projectile.y, target.x, target.y);

      if (dist < this.HIT_THRESHOLD) {
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

}
