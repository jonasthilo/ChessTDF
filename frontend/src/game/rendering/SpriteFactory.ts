import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Tower, Enemy, EnemyDefinition } from '../../types';
import { useGameStore } from '../../state/gameStore';
import { AssetLoader } from '../managers/AssetLoader';
import { TOWER_PIECE_MAP, ENEMY_PIECE_MAP, LEVEL_COLORS } from '../../utils/pieceAssets';

export class SpriteFactory {
  createTowerSprite(tower: Tower): Container {
    const container = new Container();

    // Range circle (hidden by default, shown on hover or selection)
    const rangeCircle = new Graphics();
    rangeCircle.circle(0, 0, tower.stats.range);
    rangeCircle.stroke({ width: 2, color: 0xffffff, alpha: 0.15 });
    rangeCircle.fill({ color: 0xffffff, alpha: 0.05 });
    rangeCircle.visible = false;
    rangeCircle.label = 'rangeCircle';
    container.addChild(rangeCircle);

    const towerDef = useGameStore.getState().getTowerDefinition(tower.towerId);
    const outlineColor = towerDef?.color || '#888888';

    const pieceName = TOWER_PIECE_MAP[tower.towerId] ?? 'pawn';

    // Check if assets are loaded
    if (AssetLoader.isLoaded()) {
      try {
        const texture = AssetLoader.getTexture('white', pieceName);
        const size = 28;
        const outlinedSprite = this.createOutlinedSprite(texture, size, outlineColor, 2);
        container.addChild(outlinedSprite);

        // Add level indicator if level > 1
        if (tower.level > 1) {
          const levelIndicator = new Graphics();
          const indicatorColor = LEVEL_COLORS[tower.level] ?? 0xffd700;
          levelIndicator.circle(size / 2 - 6, -size / 2 + 6, 5);
          levelIndicator.fill({ color: indicatorColor });
          container.addChild(levelIndicator);
        }
      } catch (error) {
        console.warn('Failed to load chess piece texture, falling back to geometric shape:', error);
        const shape = this.createTowerShape(tower.towerId);
        container.addChild(shape);
      }
    } else {
      // Fallback to geometric shapes if assets not loaded
      const shape = this.createTowerShape(tower.towerId);
      container.addChild(shape);
    }

    return container;
  }

  createEnemySprite(enemy: Enemy): Container {
    const container = new Container();
    const outlineColor = enemy.definition.color;

    const pieceName = ENEMY_PIECE_MAP[enemy.enemyId] ?? 'pawn';

    // Check if assets are loaded
    if (AssetLoader.isLoaded()) {
      try {
        const texture = AssetLoader.getTexture('black', pieceName);
        const size = enemy.definition.size * 1.3;
        const outlinedSprite = this.createOutlinedSprite(texture, size, outlineColor, 4);
        container.addChild(outlinedSprite);
      } catch (error) {
        console.warn('Failed to load chess piece texture, falling back to geometric shape:', error);
        const shape = this.createEnemyShape(enemy.definition);
        container.addChild(shape);
      }
    } else {
      // Fallback to geometric shapes if assets not loaded
      const shape = this.createEnemyShape(enemy.definition);
      container.addChild(shape);
    }

    return container;
  }

  createProjectileSprite(): Graphics {
    const graphics = new Graphics();
    graphics.circle(0, 0, 3);
    graphics.fill({ color: 0xffd700 });
    return graphics;
  }

  private createTowerShape(towerId: number): Graphics {
    const graphics = new Graphics();

    // Look up tower definition from store to get color
    const towerDef = useGameStore.getState().getTowerDefinition(towerId);
    const color = towerDef ? this.hexToNumber(towerDef.color) : 0x888888;

    switch (towerId) {
      case 1: // basic
        // Circle
        graphics.circle(0, 0, 14);
        graphics.fill({ color });
        break;
      case 2: // sniper
        // Triangle
        graphics.moveTo(0, -11);
        graphics.lineTo(-9, 11);
        graphics.lineTo(9, 11);
        graphics.lineTo(0, -11);
        graphics.fill({ color });
        break;
      case 3: // rapid
        // Hexagon
        {
          const radius = 13;
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            if (i === 0) graphics.moveTo(x, y);
            else graphics.lineTo(x, y);
          }
          graphics.lineTo(radius, 0);
          graphics.fill({ color });
        }
        break;
    }

    return graphics;
  }

  private createEnemyShape(def: EnemyDefinition): Graphics {
    const graphics = new Graphics();
    const color = this.hexToNumber(def.color);
    const size = def.size;

    switch (def.id) {
      case 1: // pawn
        // Circle
        graphics.circle(0, 0, size / 2);
        graphics.fill({ color });
        break;
      case 2: // knight
        // Diamond
        graphics.moveTo(0, -size / 2);
        graphics.lineTo(size / 2, 0);
        graphics.lineTo(0, size / 2);
        graphics.lineTo(-size / 2, 0);
        graphics.lineTo(0, -size / 2);
        graphics.fill({ color });
        break;
      case 3: // bishop
        // Triangle
        graphics.moveTo(0, -size / 2);
        graphics.lineTo(size / 2, size / 2);
        graphics.lineTo(-size / 2, size / 2);
        graphics.lineTo(0, -size / 2);
        graphics.fill({ color });
        break;
      case 4: // rook
        // Square
        graphics.rect(-size / 2, -size / 2, size, size);
        graphics.fill({ color });
        break;
      case 5: // queen
        // Star (5 points)
        {
          const points = 5;
          const outerRadius = size / 2;
          const innerRadius = size / 4;
          for (let i = 0; i < points * 2; i++) {
            const angle = (Math.PI / points) * i - Math.PI / 2;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            if (i === 0) graphics.moveTo(x, y);
            else graphics.lineTo(x, y);
          }
          graphics.fill({ color });
        }
        break;
      case 6: // king
        // Crown (rectangle + triangles)
        graphics.rect(-size / 2, 0, size, size / 2);
        graphics.fill({ color });
        graphics.moveTo(-size / 2, 0);
        graphics.lineTo(-size / 4, -size / 2);
        graphics.lineTo(0, 0);
        graphics.fill({ color });
        graphics.moveTo(0, 0);
        graphics.lineTo(size / 4, -size / 2);
        graphics.lineTo(size / 2, 0);
        graphics.fill({ color });
        break;
    }

    return graphics;
  }

  private hexToNumber(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }

  private createOutlinedSprite(
    texture: Texture,
    size: number,
    _outlineColor: string,
    _outlineWidth: number = 3
  ): Container {
    const container = new Container();

    // Simple drop shadow for depth
    const shadow = new Sprite(texture);
    shadow.width = size;
    shadow.height = size;
    shadow.anchor.set(0.5);
    shadow.position.set(2, 2);
    shadow.tint = 0x000000;
    shadow.alpha = 0.3;
    container.addChild(shadow);

    // Main sprite (no tint, pure white/black)
    const sprite = new Sprite(texture);
    sprite.width = size;
    sprite.height = size;
    sprite.anchor.set(0.5);
    container.addChild(sprite);

    return container;
  }
}
