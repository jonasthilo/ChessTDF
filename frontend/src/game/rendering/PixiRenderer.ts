import { Application, Container, Graphics, Point } from 'pixi.js';
import type { Tower, Enemy, Projectile, TowerDefinition } from '../../types';
import { SpriteFactory } from './SpriteFactory';
import { HealthBarRenderer } from './HealthBarRenderer';
import { GAME_CONFIG, CanvasState } from '../../config/gameConfig';
import { useGameStore } from '../../state/gameStore';
import { LEVEL_COLORS } from '../../utils/pieceAssets';

export class PixiRenderer {
  private app: Application;
  private spriteFactory: SpriteFactory;
  private healthBarRenderer: HealthBarRenderer;

  // Main game container (positioned at offset, all game entities are children)
  private gameContainer: Container;

  // Layers (children of gameContainer)
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

    // Create main game container
    this.gameContainer = new Container();
    this.app.stage.addChild(this.gameContainer);

    // Initialize layers (all children of gameContainer, not stage)
    this.gridLayer = new Container();
    this.towerLayer = new Container();
    this.enemyLayer = new Container();
    this.projectileLayer = new Container();
    this.uiLayer = new Container();

    // Add layers to gameContainer in z-order
    this.gameContainer.addChild(
      this.gridLayer,
      this.towerLayer,
      this.enemyLayer,
      this.projectileLayer,
      this.uiLayer
    );

    // Position gameContainer at offset (this is the ONLY place offsets are applied)
    this.updateCanvasDimensions();
  }

  initialize(): void {
    this.renderGrid();
  }

  updateCanvasDimensions(): void {
    // Update gameContainer position to reflect current canvas offsets
    // This is the ONLY place where offsets are applied to positioning
    this.gameContainer.position.set(CanvasState.offsetX, CanvasState.offsetY);
  }

  canvasToGameSpace(canvasX: number, canvasY: number): { x: number; y: number } {
    // Convert canvas coordinates to game space coordinates using PixiJS Container.toLocal()
    // This automatically handles the gameContainer offset transformation
    const point = this.gameContainer.toLocal(new Point(canvasX, canvasY));
    return { x: point.x, y: point.y };
  }

  updateGrid(): void {
    // Clear existing grid layer
    this.gridLayer.removeChildren();
    // Re-render grid with current canvas dimensions
    this.renderGrid();
    // Update gameContainer position for new canvas size
    this.updateCanvasDimensions();
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
    const gridWidth = GRID_COLS * gridSize;
    const gridHeight = GRID_ROWS * gridSize;

    // Draw board background (full canvas, added to gridLayer which is child of gameContainer)
    const background = new Graphics();
    // Background needs to cover area before gameContainer offset
    background.rect(
      -CanvasState.offsetX,
      -CanvasState.offsetY,
      CanvasState.width,
      CanvasState.height
    );
    background.fill({ color: 0x1a1a2e, alpha: 1.0 });

    // Draw chessboard pattern with different colors for tower areas vs enemy path
    const boardGraphics = new Graphics();

    // Tower placement area colors (cool dark blue-grayish)
    const towerLightSquare = 0x4a5568; // Cool blue-gray light
    const towerDarkSquare = 0x2d3748; // Cool dark blue-gray

    // Enemy path colors (lighter, white and grayish)
    const pathLightSquare = 0xe2e8f0; // Very light gray-white
    const pathDarkSquare = 0xb8c5d9; // Light blue-gray

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

        // NO OFFSET - positions relative to gameContainer
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

    // Draw decorative board border around the grid
    const boardBorder = new Graphics();
    boardBorder.rect(0, 0, gridWidth, gridHeight); // NO OFFSET
    boardBorder.stroke({ width: 4, color: 0x1e293b, alpha: 0.8 });

    // Inner highlight for depth effect
    const innerBorder = new Graphics();
    innerBorder.rect(2, 2, gridWidth - 4, gridHeight - 4); // NO OFFSET
    innerBorder.stroke({ width: 1, color: 0x64748b, alpha: 0.4 });

    // Highlight restricted zone (enemy path) with subtle directional indicators
    const restrictedGraphics = new Graphics();
    const restrictedRow = GAME_CONFIG.RESTRICTED_ROWS[0];
    if (restrictedRow !== undefined) {
      const pathY = restrictedRow * gridSize; // NO OFFSET
      const pathHeight = 2 * gridSize;

      // Dashed border lines at top and bottom of path
      const dashLength = 15;
      const gapLength = 10;

      for (let x = 0; x < gridWidth; x += dashLength + gapLength) {
        // Top border - NO OFFSET
        restrictedGraphics.moveTo(x, pathY);
        restrictedGraphics.lineTo(Math.min(x + dashLength, gridWidth), pathY);

        // Bottom border - NO OFFSET
        restrictedGraphics.moveTo(x, pathY + pathHeight);
        restrictedGraphics.lineTo(Math.min(x + dashLength, gridWidth), pathY + pathHeight);
      }

      restrictedGraphics.stroke({ width: 2, color: 0x94a3b8, alpha: 0.6 });
    }

    // Draw subtle grid lines for reference (less prominent)
    const gridLines = new Graphics();

    // NO OFFSET - all relative to gameContainer
    for (let x = 0; x <= GRID_COLS; x++) {
      gridLines.moveTo(x * gridSize, 0);
      gridLines.lineTo(x * gridSize, gridHeight);
    }

    for (let y = 0; y <= GRID_ROWS; y++) {
      gridLines.moveTo(0, y * gridSize);
      gridLines.lineTo(gridWidth, y * gridSize);
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
    this.syncSprites(towers, this.towerSprites, {
      onAdd: (tower) => this.addTowerSprite(tower),
      onUpdate: (tower) => this.updateTowerSprite(tower),
    });

    // Show range circle for selected tower
    const selectedTower = useGameStore.getState().selectedTower;
    for (const tower of towers) {
      const sprite = this.towerSprites.get(tower.id);
      if (sprite) {
        const rangeCircle = sprite.children.find((child) => child.label === 'rangeCircle');
        if (rangeCircle) {
          rangeCircle.visible = selectedTower?.id === tower.id;
        }
      }
    }
  }

  renderEnemies(enemies: Enemy[]): void {
    this.syncSprites(enemies, this.enemySprites, {
      onAdd: (enemy) => this.addEnemySprite(enemy),
      onUpdate: (enemy) => this.updateEnemySprite(enemy),
    });
  }

  renderProjectiles(projectiles: Projectile[]): void {
    this.syncSprites(projectiles, this.projectileSprites, {
      onAdd: (projectile) => this.addProjectileSprite(projectile),
      onUpdate: (projectile) => this.updateProjectileSprite(projectile),
      destroyChildren: false,
    });
  }

  private syncSprites<T extends { id: string }>(
    entities: T[],
    spriteMap: Map<string, Container | Graphics>,
    opts: {
      onAdd: (entity: T) => void;
      onUpdate: (entity: T) => void;
      destroyChildren?: boolean;
    }
  ): void {
    const currentIds = new Set(entities.map((e) => e.id));

    for (const [id, sprite] of spriteMap) {
      if (!currentIds.has(id)) {
        sprite.destroy(opts.destroyChildren !== false ? { children: true } : undefined);
        spriteMap.delete(id);
      }
    }

    for (const entity of entities) {
      if (!spriteMap.has(entity.id)) {
        opts.onAdd(entity);
      } else {
        opts.onUpdate(entity);
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

    // Add aura circle for aura towers (King)
    if (tower.attackType === 'aura' && tower.stats.auraRadius > 0) {
      const auraCircle = this.createAuraCircle(tower.stats.auraRadius);
      sprite.addChildAt(auraCircle, 0); // Behind the tower sprite
    }

    this.towerLayer.addChild(sprite);
    this.towerSprites.set(tower.id, sprite);
  }

  private createAuraCircle(radius: number): Graphics {
    const aura = new Graphics();
    aura.label = 'auraCircle';

    // Outer glow ring
    aura.circle(0, 0, radius);
    aura.stroke({ width: 2, color: 0xffd700, alpha: 0.4 });
    aura.fill({ color: 0xffd700, alpha: 0.08 });

    // Inner pulse effect
    aura.circle(0, 0, radius * 0.8);
    aura.stroke({ width: 1, color: 0xffd700, alpha: 0.2 });

    return aura;
  }

  private updateTowerSprite(tower: Tower): void {
    const sprite = this.towerSprites.get(tower.id);
    if (!sprite) return;
    sprite.position.set(tower.x, tower.y);

    // Check if level indicator needs updating
    const level = tower.level ?? 1;
    const existingIndicator = sprite.children.find((child) => child.label === 'levelIndicator');

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

    // Update range circle if tower was upgraded
    const existingRange = sprite.children.find((child) => child.label === 'rangeCircle');
    if (existingRange) {
      const wasVisible = existingRange.visible;
      existingRange.destroy();
      const newRange = new Graphics();
      newRange.circle(0, 0, tower.stats.range);
      newRange.stroke({ width: 2, color: 0xffffff, alpha: 0.15 });
      newRange.fill({ color: 0xffffff, alpha: 0.05 });
      newRange.visible = wasVisible;
      newRange.label = 'rangeCircle';
      sprite.addChildAt(newRange, 0);
    }

    // Update aura circle if tower was upgraded (aura towers only)
    if (tower.attackType === 'aura' && tower.stats.auraRadius > 0) {
      const existingAura = sprite.children.find((child) => child.label === 'auraCircle');
      if (existingAura) {
        existingAura.destroy();
      }
      const auraCircle = this.createAuraCircle(tower.stats.auraRadius);
      sprite.addChildAt(auraCircle, 0);
    }
  }

  private createLevelIndicator(level: number): Graphics {
    const graphics = new Graphics();
    graphics.label = 'levelIndicator';

    const color = LEVEL_COLORS[level] ?? 0xffd700;

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
      this.healthBarRenderer.updateHealthBar(healthBar, enemy.health, enemy.maxHealth);
    }

    // Update status effect indicators
    this.updateStatusEffectIndicators(sprite, enemy);
  }

  private updateStatusEffectIndicators(sprite: Container, enemy: Enemy): void {
    // Remove existing status indicators
    const existingIndicators = sprite.children.filter((child) => child.label === 'statusIndicator');
    for (const indicator of existingIndicators) {
      indicator.destroy();
    }

    if (enemy.statusEffects.length === 0) return;

    // Status effect colors
    const effectColors: Record<string, number> = {
      slow: 0x2196f3, // Blue
      poison: 0x4caf50, // Green
      mark: 0xff9800, // Orange
      armor_shred: 0x9c27b0, // Purple
    };

    // Create small colored dots for each active effect
    const dotSize = 4;
    const spacing = 10;
    const startX = -((enemy.statusEffects.length - 1) * spacing) / 2;
    const yOffset = -25; // Above the health bar

    for (let i = 0; i < enemy.statusEffects.length; i++) {
      const effect = enemy.statusEffects[i];
      if (effect === undefined) continue;

      const color = effectColors[effect.type] ?? 0xffffff;

      const indicator = new Graphics();
      indicator.label = 'statusIndicator';
      indicator.circle(startX + i * spacing, yOffset, dotSize);
      indicator.fill({ color });
      indicator.stroke({ width: 1, color: 0x000000, alpha: 0.5 });

      sprite.addChild(indicator);
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
    if (
      gridX < 0 ||
      gridY < 0 ||
      gridX >= GAME_CONFIG.GRID_COLS ||
      gridY >= GAME_CONFIG.GRID_ROWS
    ) {
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
    const defaultStats = {
      cost: 0,
      damage: 0,
      range: 0,
      fireRate: 0,
      projectileSpeed: 400,
      splashRadius: 0,
      splashChance: 0,
      chainCount: 0,
      pierceCount: 0,
      targetCount: 1,
      statusEffect: 'none' as const,
      effectDuration: 0,
      effectStrength: 0,
      auraRadius: 0,
      auraEffect: 'none' as const,
      auraStrength: 0,
    };
    const previewStats = level1 ?? defaultStats;

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
      attackType: towerDef.attackType,
      targetingMode: towerDef.defaultTargeting,
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

    // Draw grid cell highlight (NO OFFSET - relative to gameContainer)
    const gridSize = CanvasState.gridSize;
    const cellHighlight = new Graphics();
    cellHighlight.rect(gridX * gridSize, gridY * gridSize, gridSize, gridSize);
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
        // Return game space coordinates (NO OFFSET - relative to gameContainer)
        return {
          x: gridX * gridSize + gridSize / 2,
          y: gridY * gridSize + gridSize / 2,
        };
      },
    };
  }
}
