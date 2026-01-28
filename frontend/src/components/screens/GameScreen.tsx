import { useEffect, useRef } from 'react';
import { useGameStore } from '../../state/gameStore';
import { Application } from 'pixi.js';
import { PlayerStats } from '../hud/PlayerStats';
import { WaveInfo } from '../hud/WaveInfo';
import { TowerPanel } from '../hud/TowerPanel';
import { GameControls } from '../hud/GameControls';
import { TowerModal } from '../hud/TowerModal';
import { ViewportWarning } from '../hud/ViewportWarning';
import { VersionDisplay } from '../common/VersionDisplay';
import { GameEngine } from '../../game/GameEngine';
import { AssetLoader } from '../../game/managers/AssetLoader';
import { CanvasState } from '../../config/gameConfig';
import './GameScreen.css';

export const GameScreen = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const appRef = useRef<Application | null>(null);
  const selectedTower = useGameStore((state) => state.selectedTower);

  useEffect(() => {
    let isCancelled = false;
    let localApp: Application | null = null;
    let localEngine: GameEngine | null = null;

    const initPixi = async () => {
      const container = canvasRef.current;
      if (!container || isCancelled) return;

      // Clear any existing canvas elements
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // Use fixed canvas size for simplicity
      const canvasWidth = 800;
      const canvasHeight = 400;

      // Update CanvasState with dimensions
      CanvasState.updateDimensions(canvasWidth, canvasHeight);

      // Initialize PixiJS Application
      const app = new Application();
      await app.init({
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: 0x1a1a1a,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      // Check if effect was cancelled during async init
      if (isCancelled) {
        app.destroy({ removeView: true });
        return;
      }

      localApp = app;

      // Mount canvas to DOM
      container.appendChild(app.canvas as HTMLCanvasElement);

      // Load chess piece assets before creating engine
      try {
        await AssetLoader.loadChessPieces();
      } catch (error) {
        console.warn('Failed to load chess piece assets, using fallback graphics:', error);
      }

      // Initialize game engine
      const engine = new GameEngine(app);
      localEngine = engine;
      engine.start();

      // Store references for resize handler
      appRef.current = app;
      engineRef.current = engine;
    };

    initPixi();

    return () => {
      isCancelled = true;
      // Cleanup local references (captures the actual instances)
      if (localEngine) {
        localEngine.stop();
      }
      if (localApp) {
        localApp.destroy({ removeView: true });
      }
      appRef.current = null;
      engineRef.current = null;
    };
  }, []);

  // Removed resize handler - using fixed canvas size for simplicity

  return (
    <div className="game-screen">
      <div className="game-header">
        <PlayerStats />
        <WaveInfo />
        <ViewportWarning />
        <GameControls />
      </div>

      <div className="game-content">
        <div className="game-sidebar game-sidebar-left">
          <TowerPanel />
        </div>

        <div className="game-canvas-container" ref={canvasRef}>
          {/* PixiJS canvas will be injected here */}
        </div>

        <div className="game-sidebar game-sidebar-right">
          {!selectedTower && (
            <div className="tower-panel-placeholder">
              <div className="placeholder-content">
                <div className="placeholder-icon">🏰</div>
                <h3>Tower Details</h3>
                <p>Click on a placed tower to view its stats and upgrade options</p>
              </div>
            </div>
          )}
          <TowerModal />
        </div>
      </div>

      <VersionDisplay />
    </div>
  );
};
