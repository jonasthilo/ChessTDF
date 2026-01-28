import { GameSession } from '../types';

// In-memory storage for game sessions
// In production, this would be replaced with a database

class GameStore {
  private games: Map<string, GameSession> = new Map();

  // Create a new game session
  create(gameSession: GameSession): void {
    this.games.set(gameSession.id, gameSession);
  }

  // Get a game session by ID
  get(gameId: string): GameSession | undefined {
    return this.games.get(gameId);
  }

  // Update a game session
  update(gameId: string, updates: Partial<GameSession>): GameSession | undefined {
    const game = this.games.get(gameId);
    if (!game) {
      return undefined;
    }

    const updatedGame: GameSession = {
      ...game,
      ...updates,
      lastUpdated: new Date()
    };

    this.games.set(gameId, updatedGame);
    return updatedGame;
  }

  // Delete a game session
  delete(gameId: string): boolean {
    return this.games.delete(gameId);
  }

  // Get all game sessions (for debugging)
  getAll(): GameSession[] {
    return Array.from(this.games.values());
  }

  // Get game count (for monitoring)
  count(): number {
    return this.games.size;
  }

  // Clean up old games (optional cleanup task)
  cleanup(maxAgeMs: number = 3600000): number { // Default 1 hour
    const now = new Date().getTime();
    let deletedCount = 0;

    for (const [id, game] of this.games.entries()) {
      const age = now - game.lastUpdated.getTime();
      if (age > maxAgeMs) {
        this.games.delete(id);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

// Export singleton instance
export const gameStore = new GameStore();
