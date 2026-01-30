import { query } from '../db';
import { GameSessionDB, GameMode, SessionStatus } from '../../types';
import { buildUpdateFields } from '../helpers';

interface GameSessionRow {
  game_id: string;
  settings_id: number | null;
  game_mode: string;
  current_wave: number;
  waves_completed: number;
  coins: number;
  lives: number;
  towers: string | unknown[];
  enemies_killed: number;
  coins_earned: number;
  coins_spent: number;
  damage_dealt: number;
  started_at: Date;
  last_updated: Date;
  status: string;
}

export class GameSessionRepository {
  // Create new game session
  async createGameSession(
    session: Omit<GameSessionDB, 'startedAt' | 'lastUpdated'>
  ): Promise<GameSessionDB> {
    const result = await query<GameSessionRow>(
      `INSERT INTO game_sessions (
        game_id, settings_id, game_mode, current_wave, waves_completed, coins, lives,
        towers, enemies_killed, coins_earned, coins_spent, damage_dealt, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        session.gameId,
        session.settingsId || null,
        session.gameMode,
        session.currentWave,
        session.wavesCompleted,
        session.coins,
        session.lives,
        JSON.stringify(session.towers),
        session.enemiesKilled,
        session.coinsEarned,
        session.coinsSpent,
        session.damageDealt,
        session.status,
      ]
    );
    return this.mapToGameSession(result.rows[0]!);
  }

  // Get game session by ID
  async getGameSession(gameId: string): Promise<GameSessionDB | null> {
    const result = await query<GameSessionRow>('SELECT * FROM game_sessions WHERE game_id = $1', [
      gameId,
    ]);
    if (result.rows.length === 0) return null;
    return this.mapToGameSession(result.rows[0]!);
  }

  // Update game session
  async updateGameSession(gameId: string, updates: Partial<GameSessionDB>): Promise<boolean> {
    const built = buildUpdateFields(updates, {
      currentWave: 'current_wave',
      wavesCompleted: 'waves_completed',
      coins: 'coins',
      lives: 'lives',
      towers: ['towers', (v) => JSON.stringify(v)],
      enemiesKilled: 'enemies_killed',
      coinsEarned: 'coins_earned',
      coinsSpent: 'coins_spent',
      damageDealt: 'damage_dealt',
      status: 'status',
    });
    if (!built) return false;

    built.values.push(gameId);
    const sql = `UPDATE game_sessions SET ${built.fields.join(', ')} WHERE game_id = $${built.nextParam}`;
    const result = await query(sql, built.values);
    return (result.rowCount ?? 0) > 0;
  }

  // Delete game session
  async deleteGameSession(gameId: string): Promise<boolean> {
    const result = await query('DELETE FROM game_sessions WHERE game_id = $1', [gameId]);
    return (result.rowCount ?? 0) > 0;
  }

  // Get all active sessions
  async getActiveSessions(): Promise<GameSessionDB[]> {
    const result = await query<GameSessionRow>(
      `SELECT * FROM game_sessions WHERE status = 'active' ORDER BY last_updated DESC`
    );
    return result.rows.map(this.mapToGameSession);
  }

  // Clean up abandoned sessions (not updated in X hours)
  async cleanupAbandonedSessions(hoursInactive: number): Promise<number> {
    const result = await query(
      `UPDATE game_sessions
       SET status = 'abandoned'
       WHERE status = 'active'
       AND last_updated < NOW() - INTERVAL '${hoursInactive} hours'`
    );
    return result.rowCount ?? 0;
  }

  // Helper: Map database row to GameSessionDB
  private mapToGameSession(row: GameSessionRow): GameSessionDB {
    return {
      gameId: row.game_id,
      settingsId: row.settings_id,
      gameMode: row.game_mode as GameMode,
      currentWave: row.current_wave,
      wavesCompleted: row.waves_completed,
      coins: row.coins,
      lives: row.lives,
      towers: typeof row.towers === 'string' ? JSON.parse(row.towers) : row.towers,
      enemiesKilled: row.enemies_killed,
      coinsEarned: row.coins_earned,
      coinsSpent: row.coins_spent,
      damageDealt: row.damage_dealt,
      startedAt: row.started_at,
      lastUpdated: row.last_updated,
      status: row.status as SessionStatus,
    };
  }
}
