/**
 * RESPONSIBILITY: Game loop timing & orchestration only.
 * - Runs 60 FPS ticker
 * - Calls systems in order (Enemy -> Tower -> Projectile -> Collision)
 * - Forwards input events to gameStore
 * - Triggers rendering
 *
 * NO: State changes, validation, API calls, game rules
 */
import { Application, Ticker, FederatedPointerEvent } from 'pixi.js';
import { PixiRenderer } from './rendering/PixiRenderer';
import { EnemySystem } from './systems/EnemySystem';
import { TowerSystem } from './systems/TowerSystem';
import { ProjectileSystem } from './systems/ProjectileSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { StatusEffectSystem } from './systems/StatusEffectSystem';
import { GridManager } from './managers/GridManager';
import { useGameStore } from '../state/gameStore';

export class GameEngine {
  private app: Application;
  private renderer: PixiRenderer;
  private gridManager: GridManager;
  private isRunning = false;

  // Game systems
  private enemySystem: EnemySystem;
  private towerSystem: TowerSystem;
  private projectileSystem: ProjectileSystem;
  private collisionSystem: CollisionSystem;
  private statusEffectSystem: StatusEffectSystem;

  // Mouse tracking for preview
  private mouseGridX = -1;
  private mouseGridY = -1;
  private mouseInCanvas = false;

  constructor(app: Application) {
    this.app = app;
    this.renderer = new PixiRenderer(app);
    this.gridManager = new GridManager();

    // Initialize systems
    this.enemySystem = new EnemySystem();
    this.towerSystem = new TowerSystem();
    this.projectileSystem = new ProjectileSystem();
    this.collisionSystem = new CollisionSystem();
    this.statusEffectSystem = new StatusEffectSystem();

    // Setup mouse interaction
    this.setupMouseHandlers();
  }

  private setupMouseHandlers(): void {
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    // Track mouse movement for preview
    this.app.stage.on('pointermove', (event: FederatedPointerEvent) => {
      // Convert canvas coordinates to game space coordinates
      const gamePos = this.renderer.canvasToGameSpace(event.global.x, event.global.y);
      const grid = this.gridManager.pixelToGrid(gamePos.x, gamePos.y);
      this.mouseGridX = grid.gridX;
      this.mouseGridY = grid.gridY;
      this.mouseInCanvas = true;
    });

    // Track mouse leaving canvas
    this.app.stage.on('pointerleave', () => {
      this.mouseInCanvas = false;
    });

    // Handle clicks for tower placement and enemy selection
    this.app.stage.on('pointerdown', (event: FederatedPointerEvent) => {
      // Convert canvas coordinates to game space coordinates
      const gamePos = this.renderer.canvasToGameSpace(event.global.x, event.global.y);

      // Check enemy click first (only when not in build mode)
      const state = useGameStore.getState();
      if (!state.selectedTowerId) {
        const clickedEnemy = this.findEnemyAtPosition(gamePos.x, gamePos.y);
        if (clickedEnemy) {
          state.selectEnemy(clickedEnemy);
          return;
        }
      }

      const grid = this.gridManager.pixelToGrid(gamePos.x, gamePos.y);
      this.handleGridClick(grid.gridX, grid.gridY);
    });
  }

  private findEnemyAtPosition(gameX: number, gameY: number): import('../types').Enemy | null {
    const HIT_RADIUS = 20;
    const enemies = useGameStore.getState().enemies;
    for (const enemy of enemies) {
      const dx = gameX - enemy.x;
      const dy = gameY - enemy.y;
      if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) {
        return enemy;
      }
    }
    return null;
  }

  private handleGridClick(gridX: number, gridY: number): void {
    // Forward to store - all validation happens there
    useGameStore.getState().handleTowerPlacement(gridX, gridY);
  }

  start(): void {
    this.isRunning = true;
    this.renderer.initialize();
    this.app.ticker.add(this.gameLoop, this);
  }

  stop(): void {
    this.isRunning = false;
    this.app.ticker.remove(this.gameLoop, this);
    this.renderer.destroy();
  }

  handleResize(): void {
    // Re-render the grid with new canvas dimensions
    this.renderer.updateGrid();

    // Reposition all entities based on their grid coordinates
    useGameStore.getState().repositionEntitiesAfterResize();

    // Force immediate re-render
    this.renderer.renderTowers(useGameStore.getState().towers);
    this.renderer.renderEnemies(useGameStore.getState().enemies);
  }

  private gameLoop(ticker: Ticker): void {
    if (!this.isRunning) return;

    const state = useGameStore.getState();
    const deltaTime = ticker.deltaMS * state.gameSpeed;

    // Update game time
    state.updateGameTime(deltaTime);

    // Process spawn queue (respects gameSpeed via deltaTime)
    state.processSpawnQueue(deltaTime);

    // Update game systems in order
    this.enemySystem.update(deltaTime);
    this.towerSystem.update(deltaTime);
    this.projectileSystem.update(deltaTime);
    this.collisionSystem.update();
    this.statusEffectSystem.update(deltaTime);

    // Check game rules (handled by store)
    state.checkGameOver();
    state.checkWaveComplete();

    // Render all entities
    this.renderer.renderTowers(state.towers);
    this.renderer.renderEnemies(state.enemies);
    this.renderer.renderProjectiles(state.projectiles);

    // Render placement preview if tower is selected and mouse is in canvas
    if (state.selectedTowerId && this.mouseInCanvas) {
      const towerDef = state.towerDefinitions.find((t) => t.id === state.selectedTowerId);
      const isValid = this.gridManager.isValidPlacement(
        this.mouseGridX,
        this.mouseGridY,
        state.towers
      );

      if (towerDef) {
        this.renderer.renderPlacementPreview(this.mouseGridX, this.mouseGridY, towerDef, isValid);
      }
    } else {
      this.renderer.clearPlacementPreview();
    }
  }
}
