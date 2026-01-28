import { test, expect } from '@playwright/test';

/**
 * Integration tests for coordinate system alignment
 * Verifies that canvas, grid, towers, and enemies stay aligned
 */

test.describe('Coordinate System Alignment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002');
    // Wait for game to load
    await page.waitForSelector('canvas');
    // Start game
    await page.click('button:has-text("Play")');
    // Wait for game to initialize
    await page.waitForTimeout(1000);
  });

  test('tower placement aligns with grid cells', async ({ page }) => {
    // Get canvas element
    const canvas = await page.locator('canvas');
    const canvasBoundingBox = await canvas.boundingBox();

    if (!canvasBoundingBox) {
      throw new Error('Canvas not found');
    }

    // Select Basic Tower
    await page.click('button:has-text("Basic Tower")');

    // Click center of grid cell (5, 2) - should be valid placement
    // Canvas is 800x400 with 5% offset = 40px left, 20px top
    // Grid size = 36px
    // Cell (5,2) center = offset + (col * size + size/2)
    const clickX = canvasBoundingBox.x + 40 + (5 * 36 + 18);
    const clickY = canvasBoundingBox.y + 20 + (2 * 36 + 18);

    await page.mouse.click(clickX, clickY);

    // Take screenshot to verify alignment
    await page.screenshot({
      path: '.playwright-mcp/tower-placement-alignment.png',
      clip: {
        x: canvasBoundingBox.x,
        y: canvasBoundingBox.y,
        width: canvasBoundingBox.width,
        height: canvasBoundingBox.height,
      }
    });

    // Verify tower was placed (gold should decrease)
    const goldText = await page.locator('text=/Gold: \\d+/').textContent();
    expect(goldText).not.toContain('Gold: 500'); // Should have decreased from starting gold
  });

  test('tower placement at grid boundaries', async ({ page }) => {
    const canvas = await page.locator('canvas');
    const canvasBoundingBox = await canvas.boundingBox();

    if (!canvasBoundingBox) {
      throw new Error('Canvas not found');
    }

    // Select Basic Tower
    await page.click('button:has-text("Basic Tower")');

    // Test corner placements
    const corners = [
      { gridX: 0, gridY: 0, name: 'top-left' },
      { gridX: 0, gridY: 9, name: 'bottom-left' },
      { gridX: 19, gridY: 0, name: 'top-right' },
      { gridX: 19, gridY: 9, name: 'bottom-right' },
    ];

    for (const corner of corners) {
      // Calculate click position
      const clickX = canvasBoundingBox.x + 40 + (corner.gridX * 36 + 18);
      const clickY = canvasBoundingBox.y + 20 + (corner.gridY * 36 + 18);

      // Hover over the cell to show preview
      await page.mouse.move(clickX, clickY);
      await page.waitForTimeout(100);

      // Take screenshot of preview
      await page.screenshot({
        path: `.playwright-mcp/tower-preview-${corner.name}.png`,
        clip: {
          x: canvasBoundingBox.x,
          y: canvasBoundingBox.y,
          width: canvasBoundingBox.width,
          height: canvasBoundingBox.height,
        }
      });

      // Click to place
      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(200);

      // Re-select tower for next placement
      await page.click('button:has-text("Basic Tower")');
    }

    // Final screenshot showing all corner towers
    await page.screenshot({
      path: '.playwright-mcp/tower-placement-corners.png',
      clip: {
        x: canvasBoundingBox.x,
        y: canvasBoundingBox.y,
        width: canvasBoundingBox.width,
        height: canvasBoundingBox.height,
      }
    });
  });

  test('restricted zone (enemy path) rejects tower placement', async ({ page }) => {
    const canvas = await page.locator('canvas');
    const canvasBoundingBox = await canvas.boundingBox();

    if (!canvasBoundingBox) {
      throw new Error('Canvas not found');
    }

    // Select Basic Tower
    await page.click('button:has-text("Basic Tower")');

    // Try to place on restricted row 4
    const clickX = canvasBoundingBox.x + 40 + (10 * 36 + 18);
    const clickY = canvasBoundingBox.y + 20 + (4 * 36 + 18);

    // Hover to show preview (should be red/invalid)
    await page.mouse.move(clickX, clickY);
    await page.waitForTimeout(200);

    // Take screenshot showing red preview
    await page.screenshot({
      path: '.playwright-mcp/tower-placement-invalid.png',
      clip: {
        x: canvasBoundingBox.x,
        y: canvasBoundingBox.y,
        width: canvasBoundingBox.width,
        height: canvasBoundingBox.height,
      }
    });

    // Get gold before click
    const goldBefore = await page.locator('text=/Gold: \\d+/').textContent();

    // Click (should be rejected)
    await page.mouse.click(clickX, clickY);
    await page.waitForTimeout(200);

    // Gold should not change
    const goldAfter = await page.locator('text=/Gold: \\d+/').textContent();
    expect(goldAfter).toBe(goldBefore);
  });

  test('enemy path alignment with grid', async ({ page }) => {
    const canvas = await page.locator('canvas');
    const canvasBoundingBox = await canvas.boundingBox();

    if (!canvasBoundingBox) {
      throw new Error('Canvas not found');
    }

    // Start a wave
    await page.click('button:has-text("Start Wave")');

    // Wait for enemies to spawn
    await page.waitForTimeout(1000);

    // Take screenshot showing enemies on the path
    await page.screenshot({
      path: '.playwright-mcp/enemy-path-alignment.png',
      clip: {
        x: canvasBoundingBox.x,
        y: canvasBoundingBox.y,
        width: canvasBoundingBox.width,
        height: canvasBoundingBox.height,
      }
    });

    // Enemies should be moving horizontally through rows 4-5
    // Visual verification through screenshot
  });

  test('tower range circle centers on tower sprite', async ({ page }) => {
    const canvas = await page.locator('canvas');
    const canvasBoundingBox = await canvas.boundingBox();

    if (!canvasBoundingBox) {
      throw new Error('Canvas not found');
    }

    // Select and place a tower
    await page.click('button:has-text("Basic Tower")');

    const clickX = canvasBoundingBox.x + 40 + (10 * 36 + 18);
    const clickY = canvasBoundingBox.y + 20 + (2 * 36 + 18);

    await page.mouse.click(clickX, clickY);
    await page.waitForTimeout(200);

    // Click on the tower to select it (should show range circle)
    await page.mouse.click(clickX, clickY);
    await page.waitForTimeout(200);

    // Take screenshot showing range circle
    await page.screenshot({
      path: '.playwright-mcp/tower-range-circle.png',
      clip: {
        x: canvasBoundingBox.x,
        y: canvasBoundingBox.y,
        width: canvasBoundingBox.width,
        height: canvasBoundingBox.height,
      }
    });

    // Range circle should be centered on tower sprite (visual verification)
  });

  test('grid alignment after window resize', async ({ page }) => {
    const canvas = await page.locator('canvas');
    let canvasBoundingBox = await canvas.boundingBox();

    if (!canvasBoundingBox) {
      throw new Error('Canvas not found');
    }

    // Place towers at various positions
    await page.click('button:has-text("Basic Tower")');

    const placements = [
      { gridX: 5, gridY: 2 },
      { gridX: 15, gridY: 7 },
      { gridX: 2, gridY: 8 },
    ];

    for (const pos of placements) {
      const clickX = canvasBoundingBox.x + 40 + (pos.gridX * 36 + 18);
      const clickY = canvasBoundingBox.y + 20 + (pos.gridY * 36 + 18);
      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(200);
      await page.click('button:has-text("Basic Tower")');
    }

    // Take screenshot before resize
    await page.screenshot({
      path: '.playwright-mcp/towers-before-resize.png',
      clip: {
        x: canvasBoundingBox.x,
        y: canvasBoundingBox.y,
        width: canvasBoundingBox.width,
        height: canvasBoundingBox.height,
      }
    });

    // Resize window
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(500);

    // Get new canvas position
    canvasBoundingBox = await canvas.boundingBox();
    if (!canvasBoundingBox) {
      throw new Error('Canvas not found after resize');
    }

    // Take screenshot after resize
    await page.screenshot({
      path: '.playwright-mcp/towers-after-resize.png',
      clip: {
        x: canvasBoundingBox.x,
        y: canvasBoundingBox.y,
        width: canvasBoundingBox.width,
        height: canvasBoundingBox.height,
      }
    });

    // Towers should remain centered in their grid cells (visual verification)
  });

  test('placement preview follows mouse accurately', async ({ page }) => {
    const canvas = await page.locator('canvas');
    const canvasBoundingBox = await canvas.boundingBox();

    if (!canvasBoundingBox) {
      throw new Error('Canvas not found');
    }

    // Select tower
    await page.click('button:has-text("Basic Tower")');

    // Move mouse across different grid cells
    const testCells = [
      { gridX: 0, gridY: 0 },
      { gridX: 5, gridY: 3 },
      { gridX: 10, gridY: 6 },
      { gridX: 15, gridY: 8 },
      { gridX: 19, gridY: 9 },
    ];

    for (const cell of testCells) {
      const hoverX = canvasBoundingBox.x + 40 + (cell.gridX * 36 + 18);
      const hoverY = canvasBoundingBox.y + 20 + (cell.gridY * 36 + 18);

      await page.mouse.move(hoverX, hoverY);
      await page.waitForTimeout(100);

      // Take screenshot of preview
      await page.screenshot({
        path: `.playwright-mcp/preview-cell-${cell.gridX}-${cell.gridY}.png`,
        clip: {
          x: canvasBoundingBox.x,
          y: canvasBoundingBox.y,
          width: canvasBoundingBox.width,
          height: canvasBoundingBox.height,
        }
      });
    }

    // Preview should be centered in the correct grid cell for each position
  });
});
