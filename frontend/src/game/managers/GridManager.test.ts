import { describe, test, expect, beforeEach } from 'vitest';
import { GridManager } from './GridManager';
import { CanvasState } from '../../config/gameConfig';

describe('GridManager Coordinate Transformations', () => {
  let gridManager: GridManager;

  beforeEach(() => {
    gridManager = new GridManager();
    // Set up standard canvas dimensions
    CanvasState.updateCanvas(800, 400);
  });

  describe('gridToPixel', () => {
    test('converts top-left grid cell (0,0) to game space center', () => {
      const result = gridManager.gridToPixel(0, 0);
      const expectedX = CanvasState.gridSize / 2;
      const expectedY = CanvasState.gridSize / 2;

      expect(result.x).toBe(expectedX);
      expect(result.y).toBe(expectedY);
    });

    test('converts bottom-right grid cell (19,9) to game space center', () => {
      const result = gridManager.gridToPixel(19, 9);
      const expectedX = 19 * CanvasState.gridSize + CanvasState.gridSize / 2;
      const expectedY = 9 * CanvasState.gridSize + CanvasState.gridSize / 2;

      expect(result.x).toBe(expectedX);
      expect(result.y).toBe(expectedY);
    });

    test('converts middle grid cell to game space center', () => {
      const result = gridManager.gridToPixel(10, 5);
      const expectedX = 10 * CanvasState.gridSize + CanvasState.gridSize / 2;
      const expectedY = 5 * CanvasState.gridSize + CanvasState.gridSize / 2;

      expect(result.x).toBe(expectedX);
      expect(result.y).toBe(expectedY);
    });

    test('returns game space coordinates (no canvas offset)', () => {
      // gridToPixel should return game space coords (relative to gameContainer)
      // NOT canvas space coords
      const result = gridManager.gridToPixel(0, 0);

      // Should NOT include canvas offset
      expect(result.x).not.toBe(CanvasState.offsetX + CanvasState.gridSize / 2);
      expect(result.y).not.toBe(CanvasState.offsetY + CanvasState.gridSize / 2);

      // Should be pure game space
      expect(result.x).toBe(CanvasState.gridSize / 2);
      expect(result.y).toBe(CanvasState.gridSize / 2);
    });
  });

  describe('pixelToGrid', () => {
    test('converts game space center of cell (0,0) to grid (0,0)', () => {
      const centerX = CanvasState.gridSize / 2;
      const centerY = CanvasState.gridSize / 2;

      const result = gridManager.pixelToGrid(centerX, centerY);

      expect(result.gridX).toBe(0);
      expect(result.gridY).toBe(0);
    });

    test('converts game space coordinates near top-left of cell to correct grid', () => {
      const nearTopLeftX = CanvasState.gridSize * 5 + 1;
      const nearTopLeftY = CanvasState.gridSize * 3 + 1;

      const result = gridManager.pixelToGrid(nearTopLeftX, nearTopLeftY);

      expect(result.gridX).toBe(5);
      expect(result.gridY).toBe(3);
    });

    test('converts game space coordinates near bottom-right of cell to correct grid', () => {
      const nearBottomRightX = CanvasState.gridSize * 8 + CanvasState.gridSize - 1;
      const nearBottomRightY = CanvasState.gridSize * 4 + CanvasState.gridSize - 1;

      const result = gridManager.pixelToGrid(nearBottomRightX, nearBottomRightY);

      expect(result.gridX).toBe(8);
      expect(result.gridY).toBe(4);
    });

    test('handles exact grid boundaries correctly', () => {
      // Exactly on the boundary should belong to the cell on the left/top
      const onBoundaryX = CanvasState.gridSize * 5;
      const onBoundaryY = CanvasState.gridSize * 3;

      const result = gridManager.pixelToGrid(onBoundaryX, onBoundaryY);

      expect(result.gridX).toBe(5);
      expect(result.gridY).toBe(3);
    });
  });

  describe('round-trip conversions', () => {
    test('grid -> pixel -> grid returns original for all cells', () => {
      for (let gridX = 0; gridX < 20; gridX++) {
        for (let gridY = 0; gridY < 10; gridY++) {
          const pixel = gridManager.gridToPixel(gridX, gridY);
          const grid = gridManager.pixelToGrid(pixel.x, pixel.y);

          expect(grid.gridX).toBe(gridX);
          expect(grid.gridY).toBe(gridY);
        }
      }
    });

    test('round-trip conversion maintains accuracy for corner cells', () => {
      const corners = [
        { gridX: 0, gridY: 0 },
        { gridX: 0, gridY: 9 },
        { gridX: 19, gridY: 0 },
        { gridX: 19, gridY: 9 },
      ];

      corners.forEach((corner) => {
        const pixel = gridManager.gridToPixel(corner.gridX, corner.gridY);
        const grid = gridManager.pixelToGrid(pixel.x, pixel.y);

        expect(grid.gridX).toBe(corner.gridX);
        expect(grid.gridY).toBe(corner.gridY);
      });
    });
  });

  describe('canvas resize handling', () => {
    test('coordinate transformations update after canvas resize', () => {
      // Initial state
      const initialPixel = gridManager.gridToPixel(5, 5);

      // Resize canvas
      CanvasState.updateCanvas(1024, 512);

      // New transformation should reflect new grid size
      const newPixel = gridManager.gridToPixel(5, 5);

      // Grid size changed, so pixel positions should change
      expect(newPixel.x).not.toBe(initialPixel.x);
      expect(newPixel.y).not.toBe(initialPixel.y);

      // But round-trip should still work
      const grid = gridManager.pixelToGrid(newPixel.x, newPixel.y);
      expect(grid.gridX).toBe(5);
      expect(grid.gridY).toBe(5);
    });
  });

  describe('isValidPlacement', () => {
    test('rejects placement outside grid bounds', () => {
      expect(gridManager.isValidPlacement(-1, 0, [])).toBe(false);
      expect(gridManager.isValidPlacement(0, -1, [])).toBe(false);
      expect(gridManager.isValidPlacement(20, 0, [])).toBe(false);
      expect(gridManager.isValidPlacement(0, 10, [])).toBe(false);
    });

    test('rejects placement on restricted rows (4-5)', () => {
      expect(gridManager.isValidPlacement(10, 4, [])).toBe(false);
      expect(gridManager.isValidPlacement(10, 5, [])).toBe(false);
    });

    test('accepts placement on valid cells', () => {
      expect(gridManager.isValidPlacement(0, 0, [])).toBe(true);
      expect(gridManager.isValidPlacement(19, 9, [])).toBe(true);
      expect(gridManager.isValidPlacement(10, 3, [])).toBe(true);
      expect(gridManager.isValidPlacement(10, 6, [])).toBe(true);
    });

    test('rejects placement on occupied cells', () => {
      const towers = [
        {
          id: 'tower1',
          towerId: 1,
          level: 1,
          gridX: 5,
          gridY: 3,
          x: 100,
          y: 100,
          stats: { cost: 0, damage: 0, range: 0, fireRate: 0 },
          lastFireTime: 0,
        },
      ];

      expect(gridManager.isValidPlacement(5, 3, towers)).toBe(false);
      expect(gridManager.isValidPlacement(5, 2, towers)).toBe(true);
    });
  });
});
