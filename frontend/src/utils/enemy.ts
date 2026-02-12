import type { Enemy } from '../types';
import { useGameStore } from '../state/gameStore';

/**
 * Handle enemy death - deselect if selected, remove from game, award coins, update counters
 * Called from CollisionSystem and StatusEffectSystem when an enemy's health reaches 0
 */
export function handleEnemyDeath(enemy: Enemy): void {
  const state = useGameStore.getState();

  // Auto-deselect if this enemy was selected
  if (state.selectedEnemy?.id === enemy.id) {
    state.selectEnemy(null);
  }

  // Remove enemy from game
  state.removeEnemy(enemy.id);

  // Award coins (use scaled reward if available, otherwise base reward)
  state.addCoinsFromBackend(enemy.scaledReward ?? enemy.definition.reward);

  // Update kill counters
  state.incrementEnemiesKilled();
  state.incrementWaveEnemiesDealt();
}
