export interface BotGameState {
  gameId: string;
  coins: number;
  lives: number;
  wave: number;
  towers: Array<{
    id: string;
    towerId: number;
    gridX: number;
    gridY: number;
    level: number;
  }>;
  isOver: boolean;
}

export interface BotRunResult {
  gameId: string;
  strategy: string;
  difficulty: string;
  gameMode: string;
  wavesCompleted: number;
  totalWaves: number;
  enemiesKilled: number;
  enemiesEscaped: number;
  livesRemaining: number;
  finalCoins: number;
  outcome: 'win' | 'lose';
}
