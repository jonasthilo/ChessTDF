import { StatisticsRepository } from '../database/repositories/StatisticsRepository';
import { GameStatistics, StatisticsSummary, GameOutcome, GameMode } from '../types';

/**
 * StatisticsService
 * Manages game statistics tracking and analytics
 */
export class StatisticsService {
  private statsRepo: StatisticsRepository;

  constructor() {
    this.statsRepo = new StatisticsRepository();
  }

  /**
   * Record a completed game's statistics
   */
  async recordGameStatistics(
    stats: Omit<GameStatistics, 'id' | 'createdAt'>
  ): Promise<GameStatistics> {
    // Validate statistics data
    this.validateStatistics(stats);

    return await this.statsRepo.createStatistics(stats);
  }

  /**
   * Get all statistics with pagination
   */
  async getAllStatistics(limit = 100, offset = 0): Promise<GameStatistics[]> {
    return await this.statsRepo.getAllStatistics(limit, offset);
  }

  /**
   * Get statistics for a specific game
   */
  async getGameStatistics(gameId: string): Promise<GameStatistics | null> {
    return await this.statsRepo.getStatisticsByGameId(gameId);
  }

  /**
   * Get aggregated statistics summary
   */
  async getStatisticsSummary(): Promise<StatisticsSummary> {
    return await this.statsRepo.getStatisticsSummary();
  }

  /**
   * Get statistics filtered by outcome
   */
  async getStatisticsByOutcome(outcome: GameOutcome, limit = 50): Promise<GameStatistics[]> {
    return await this.statsRepo.getStatisticsByOutcome(outcome, limit);
  }

  /**
   * Get statistics filtered by game mode
   */
  async getStatisticsByGameMode(gameMode: GameMode, limit = 50): Promise<GameStatistics[]> {
    return await this.statsRepo.getStatisticsByGameMode(gameMode, limit);
  }

  /**
   * Get top scores (highest waves in endless mode)
   */
  async getTopScores(limit = 10): Promise<GameStatistics[]> {
    return await this.statsRepo.getTopScores(limit);
  }

  /**
   * Get recent games
   */
  async getRecentGames(limit = 20): Promise<GameStatistics[]> {
    return await this.statsRepo.getRecentGames(limit);
  }

  /**
   * Calculate statistics for a specific time period
   */
  async getStatisticsForPeriod(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalGames: number;
    wins: number;
    losses: number;
    avgWave: number;
  }> {
    const allStats = await this.getAllStatistics(1000, 0);

    const periodStats = allStats.filter(
      (stat) => stat.timestamp >= startDate && stat.timestamp <= endDate
    );

    const totalGames = periodStats.length;
    const wins = periodStats.filter((s) => s.outcome === 'win').length;
    const losses = totalGames - wins;
    const avgWave =
      totalGames > 0 ? periodStats.reduce((sum, s) => sum + s.finalWave, 0) / totalGames : 0;

    return {
      totalGames,
      wins,
      losses,
      avgWave,
    };
  }

  /**
   * Cleanup old statistics (e.g., older than 90 days)
   */
  async cleanupOldStatistics(daysOld: number): Promise<number> {
    if (daysOld < 30) {
      throw new Error('Cannot delete statistics newer than 30 days');
    }
    return await this.statsRepo.deleteOldStatistics(daysOld);
  }

  /**
   * Validate statistics data
   */
  private validateStatistics(stats: Partial<GameStatistics>): void {
    if (stats.duration !== undefined && stats.duration < 0) {
      throw new Error('Duration cannot be negative');
    }

    if (stats.finalWave !== undefined && stats.finalWave < 0) {
      throw new Error('Final wave cannot be negative');
    }

    if (stats.wavesCompleted !== undefined && stats.wavesCompleted < 0) {
      throw new Error('Waves completed cannot be negative');
    }

    if (stats.enemiesKilledTotal !== undefined && stats.enemiesKilledTotal < 0) {
      throw new Error('Enemies killed cannot be negative');
    }

    if (stats.towersBuiltTotal !== undefined && stats.towersBuiltTotal < 0) {
      throw new Error('Towers built cannot be negative');
    }

    if (stats.coinsEarned !== undefined && stats.coinsEarned < 0) {
      throw new Error('Coins earned cannot be negative');
    }

    if (stats.coinsSpent !== undefined && stats.coinsSpent < 0) {
      throw new Error('Coins spent cannot be negative');
    }

    if (stats.damageDealt !== undefined && stats.damageDealt < 0) {
      throw new Error('Damage dealt cannot be negative');
    }
  }
}
