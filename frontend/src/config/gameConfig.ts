// Game configuration constants

export const GAME_CONFIG = {
  // Logical grid dimensions (fixed, independent of canvas size)
  GRID_COLS: 20,
  GRID_ROWS: 10,

  // Aspect ratio for canvas (maintains consistent game board proportions)
  ASPECT_RATIO: 2.0, // 20:10 = 2:1

  // Default canvas dimensions (can be overridden by responsive sizing)
  DEFAULT_CANVAS_WIDTH: 1200,
  DEFAULT_CANVAS_HEIGHT: 600,

  // Projectile settings
  PROJECTILE_SPEED: 400, // pixels per second
  PROJECTILE_SIZE: 6,

  // Game loop
  FPS: 60,
  DELTA_TIME: 1 / 60, // 16.67ms per frame

  // Initial game state
  INITIAL_COINS: 200,
  INITIAL_LIVES: 10,

  // Tower placement zones (prevent placing in enemy path)
  RESTRICTED_ROWS: [4, 5] as const, // Middle rows reserved for enemy path

  // UI
  HUD_HEIGHT: 80,
  TOWER_PANEL_WIDTH: 250,
} as const;

// Dynamic canvas state (updated when canvas is resized)
export class CanvasState {
  private static _width: number = GAME_CONFIG.DEFAULT_CANVAS_WIDTH;
  private static _height: number = GAME_CONFIG.DEFAULT_CANVAS_HEIGHT;
  private static _gridSize: number =
    (GAME_CONFIG.DEFAULT_CANVAS_WIDTH * 0.9) / GAME_CONFIG.GRID_COLS;
  private static _offsetX: number = GAME_CONFIG.DEFAULT_CANVAS_WIDTH * 0.05;
  private static _offsetY: number = GAME_CONFIG.DEFAULT_CANVAS_HEIGHT * 0.05;

  static get width(): number {
    return this._width;
  }

  static get height(): number {
    return this._height;
  }

  static get gridSize(): number {
    return this._gridSize;
  }

  static get offsetX(): number {
    return this._offsetX;
  }

  static get offsetY(): number {
    return this._offsetY;
  }

  static updateDimensions(width: number, height: number): void {
    this._width = width;
    this._height = height;
    // Use 90% of canvas for grid, leaving 5% margin on each side
    this._gridSize = (width * 0.9) / GAME_CONFIG.GRID_COLS;
    this._offsetX = width * 0.05;
    this._offsetY = height * 0.05;
  }

  static getEnemyPathY(): number {
    return (GAME_CONFIG.RESTRICTED_ROWS[0] ?? 4) * this._gridSize + this._gridSize;
  }

  static getSpawnX(): number {
    return -this._gridSize;
  }

  static getDespawnX(): number {
    return this._width + this._gridSize;
  }
}
