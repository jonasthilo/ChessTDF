import type { Enemy } from '../../types';
import { PathManager } from '../managers/PathManager';
import { useGameStore } from '../../state/gameStore';

export class EnemySystem {
  private pathManager: PathManager;

  constructor() {
    this.pathManager = new PathManager();
  }

  update(deltaTime: number): void {
    const state = useGameStore.getState();
    const enemies = state.enemies;

    for (const enemy of enemies) {
      // Calculate effective speed (base speed reduced by slow effects)
      const effectiveSpeed = this.getEffectiveSpeed(enemy);

      // Update position
      const newX = this.pathManager.updatePosition(enemy.x, effectiveSpeed, deltaTime);

      // Check if reached end
      if (this.pathManager.hasReachedEnd(newX)) {
        // Auto-deselect if this enemy was selected
        if (state.selectedEnemy?.id === enemy.id) {
          state.selectEnemy(null);
        }
        // Remove enemy, lose life, and mark as dealt with
        state.removeEnemy(enemy.id);
        state.loseLifeFromBackend();
        state.incrementWaveEnemiesDealt();
        continue;
      }

      // Update enemy position in store
      state.updateEnemy(enemy.id, { x: newX });
    }
  }

  private getEffectiveSpeed(enemy: Enemy): number {
    const baseSpeed = enemy.definition.speed;

    // Find the strongest slow effect (they don't stack, use maximum)
    const slowEffects = enemy.statusEffects.filter((e) => e.type === 'slow');

    if (slowEffects.length === 0) {
      return baseSpeed;
    }

    // Use the strongest slow (highest strength value)
    const maxSlow = Math.max(...slowEffects.map((e) => e.strength));

    // effectStrength is percentage (e.g., 20 = 20% slow)
    const slowMultiplier = 1 - maxSlow / 100;

    return baseSpeed * Math.max(0.1, slowMultiplier); // Minimum 10% speed
  }
}
