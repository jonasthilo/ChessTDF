import { Assets, Texture } from 'pixi.js';

export class AssetLoader {
  private static loaded = false;

  static async loadChessPieces(): Promise<void> {
    if (this.loaded) return;

    try {
      // Load assets with full paths

      // Add white pieces
      Assets.add({ alias: 'white-king', src: '/assets/pieces/white/king.svg' });
      Assets.add({ alias: 'white-queen', src: '/assets/pieces/white/queen.svg' });
      Assets.add({ alias: 'white-rook', src: '/assets/pieces/white/rook.svg' });
      Assets.add({ alias: 'white-bishop', src: '/assets/pieces/white/bishop.svg' });
      Assets.add({ alias: 'white-knight', src: '/assets/pieces/white/knight.svg' });
      Assets.add({ alias: 'white-pawn', src: '/assets/pieces/white/pawn.svg' });

      // Add black pieces
      Assets.add({ alias: 'black-king', src: '/assets/pieces/black/king.svg' });
      Assets.add({ alias: 'black-queen', src: '/assets/pieces/black/queen.svg' });
      Assets.add({ alias: 'black-rook', src: '/assets/pieces/black/rook.svg' });
      Assets.add({ alias: 'black-bishop', src: '/assets/pieces/black/bishop.svg' });
      Assets.add({ alias: 'black-knight', src: '/assets/pieces/black/knight.svg' });
      Assets.add({ alias: 'black-pawn', src: '/assets/pieces/black/pawn.svg' });

      console.log('[AssetLoader] Assets added, starting load...');

      // Load all assets
      const aliases = [
        'white-king',
        'white-queen',
        'white-rook',
        'white-bishop',
        'white-knight',
        'white-pawn',
        'black-king',
        'black-queen',
        'black-rook',
        'black-bishop',
        'black-knight',
        'black-pawn',
      ];

      await Assets.load(aliases);

      this.loaded = true;
    } catch (error) {
      console.error('[AssetLoader] Failed to load chess pieces:', error);
      throw error;
    }
  }

  static getTexture(color: 'white' | 'black', piece: string): Texture {
    const assetKey = `${color}-${piece}`;
    const texture = Assets.get(assetKey);

    if (!texture) {
      console.error(`[AssetLoader] Texture not found for: ${assetKey}`);
      throw new Error(`Texture not found: ${assetKey}`);
    }

    return texture;
  }

  static isLoaded(): boolean {
    return this.loaded;
  }
}
