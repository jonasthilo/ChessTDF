# Chess TDF Coordinate System Architecture

## Overview
This document defines the PixiJS Container-based coordinate system architecture that ensures canvas, grid, towers, enemies, and all game entities remain perfectly aligned.

---

## PixiJS Container Hierarchy

### Stage Structure
```
Stage (PixiJS Application Stage)
  └─ gameContainer (positioned at offsetX, offsetY)
      ├─ gridLayer (visual grid lines and cell highlights)
      ├─ towerLayer (all tower sprites)
      ├─ enemyLayer (all enemy sprites)
      ├─ projectileLayer (all projectile sprites)
      └─ uiLayer (range circles, effects)
```

**Key Principle**: All game entities are children of `gameContainer`. Their positions are **relative to gameContainer's origin (0,0)**, not the canvas origin.

---

## Coordinate Spaces

### 1. Canvas Space (Absolute)
**Purpose**: Browser/viewport coordinates
- **Origin**: Canvas top-left (0, 0)
- **Range**: `x: 0-canvasWidth, y: 0-canvasHeight`
- **Used by**: Mouse events, canvas sizing, external UI

### 2. Game Space (Relative)
**Purpose**: Game logic, entity positioning
- **Origin**: gameContainer position (offsetX, offsetY)
- **Range**: `x: 0-gridWidth, y: 0-gridHeight` where gridWidth = GRID_COLS * gridSize
- **Used by**: Entity positions, grid rendering, collision detection
- **Transformation**: Handled automatically by PixiJS Container hierarchy

### 3. Grid Space (Logical)
**Purpose**: Game rules, validation, persistence
- **Type**: `GridCoord { gridX: number, gridY: number }`
- **Range**: `gridX: 0-19, gridY: 0-9` (20×10 grid)
- **Used by**: Tower placement, backend API, grid validation

---

## Why Container Hierarchy?

### Automatic Coordinate Transformation
PixiJS automatically handles coordinate transformations through its Container hierarchy:

```typescript
// gameContainer is positioned at (40, 20) for 5% margin
gameContainer.position.set(offsetX, offsetY);

// Tower sprite added to gameContainer with position (100, 100)
// This is 100px from gameContainer origin, NOT canvas origin
towerSprite.position.set(100, 100);

// Actual canvas position is automatically: (140, 120)
// = (40 + 100, 20 + 100)
```

### Input Event Translation
PixiJS translates pointer events through the hierarchy:

```typescript
gameContainer.on('pointermove', (event) => {
  // event.global = canvas space coordinates
  const gamePos = gameContainer.toLocal(event.global);
  // gamePos = game space coordinates (offset already subtracted)
});
```

### Benefits Over Manual Offsets

| Aspect | Manual Offsets | Container Hierarchy |
|--------|----------------|---------------------|
| Offset application | Every calculation | Once (gameContainer.position) |
| Entity positioning | `x + offsetX` everywhere | Just `x` |
| Input handling | Manual subtraction | `container.toLocal()` |
| Resize handling | Recalculate all positions | Update container position |
| Zoom/pan support | Complex manual math | `container.scale`, `container.position` |
| Code maintainability | Scattered offset logic | Centralized in Container |
| Future-proof | Breaks with camera | Natural with hierarchy |

---

## Transformation Rules

### Grid → Game Space
```typescript
// GridManager converts grid coordinates to game space
gridToPixel(gridX: number, gridY: number): { x: number, y: number } {
  return {
    x: gridX * this.gridSize + this.gridSize / 2,  // NO OFFSET
    y: gridY * this.gridSize + this.gridSize / 2,  // NO OFFSET
  };
}
```

### Game Space → Grid
```typescript
pixelToGrid(x: number, y: number): { gridX: number, gridY: number } {
  // x, y are already in game space (Container handled offset)
  return {
    gridX: Math.floor(x / this.gridSize),  // NO OFFSET
    gridY: Math.floor(y / this.gridSize),  // NO OFFSET
  };
}
```

### Canvas → Game Space
```typescript
// PixiJS handles this automatically
const gamePos = gameContainer.toLocal(canvasPoint);
```

### Game Space → Canvas
```typescript
// PixiJS handles this automatically
const canvasPos = gameContainer.toGlobal(gamePoint);
```

---

## Implementation Details

### Container Initialization
```typescript
export class PixiRenderer {
  private gameContainer: Container;
  private gridLayer: Container;
  private towerLayer: Container;
  private enemyLayer: Container;
  private projectileLayer: Container;
  private uiLayer: Container;

  constructor(app: Application) {
    // Create main game container
    this.gameContainer = new Container();
    this.app.stage.addChild(this.gameContainer);

    // Create layers
    this.gridLayer = new Container();
    this.towerLayer = new Container();
    this.enemyLayer = new Container();
    this.projectileLayer = new Container();
    this.uiLayer = new Container();

    // Add layers in order (bottom to top)
    this.gameContainer.addChild(
      this.gridLayer,
      this.towerLayer,
      this.enemyLayer,
      this.projectileLayer,
      this.uiLayer
    );

    // Position gameContainer at offset
    this.updateCanvasDimensions();
  }

  updateCanvasDimensions(): void {
    // This is the ONLY place offsets are applied
    this.gameContainer.position.set(
      CanvasState.offsetX,
      CanvasState.offsetY
    );
  }
}
```

### Grid Rendering (No Offsets)
```typescript
renderGrid(): void {
  const { GRID_COLS, GRID_ROWS } = GAME_CONFIG;
  const gridSize = CanvasState.gridSize;

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      // Positions relative to gameContainer origin
      const x = col * gridSize;  // NO OFFSET
      const y = row * gridSize;  // NO OFFSET

      graphics.rect(x, y, gridSize, gridSize);
    }
  }

  this.gridLayer.addChild(graphics);
}
```

### Entity Positioning (No Offsets)
```typescript
renderTowers(towers: Tower[]): void {
  towers.forEach(tower => {
    const sprite = this.createTowerSprite(tower);

    // Position in game space (NO OFFSET)
    sprite.position.set(tower.x, tower.y);

    this.towerLayer.addChild(sprite);
  });
}
```

### Input Handling (Automatic Translation)
```typescript
setupMouseHandlers(callback: (gridX: number, gridY: number) => void): void {
  this.gameContainer.on('pointerdown', (event: FederatedPointerEvent) => {
    // event.global is in canvas space
    // toLocal automatically subtracts gameContainer position
    const gamePos = this.gameContainer.toLocal(event.global);

    // Convert game space to grid space
    const { gridX, gridY } = this.gridManager.pixelToGrid(gamePos.x, gamePos.y);

    callback(gridX, gridY);
  });
}
```

---

## Data Flow

### Tower Placement Flow
```
1. User clicks canvas
   → FederatedPointerEvent with canvas coordinates
   ↓
2. gameContainer.toLocal(event.global)
   → Converts canvas → game space (PixiJS automatic)
   ↓
3. GridManager.pixelToGrid(gamePos.x, gamePos.y)
   → Converts game space → grid coordinates
   ↓
4. Backend validates and returns Tower
   ↓
5. GridManager.gridToPixel(gridX, gridY)
   → Converts grid → game space coordinates
   ↓
6. Tower stored with game space coordinates { x, y, gridX, gridY }
   ↓
7. sprite.position.set(tower.x, tower.y)
   → Sprite positioned in game space
   ↓
8. PixiJS renders sprite at canvas position
   → (gameContainer.position + sprite.position)
```

### Enemy Movement Flow
```
1. Enemy spawns at game space coordinates
   → x: -gridSize (off-screen left), y: pathY
   ↓
2. EnemySystem.update() moves in game space
   → newX = currentX + velocity * deltaTime
   ↓
3. sprite.position.set(enemy.x, enemy.y)
   → Game space coordinates
   ↓
4. PixiJS renders at canvas position
   → (gameContainer.position + sprite.position)
```

---

## Resize Handling

When canvas resizes:
```typescript
updateCanvasDimensions(): void {
  CanvasState.updateCanvas(newWidth, newHeight);

  // Update gameContainer position (offsets may change)
  this.gameContainer.position.set(
    CanvasState.offsetX,
    CanvasState.offsetY
  );

  // Reposition entities (grid coords → game space)
  gameStore.repositionEntitiesAfterResize();
}
```

Entity repositioning:
```typescript
repositionEntitiesAfterResize(): void {
  // Towers: Recalculate game space coords from immutable grid coords
  this.towers.forEach(tower => {
    const { x, y } = gridManager.gridToPixel(tower.gridX, tower.gridY);
    tower.x = x;
    tower.y = y;
  });

  // Enemies: Recalculate Y position (X stays the same for horizontal movement)
  this.enemies.forEach(enemy => {
    enemy.y = CanvasState.getEnemyPathY();
  });
}
```

---

## Architecture Principles

### 1. Single Responsibility
Each layer contains one type of entity:

| Layer | Contents | Z-order |
|-------|----------|---------|
| `gridLayer` | Grid lines, cell highlights | Bottom |
| `towerLayer` | Tower sprites | Middle |
| `enemyLayer` | Enemy sprites | Middle |
| `projectileLayer` | Projectile sprites | Middle |
| `uiLayer` | Range circles, effects | Top |

### 2. Container Positioning (Not Manual Offsets)
**Rule**: Apply positioning ONCE to gameContainer. All children use relative coordinates.

```typescript
// ✅ CORRECT: Position container once
gameContainer.position.set(offsetX, offsetY);
sprite.position.set(x, y);  // Relative to gameContainer

// ❌ WRONG: Manual offsets everywhere
sprite.position.set(x + offsetX, y + offsetY);
```

### 3. Coordinate Space Clarity
Always document which coordinate space a variable represents:

```typescript
// Good: Clear naming
const canvasPos = event.global;           // Canvas space
const gamePos = gameContainer.toLocal(canvasPos);  // Game space
const gridPos = pixelToGrid(gamePos.x, gamePos.y);  // Grid space

// Bad: Ambiguous
const pos = event.global;
const x = pos.x - offset;
```

### 4. Grid Coordinates are Immutable
Tower grid positions NEVER change after placement:

```typescript
// ✅ CORRECT: Recalculate game space from grid space
const { x, y } = gridToPixel(tower.gridX, tower.gridY);
tower.x = x;
tower.y = y;

// ❌ WRONG: Recalculate grid space from game space
tower.gridX = Math.floor(tower.x / gridSize);
tower.gridY = Math.floor(tower.y / gridSize);
```

---

## Testing Strategy

### Unit Tests

#### 1. GridManager Tests
```typescript
describe('GridManager coordinate transformations', () => {
  test('gridToPixel returns game space coordinates', () => {
    const result = gridManager.gridToPixel(0, 0);
    expect(result).toEqual({ x: 18, y: 18 });  // Center of cell
  });

  test('pixelToGrid converts game space to grid', () => {
    const result = gridManager.pixelToGrid(18, 18);
    expect(result).toEqual({ gridX: 0, gridY: 0 });
  });

  test('round-trip conversion is accurate', () => {
    const original = { gridX: 10, gridY: 5 };
    const pixel = gridManager.gridToPixel(original.gridX, original.gridY);
    const grid = gridManager.pixelToGrid(pixel.x, pixel.y);
    expect(grid).toEqual(original);
  });
});
```

#### 2. Container Position Tests
```typescript
describe('Container hierarchy', () => {
  test('gameContainer positioned at offset', () => {
    expect(renderer.gameContainer.position.x).toBe(CanvasState.offsetX);
    expect(renderer.gameContainer.position.y).toBe(CanvasState.offsetY);
  });

  test('layers are children of gameContainer', () => {
    expect(renderer.gameContainer.children).toContain(renderer.towerLayer);
    expect(renderer.gameContainer.children).toContain(renderer.enemyLayer);
  });
});
```

### Integration Tests (Playwright)

#### 1. Visual Alignment Test
```typescript
test('towers align with grid cells', async ({ page }) => {
  // Click center of grid cell (5, 5)
  await page.click('canvas', { position: { x: 220, y: 200 } });

  // Take screenshot
  await page.screenshot({ path: 'tower-placement.png' });

  // Verify tower sprite is centered in cell (5, 5)
  // Visual inspection or pixel comparison
});
```

#### 2. Container Translation Test
```typescript
test('input events translate correctly', async ({ page }) => {
  // Click at canvas position
  await page.click('canvas', { position: { x: 100, y: 100 } });

  // Verify game receives correct grid coordinates
  // (Not canvas coordinates)
  const gridPos = await page.evaluate(() => lastGridClick);
  expect(gridPos).toMatchObject({ gridX: 1, gridY: 2 });
});
```

#### 3. Resize Alignment Test
```typescript
test('entities remain aligned after resize', async ({ page }) => {
  // Place tower
  await page.click('canvas', { position: { x: 200, y: 200 } });

  // Resize window
  await page.setViewportSize({ width: 1024, height: 768 });

  // Take screenshot
  await page.screenshot({ path: 'after-resize.png' });

  // Verify tower still centered in its grid cell
});
```

---

## Common Pitfalls

### ❌ Adding Sprites to Wrong Container
```typescript
// WRONG: Add to stage directly
this.app.stage.addChild(towerSprite);

// RIGHT: Add to appropriate layer
this.towerLayer.addChild(towerSprite);
```

### ❌ Manual Offset Calculations
```typescript
// WRONG: Manual offset in sprite position
sprite.position.set(tower.x + offsetX, tower.y + offsetY);

// RIGHT: Let Container handle offset
sprite.position.set(tower.x, tower.y);
```

### ❌ Using Canvas Space for Game Logic
```typescript
// WRONG: Using canvas coordinates for distance
const dist = Math.sqrt((enemyCanvasX - towerCanvasX) ** 2 + ...);

// RIGHT: Use game space coordinates
const dist = Math.sqrt((enemy.x - tower.x) ** 2 + (enemy.y - tower.y) ** 2);
```

### ❌ Converting Coordinates Manually
```typescript
// WRONG: Manual conversion
const gameX = canvasX - CanvasState.offsetX;

// RIGHT: Use PixiJS Container methods
const gamePos = gameContainer.toLocal(canvasPoint);
```

---

## Maintenance Checklist

When modifying rendering or coordinate logic:

- [ ] Are all game entities added to appropriate layers (not stage directly)?
- [ ] Is gameContainer.position the ONLY place offsets are applied?
- [ ] Are entity positions in game space (relative to gameContainer)?
- [ ] Do coordinate conversions use Container.toLocal() / toGlobal()?
- [ ] Are grid coordinates immutable (never recalculated from pixels)?
- [ ] Are game space coordinates recalculated from grid coords on resize?
- [ ] Do tests verify alignment at grid boundaries?
- [ ] Is coordinate space clearly documented in code comments?

---

## Future Extensions

### Camera System (Zoom/Pan)
```typescript
// Zoom: Scale gameContainer
gameContainer.scale.set(zoomLevel);

// Pan: Move gameContainer
gameContainer.position.set(
  offsetX + panX,
  offsetY + panY
);

// No changes needed to entity positioning!
```

### UI Overlays
```typescript
// Create separate UI container at stage level (not affected by game zoom/pan)
const uiContainer = new Container();
app.stage.addChild(uiContainer);

// UI elements use canvas coordinates
uiContainer.position.set(0, 0);
```

### Minimap
```typescript
// Create separate minimap container
const minimapContainer = new Container();
minimapContainer.scale.set(0.2);  // 20% scale
app.stage.addChild(minimapContainer);

// Clone game entities into minimap
// Positions are the same, just scaled
```

---

## Version History
- **v2.0** (2026-01-28): Migrated to PixiJS Container hierarchy architecture
  - Removed manual offset calculations
  - Centralized positioning in gameContainer
  - Simplified GridManager (no offset logic)
  - Added automatic input event translation
  - Future-proofed for camera system
