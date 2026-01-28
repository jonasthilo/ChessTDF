import { Application, Container, Graphics } from 'pixi.js';
import type { Tower, Enemy, Projectile, TowerDefinition } from '../../types';
import { SpriteFactory } from './SpriteFactory';
import { HealthBarRenderer } from './HealthBarRenderer';
import { GAME_CONFIG, CanvasState } from '../../config/gameConfig';
import { useGameStore } from '../../state/gameStore';

export class PixiRenderer {
  private app: Application;
  private spriteFactory: SpriteFactory;
  private healthBarRenderer: HealthBarRenderer;

  // Layers
  private gridLayer: Container;
  private towerLayer: Container;
  private enemyLayer: Container;
  private projectileLayer: Container;
  private uiLayer: Container;

  // Sprite tracking
  private towerSprites = new Map<string, Container>();
  private enemySprites = new Map<string, Container>();
  private projectileSprites = new Map<string, Graphics>();

  // Placement preview
  private previewContainer: Container | null = null;
  private rangeIndicator: Graphics | null = null;

  constructor(app: Application) {
    this.app = app;
    this.spriteFactory = new SpriteFactory();
    this.healthBarRenderer = new HealthBarRenderer();

    // Initialize layers
    this.gridLayer = new Container();
    this.towerLayer = new Container();
    this.enemyLayer = new Container();
    this.projectileLayer = new Container();
    this.uiLayer = new Container();

    // Add to stage in z-order
    this.app.stage.addChild(
      this.gridLayer,
      this.towerLayer,
      this.enemyLayer,
      this.projectileLayer,
      this.uiLayer
    );
  }

  initialize(): void {
    this.renderGrid();
  }

  updateGrid(): void {
    // Clear existing grid layer
    this.gridLayer.removeChildren();
    // Re-render grid with current canvas dimensions
    this.renderGrid();
  }

  destroy(): void {
    // Clear all sprites
    this.towerSprites.forEach((sprite) => sprite.destroy({ children: true }));
    this.towerSprites.clear();

    this.enemySprites.forEach((sprite) => sprite.destroy({ children: true }));
    this.enemySprites.clear();

    this.projectileSprites.forEach((sprite) => sprite.destroy());
    this.projectileSprites.clear();

    // Destroy layers
    this.gridLayer.destroy({ children: true });
    this.towerLayer.destroy({ children: true });
    this.enemyLayer.destroy({ children: true });
    this.projectileLayer.destroy({ children: true });
    this.uiLayer.destroy({ children: true });
  }

  renderGrid(): void {
    const { GRID_COLS, GRID_ROWS, RESTRICTED_ROWS } = GAME_CONFIG;
    const gridSize = CanvasState.gridSize;

    // Draw board background
    const background = new Graphics();
    background.rect(0, 0, CanvasState.width, CanvasState.height);
    background.fill({ color: 0x1a1a2e, alpha: 1.0 });

    // Draw chessboard pattern with different colors for tower areas vs enemy path
    const boardGraphics = new Graphics();

    // Tower placement area colors (cool dark blue-grayish)
    const towerLightSquare = 0x4a5568;  // Cool blue-gray light
    const towerDarkSquare = 0x2d3748;   // Cool dark blue-gray

    // Enemy path colors (lighter, white and grayish)
    const pathLightSquare = 0xe2e8f0;   // Very light gray-white
    const pathDarkSquare = 0xb8c5d9;    // Light blue-gray

    for (let row = 0; row < GRID_ROWS; row++) {
      const isPathRow = (RESTRICTED_ROWS as readonly number[]).includes(row);

      for (let col = 0; col < GRID_COLS; col++) {
        const isLight = (row + col) % 2 === 0;

        // Choose color based on whether it's the enemy path or tower placement area
        let color: number;
        if (isPathRow) {
          color = isLight ? pathLightSquare : pathDarkSquare;
        } else {
          color = isLight ? towerLightSquare : towerDarkSquare;
        }

        const x = col * gridSize;
        const y = row * gridSize;

        // Draw square
        boardGraphics.rect(x, y, gridSize, gridSize);
        boardGraphics.fill({ color, alpha: 1.0 });

        // Add subtle border to each square for better definition
        boardGraphics.rect(x, y, gridSize, gridSize);
        const borderColor = isPathRow ? 0xa0aec0 : 0x1e293b;
        boardGraphics.stroke({ width: 0.5, color: borderColor, alpha: 0.3 });
      }
    }

    // Draw decorative board border
    const boardBorder = new Graphics();
    boardBorder.rect(0, 0, CanvasState.width, CanvasState.height);
    boardBorder.stroke({ width: 4, color: 0x1e293b, alpha: 0.8 });

    // Inner highlight for depth effect
    const innerBorder = new Graphics();
    innerBorder.rect(2, 2, CanvasState.width - 4, CanvasState.height - 4);
    innerBorder.stroke({ width: 1, color: 0x64748b, alpha: 0.4 });

    // Highlight restricted zone (enemy path) with subtle directional indicators
    const restrictedGraphics = new Graphics();
    const restrictedRow = GAME_CONFIG.RESTRICTED_ROWS[0];
    if (restrictedRow !== undefined) {
      const pathY = restrictedRow * gridSize;
      const pathHeight = 2 * gridSize;

      // Dashed border lines at top and bottom of path
      const dashLength = 15;
      const gapLength = 10;

      for (let x = 0; x < CanvasState.width; x += dashLength + gapLength) {
        // Top border
        restrictedGraphics.moveTo(x, pathY);
        restrictedGraphics.lineTo(Math.min(x + dashLength, CanvasState.width), pathY);

        // Bottom border
        restrictedGraphics.moveTo(x, pathY + pathHeight);
        restrictedGraphics.lineTo(Math.min(x + dashLength, CanvasState.width), pathY + pathHeight);
      }

      restrictedGraphics.stroke({ width: 2, color: 0x94a3b8, alpha: 0.6 });
    }

    // Draw subtle grid lines for reference (less prominent)
    const gridLines = new Graphics();
    for (let x = 0; x <= GRID_COLS; x++) {
      gridLines.moveTo(x * gridSize, 0);
      gridLines.lineTo(x * gridSize, CanvasState.height);
    }

    for (let y = 0; y <= GRID_ROWS; y++) {
      gridLines.moveTo(0, y * gridSize);
      gridLines.lineTo(CanvasState.width, y * gridSize);
    }

    gridLines.stroke({ width: 0.5, color: 0x475569, alpha: 0.25 });

    this.gridLayer.addChild(
      background,
      boardGraphics,
      gridLines,
      restrictedGraphics,
      boardBorder,
      innerBorder
    );
  }

  renderTowers(towers: Tower[]): void {
    const currentIds = new Set(towers.map((t) => t.id));

    // Remove destroyed towers
    for (const [id, sprite] of this.towerSprites) {
      if (!currentIds.has(id)) {
        sprite.destroy({ children: true });
        this.towerSprites.delete(id);
      }
    }

    // Add or update towers
    for (const tower of towers) {
      if (!this.towerSprites.has(tower.id)) {
        this.addTowerSprite(tower);
      } else {
        this.updateTowerSprite(tower);
      }
    }
  }

  renderEnemies(enemies: Enemy[]): void {
    const currentIds = new Set(enemies.map((e) => e.id));

    // Remove dead enemies
    for (const [id, sprite] of this.enemySprites) {
      if (!currentIds.has(id)) {
        sprite.destroy({ children: true });
        this.enemySprites.delete(id);
      }
    }

    // Add or update enemies
    for (const enemy of enemies) {
      if (!this.enemySprites.has(enemy.id)) {
        this.addEnemySprite(enemy);
      } else {
        this.updateEnemySprite(enemy);
      }
    }
  }

  renderProjectiles(projectiles: Projectile[]): void {
    const currentIds = new Set(projectiles.map((p) => p.id));

    // Remove destroyed projectiles
    for (const [id, sprite] of this.projectileSprites) {
      if (!currentIds.has(id)) {
        sprite.destroy();
        this.projectileSprites.delete(id);
      }
    }

    // Add or update projectiles
    for (const projectile of projectiles) {
      if (!this.projectileSprites.has(projectile.id)) {
        this.addProjectileSprite(projectile);
      } else {
        this.updateProjectileSprite(projectile);
      }
    }
  }

  private addTowerSprite(tower: Tower): void {
    const sprite = this.spriteFactory.createTowerSprite(tower);
    sprite.position.set(tower.x, tower.y);

    // Add level indicator if level > 1
    const level = tower.level ?? 1;
    if (level > 1) {
      const levelIndicator = this.createLevelIndicator(level);
      levelIndicator.position.set(15, -20);
      sprite.addChild(levelIndicator);
    }

    this.towerLayer.addChild(sprite);
    this.towerSprites.set(tower.id, sprite);
  }

  private updateTowerSprite(tower: Tower): void {
    const sprite = this.towerSprites.get(tower.id);
    if (!sprite) return;
    sprite.position.set(tower.x, tower.y);

    // Check if level indicator needs updating
    const level = tower.level ?? 1;
    const existingIndicator = sprite.children.find(
      (child) => child.label === 'levelIndicator'
    );

    if (level > 1 && !existingIndicator) {
      // Add level indicator
      const levelIndicator = this.createLevelIndicator(level);
      levelIndicator.position.set(15, -20);
      sprite.addChild(levelIndicator);
    } else if (existingIndicator && level > 1) {
      // Update existing indicator
      existingIndicator.destroy();
      const newIndicator = this.createLevelIndicator(level);
      newIndicator.position.set(15, -20);
      sprite.addChild(newIndicator);
    }
  }

  private createLevelIndicator(level: number): Graphics {
    const graphics = new Graphics();
    graphics.label = 'levelIndicator';

    // Colors for levels: Green(2), Blue(3), Purple(4), Gold(5+)
    const colors = [0x4caf50, 0x2196f3, 0x9c27b0, 0xffd700];
    const colorIndex = Math.min(level - 2, colors.length - 1);
    const color = colors[colorIndex] ?? 0x4caf50;

    // Draw small dots for each level above 1
    const dotCount = Math.min(level - 1, 4);
    const dotSpacing = 8;
    const startX = -((dotCount - 1) * dotSpacing) / 2;

    for (let i = 0; i < dotCount; i++) {
      graphics.circle(startX + i * dotSpacing, 0, 4);
      graphics.fill({ color });
    }

    return graphics;
  }

  private addEnemySprite(enemy: Enemy): void {
    const sprite = this.spriteFactory.createEnemySprite(enemy);

    // Add health bar
    const healthBar = this.healthBarRenderer.createHealthBar();
    sprite.addChild(healthBar);

    sprite.position.set(enemy.x, enemy.y);
    this.enemyLayer.addChild(sprite);
    this.enemySprites.set(enemy.id, sprite);
  }

  private updateEnemySprite(enemy: Enemy): void {
    const sprite = this.enemySprites.get(enemy.id);
    if (!sprite) return;

    sprite.position.set(enemy.x, enemy.y);

    // Update health bar
    const healthBar = sprite.children[1] as Container | undefined;
    if (healthBar) {
      this.healthBarRenderer.updateHealthBar(
        healthBar,
        enemy.health,
        enemy.maxHealth
      );
    }
  }

  private addProjectileSprite(projectile: Projectile): void {
    const sprite = this.spriteFactory.createProjectileSprite();
    sprite.position.set(projectile.x, projectile.y);
    this.projectileLayer.addChild(sprite);
    this.projectileSprites.set(projectile.id, sprite);
  }

  private updateProjectileSprite(projectile: Projectile): void {
    const sprite = this.projectileSprites.get(projectile.id);
    if (!sprite) return;
    sprite.position.set(projectile.x, projectile.y);
  }

  renderPlacementPreview(
    gridX: number,
    gridY: number,
    towerDef: TowerDefinition,
    isValid: boolean
  ): void {
    // Don't render preview for invalid grid positions (outside canvas bounds)
    if (gridX < 0 || gridY < 0 || gridX >= GAME_CONFIG.GRID_COLS || gridY >= GAME_CONFIG.GRID_ROWS) {
      this.clearPlacementPreview();
      return;
    }

    // Clear previous preview
    this.clearPlacementPreview();

    // Create preview container
    this.previewContainer = new Container();

    // Convert grid to pixel coordinates
    const pixelPos = this.getGridManager().gridToPixel(gridX, gridY);

    // Create tower preview sprite
    // Get level 1 stats for this tower type to show preview stats
    const level1 = useGameStore.getState().getTowerLevelStats(towerDef.id, 1);
    const previewStats = level1 ? {
      cost: level1.cost,
      damage: level1.damage,
      range: level1.range,
      fireRate: level1.fireRate,
    } : {
      cost: 0,
      damage: 0,
      range: 0,
      fireRate: 0,
    };

    const towerSprite = this.spriteFactory.createTowerSprite({
      id: 'preview',
      towerId: towerDef.id,
      level: 1,
      stats: previewStats,
      gridX,
      gridY,
      x: pixelPos.x,
      y: pixelPos.y,
      lastFireTime: 0,
    });

    // Position the tower sprite at the correct pixel location
    towerSprite.position.set(pixelPos.x, pixelPos.y);

    // Set preview transparency and color tint
    towerSprite.alpha = 0.6;
    if (!isValid) {
      towerSprite.tint = 0xff0000; // Red tint for invalid placement
    } else {
      towerSprite.tint = 0x00ff00; // Green tint for valid placement
    }

    this.previewContainer.addChild(towerSprite);

    // Draw range indicator circle centered at the tower position
    this.rangeIndicator = new Graphics();
    this.rangeIndicator.circle(0, 0, previewStats.range);
    this.rangeIndicator.stroke({
      width: 2,
      color: isValid ? 0x00ff00 : 0xff0000,
      alpha: 0.3,
    });
    this.rangeIndicator.fill({ color: isValid ? 0x00ff00 : 0xff0000, alpha: 0.1 });
    this.rangeIndicator.position.set(pixelPos.x, pixelPos.y);

    this.previewContainer.addChild(this.rangeIndicator);

    // Draw grid cell highlight
    const gridSize = CanvasState.gridSize;
    const cellHighlight = new Graphics();
    cellHighlight.rect(
      gridX * gridSize,
      gridY * gridSize,
      gridSize,
      gridSize
    );
    cellHighlight.fill({
      color: isValid ? 0x00ff00 : 0xff0000,
      alpha: 0.2,
    });

    this.previewContainer.addChild(cellHighlight);

    // Add to UI layer
    this.uiLayer.addChild(this.previewContainer);
  }

  clearPlacementPreview(): void {
    if (this.previewContainer) {
      this.previewContainer.destroy({ children: true });
      this.previewContainer = null;
    }
    if (this.rangeIndicator) {
      this.rangeIndicator = null;
    }
  }

  private getGridManager(): { gridToPixel: (x: number, y: number) => { x: number; y: number } } {
    return {
      gridToPixel: (gridX: number, gridY: number) => {
        const gridSize = CanvasState.gridSize;
        return {
          x: gridX * gridSize + gridSize / 2,
          y: gridY * gridSize + gridSize / 2,
        };
      },
    };
  }
}
