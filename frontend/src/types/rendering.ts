import type { Container } from 'pixi.js';

export interface SpriteContainer {
  id: string;
  container: Container;
  healthBar?: Container;
}

export interface RenderOptions {
  showGrid: boolean;
  showRanges: boolean;
  showHealthBars: boolean;
}
