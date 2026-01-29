import { query } from '../db';
import { GameStatistics, StatisticsSummary, GameOutcome, GameMode } from '../../types';

interface StatisticsRow {
  id: number;
  game_id: string;
  timestamp: Date;
  duration: number;
  outcome: string;
  game_mode: string;
  final_wave: number;
  waves_completed: number;
  enemies_killed_total: number;
  enemies_killed_by_type: string | Record<string, number>;
  towers_built_total: number;
  towers_built_by_type: string | Record<string, number>;
  coins_earned: number;
  coins_spent: number;
  damage_dealt: number;
  settings_id: number | null;
  created_at: Date;
}

interface SummaryRow {
  total_games: string;
  wins: string;
  losses: string;
  avg_wave_reached: string;
  avg_duration: string;
  total_enemies_killed: string;
  total_towers_built: string;
}

export class StatisticsRepository {
  // Create new game statistics entry
  async createStatistics(stats: Omit<GameStatistics, 'id' | 'createdAt'>): Promise<GameStatistics> {
    const result = await query<StatisticsRow>(
      `INSERT INTO game_statistics (
        game_id, timestamp, duration, outcome, game_mode, final_wave, waves_completed,
        enemies_killed_total, enemies_killed_by_type, towers_built_total, towers_built_by_type,
        coins_earned, coins_spent, damage_dealt, settings_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        stats.gameId,
        stats.timestamp,
        stats.duration,
        stats.outcome,
        stats.gameMode,
        stats.finalWave,
        stats.wavesCompleted,
        stats.enemiesKilledTotal,
        JSON.stringify(stats.enemiesKilledByType),
        stats.towersBuiltTotal,
        JSON.stringify(stats.towersBuiltByType),
        stats.coinsEarned,
        stats.coinsSpent,
        stats.damageDealt,
        stats.settingsId || null,
      ]
    );
    return this.mapToStatistics(result.rows[0]!);
  }

  // Get all statistics (with pagination)
  async getAllStatistics(limit = 100, offset = 0): Promise<GameStatistics[]> {
    const result = await query<StatisticsRow>(
      `SELECT * FROM game_statistics ORDER BY timestamp DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows.map(this.mapToStatistics);
  }

  // Get statistics by game ID
  async getStatisticsByGameId(gameId: string): Promise<GameStatistics | null> {
    const result = await query<StatisticsRow>('SELECT * FROM game_statistics WHERE game_id = $1', [
      gameId,
    ]);
    if (result.rows.length === 0) return null;
    return this.mapToStatistics(result.rows[0]!);
  }

  // Get statistics summary (aggregated)
  async getStatisticsSummary(): Promise<StatisticsSummary> {
    const result = await query<SummaryRow>(`
      SELECT
        COUNT(*) as total_games,
        SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN outcome = 'loss' THEN 1 ELSE 0 END) as losses,
        AVG(final_wave) as avg_wave_reached,
        AVG(duration) as avg_duration,
        SUM(enemies_killed_total) as total_enemies_killed,
        SUM(towers_built_total) as total_towers_built
      FROM game_statistics
    `);

    const row = result.rows[0]!;
    const totalGames = parseInt(row.total_games) || 0;
    const wins = parseInt(row.wins) || 0;
    const losses = parseInt(row.losses) || 0;

    return {
      totalGames,
      wins,
      losses,
      winRate: totalGames > 0 ? (wins / totalGames) * 100 : 0,
      avgWaveReached: parseFloat(row.avg_wave_reached) || 0,
      avgDuration: parseFloat(row.avg_duration) || 0,
      totalEnemiesKilled: parseInt(row.total_enemies_killed) || 0,
      totalTowersBuilt: parseInt(row.total_towers_built) || 0,
    };
  }

  // Get statistics filtered by outcome
  async getStatisticsByOutcome(outcome: GameOutcome, limit = 50): Promise<GameStatistics[]> {
    const result = await query<StatisticsRow>(
      `SELECT * FROM game_statistics WHERE outcome = $1 ORDER BY timestamp DESC LIMIT $2`,
      [outcome, limit]
    );
    return result.rows.map(this.mapToStatistics);
  }

  // Get statistics filtered by game mode
  async getStatisticsByGameMode(gameMode: GameMode, limit = 50): Promise<GameStatistics[]> {
    const result = await query<StatisticsRow>(
      `SELECT * FROM game_statistics WHERE game_mode = $1 ORDER BY timestamp DESC LIMIT $2`,
      [gameMode, limit]
    );
    return result.rows.map(this.mapToStatistics);
  }

  // Get top scores (highest wave reached)
  async getTopScores(limit = 10): Promise<GameStatistics[]> {
    const result = await query<StatisticsRow>(
      `SELECT * FROM game_statistics
       ORDER BY final_wave DESC, enemies_killed_total DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(this.mapToStatistics);
  }

  // Get recent games
  async getRecentGames(limit = 20): Promise<GameStatistics[]> {
    const result = await query<StatisticsRow>(
      `SELECT * FROM game_statistics ORDER BY timestamp DESC LIMIT $1`,
      [limit]
    );
    return result.rows.map(this.mapToStatistics);
  }

  // Delete old statistics (cleanup - optional)
  async deleteOldStatistics(daysOld: number): Promise<number> {
    const result = await query(
      `DELETE FROM game_statistics WHERE timestamp < NOW() - INTERVAL '${daysOld} days'`
    );
    return result.rowCount ?? 0;
  }

  // Helper: Map database row to GameStatistics
  private mapToStatistics(row: StatisticsRow): GameStatistics {
    return {
      id: row.id,
      gameId: row.game_id,
      timestamp: row.timestamp,
      duration: row.duration,
      outcome: row.outcome as GameOutcome,
      gameMode: row.game_mode as GameMode,
      finalWave: row.final_wave,
      wavesCompleted: row.waves_completed,
      enemiesKilledTotal: row.enemies_killed_total,
      enemiesKilledByType:
        typeof row.enemies_killed_by_type === 'string'
          ? JSON.parse(row.enemies_killed_by_type)
          : row.enemies_killed_by_type,
      towersBuiltTotal: row.towers_built_total,
      towersBuiltByType:
        typeof row.towers_built_by_type === 'string'
          ? JSON.parse(row.towers_built_by_type)
          : row.towers_built_by_type,
      coinsEarned: row.coins_earned,
      coinsSpent: row.coins_spent,
      damageDealt: row.damage_dealt,
      settingsId: row.settings_id,
      createdAt: row.created_at,
    };
  }
}
