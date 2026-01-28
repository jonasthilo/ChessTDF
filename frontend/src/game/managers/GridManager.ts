import { GAME_CONFIG, CanvasState } from '../../config/gameConfig';
import type { Tower } from '../../types';

export class GridManager {
  gridToPixel(gridX: number, gridY: number): { x: number; y: number } {
    const gridSize = CanvasState.gridSize;
    return {
      x: gridX * gridSize + gridSize / 2,
      y: gridY * gridSize + gridSize / 2,
    };
  }

  pixelToGrid(x: number, y: number): { gridX: number; gridY: number } {
    const gridSize = CanvasState.gridSize;
    return {
      gridX: Math.floor(x / gridSize),
      gridY: Math.floor(y / gridSize),
    };
  }

  isValidPlacement(gridX: number, gridY: number, towers: Tower[]): boolean {
    // Check bounds
    if (
      gridX < 0 ||
      gridX >= GAME_CONFIG.GRID_COLS ||
      gridY < 0 ||
      gridY >= GAME_CONFIG.GRID_ROWS
    ) {
      return false;
    }

    // Check restricted rows
    if ((GAME_CONFIG.RESTRICTED_ROWS as readonly number[]).includes(gridY)) {
      return false;
    }

    // Check if cell is occupied
    const occupied = towers.some((t) => t.gridX === gridX && t.gridY === gridY);
    return !occupied;
  }
}
