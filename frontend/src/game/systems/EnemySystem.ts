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
      // Update position
      const newX = this.pathManager.updatePosition(
        enemy.x,
        enemy.definition.speed,
        deltaTime
      );

      // Check if reached end
      if (this.pathManager.hasReachedEnd(newX)) {
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
}
