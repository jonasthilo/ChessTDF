// Tower ID to piece name (for PixiJS texture lookups)
export const TOWER_PIECE_MAP: Record<number, string> = {
  1: 'pawn',
  2: 'rook',
  3: 'knight',
  4: 'bishop',
  5: 'queen',
  6: 'king',
};

// Enemy ID to piece name (for PixiJS texture lookups)
export const ENEMY_PIECE_MAP: Record<number, string> = {
  1: 'pawn',
  2: 'knight',
  3: 'bishop',
  4: 'rook',
  5: 'queen',
  6: 'king',
};

// Tower ID to SVG asset path (for React img src)
const TOWER_IMAGE_MAP: Record<number, string> = {
  1: '/assets/pieces/white/pawn.svg',
  2: '/assets/pieces/white/rook.svg',
  3: '/assets/pieces/white/knight.svg',
  4: '/assets/pieces/white/bishop.svg',
  5: '/assets/pieces/white/queen.svg',
  6: '/assets/pieces/white/king.svg',
};

// Enemy ID to SVG asset path (for React img src)
const ENEMY_IMAGE_MAP: Record<number, string> = {
  1: '/assets/pieces/black/pawn.svg',
  2: '/assets/pieces/black/knight.svg',
  3: '/assets/pieces/black/bishop.svg',
  4: '/assets/pieces/black/rook.svg',
  5: '/assets/pieces/black/queen.svg',
  6: '/assets/pieces/black/king.svg',
};

// Level colors shared between SpriteFactory and PixiRenderer
export const LEVEL_COLORS: Record<number, number> = {
  2: 0x4caf50,
  3: 0x2196f3,
  4: 0x9c27b0,
  5: 0xffd700,
};

export function getTowerImage(towerId: number): string {
  return TOWER_IMAGE_MAP[towerId] ?? '/assets/pieces/white/pawn.svg';
}

export function getEnemyImage(enemyId: number): string {
  return ENEMY_IMAGE_MAP[enemyId] ?? '/assets/pieces/black/pawn.svg';
}
