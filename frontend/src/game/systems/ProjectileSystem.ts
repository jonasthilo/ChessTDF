import { useGameStore } from '../../state/gameStore';

export class ProjectileSystem {
  update(deltaTime: number): void {
    const state = useGameStore.getState();
    const projectiles = state.projectiles;
    const enemies = state.enemies;

    for (const projectile of projectiles) {
      // Check if target still exists
      const target = enemies.find((e) => e.id === projectile.targetId);
      if (!target) {
        state.removeProjectile(projectile.id);
        continue;
      }

      // Calculate direction to target
      const dx = target.x - projectile.x;
      const dy = target.y - projectile.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Move toward target
      if (distance > 0) {
        const dirX = dx / distance;
        const dirY = dy / distance;
        const moveDistance = (projectile.speed * deltaTime) / 1000;

        const newX = projectile.x + dirX * moveDistance;
        const newY = projectile.y + dirY * moveDistance;

        state.updateProjectile(projectile.id, { x: newX, y: newY });
      }
    }
  }
}
