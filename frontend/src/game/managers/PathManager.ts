import { CanvasState } from '../../config/gameConfig';

export class PathManager {
  getSpawnPosition(): { x: number; y: number } {
    return {
      x: CanvasState.getSpawnX(),
      y: CanvasState.getEnemyPathY(),
    };
  }

  getEndPosition(): { x: number; y: number } {
    return {
      x: CanvasState.getDespawnX(),
      y: CanvasState.getEnemyPathY(),
    };
  }

  hasReachedEnd(x: number): boolean {
    return x >= CanvasState.getDespawnX();
  }

  updatePosition(currentX: number, speed: number, deltaTime: number): number {
    // speed is in pixels/second, deltaTime is in milliseconds
    return currentX + (speed * deltaTime) / 1000;
  }
}
