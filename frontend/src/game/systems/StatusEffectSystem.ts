import type { StatusEffect } from '../../types';
import { useGameStore } from '../../state/gameStore';

export class StatusEffectSystem {
  update(deltaTime: number): void {
    const state = useGameStore.getState();
    const enemies = state.enemies;

    for (const enemy of enemies) {
      if (enemy.isDead || enemy.statusEffects.length === 0) continue;

      let totalPoisonDamage = 0;
      const updatedEffects: StatusEffect[] = [];

      for (const effect of enemy.statusEffects) {
        // Calculate remaining duration
        const newDuration = effect.duration - deltaTime;

        // Apply poison damage (effectStrength is DPS)
        if (effect.type === 'poison') {
          // Convert DPS to damage for this frame
          totalPoisonDamage += (effect.strength * deltaTime) / 1000;
        }

        // Keep effect if it hasn't expired
        if (newDuration > 0) {
          updatedEffects.push({
            ...effect,
            duration: newDuration,
          });
        }
      }

      // Apply poison damage
      if (totalPoisonDamage > 0) {
        const newHealth = enemy.health - totalPoisonDamage;

        if (newHealth <= 0) {
          // Enemy died from poison
          if (state.selectedEnemy?.id === enemy.id) {
            state.selectEnemy(null);
          }
          state.removeEnemy(enemy.id);
          state.addCoinsFromBackend(enemy.scaledReward ?? enemy.definition.reward);
          state.incrementEnemiesKilled();
          state.incrementWaveEnemiesDealt();
          continue;
        }

        // Update health and effects
        state.updateEnemy(enemy.id, {
          health: newHealth,
          statusEffects: updatedEffects,
        });
      } else if (updatedEffects.length !== enemy.statusEffects.length) {
        // Only update effects if some expired
        state.updateEnemy(enemy.id, { statusEffects: updatedEffects });
      }
    }
  }
}
