import { Request, Response } from 'express';
import { statisticsService } from '../services/StatisticsService';
import { GameStatistics } from '../types';
import { parseIntParam } from './helpers';

/**
 * StatisticsController
 * Handles HTTP requests for game statistics
 */
export class StatisticsController {
  /**
   * GET /api/statistics
   * Get all statistics with pagination
   */
  async getAllStatistics(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query['limit'] as string) || 100;
      const offset = parseInt(req.query['offset'] as string) || 0;

      const statistics = await statisticsService.getAllStatistics(limit, offset);
      res.status(200).json({ statistics, total: statistics.length });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }

  /**
   * GET /api/statistics/summary
   * Get aggregated statistics summary
   */
  async getStatisticsSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await statisticsService.getStatisticsSummary();
      res.status(200).json(summary);
    } catch (error) {
      console.error('Error fetching statistics summary:', error);
      res.status(500).json({ error: 'Failed to fetch statistics summary' });
    }
  }

  /**
   * GET /api/statistics/game/:gameId
   * Get statistics for a specific game
   */
  async getGameStatistics(req: Request, res: Response): Promise<void> {
    try {
      const gameId = (req.params['gameId'] ?? '') as string;

      const statistics = await statisticsService.getGameStatistics(gameId);

      if (!statistics) {
        res.status(404).json({ error: 'Statistics not found for this game' });
        return;
      }

      res.status(200).json(statistics);
    } catch (error) {
      console.error('Error fetching game statistics:', error);
      res.status(500).json({ error: 'Failed to fetch game statistics' });
    }
  }

  /**
   * GET /api/statistics/outcome/:outcome
   * Get statistics filtered by outcome (win/loss)
   */
  async getStatisticsByOutcome(req: Request, res: Response): Promise<void> {
    try {
      const outcome = (req.params['outcome'] ?? '') as string;

      if (outcome !== 'win' && outcome !== 'loss') {
        res.status(400).json({ error: 'Invalid outcome. Must be win or loss' });
        return;
      }

      const limit = parseInt(req.query['limit'] as string) || 50;
      const statistics = await statisticsService.getStatisticsByOutcome(outcome, limit);

      res.status(200).json(statistics);
    } catch (error) {
      console.error('Error fetching statistics by outcome:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }

  /**
   * GET /api/statistics/mode/:gameMode
   * Get statistics filtered by game mode
   */
  async getStatisticsByGameMode(req: Request, res: Response): Promise<void> {
    try {
      const gameMode = (req.params['gameMode'] ?? '') as string;

      if (gameMode !== '10waves' && gameMode !== '20waves' && gameMode !== 'endless') {
        res.status(400).json({ error: 'Invalid game mode. Must be 10waves, 20waves, or endless' });
        return;
      }

      const limit = parseInt(req.query['limit'] as string) || 50;
      const statistics = await statisticsService.getStatisticsByGameMode(gameMode, limit);

      res.status(200).json(statistics);
    } catch (error) {
      console.error('Error fetching statistics by game mode:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }

  /**
   * GET /api/statistics/top-scores
   * Get top scores (highest waves in endless mode)
   */
  async getTopScores(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query['limit'] as string) || 10;
      const topScores = await statisticsService.getTopScores(limit);

      res.status(200).json(topScores);
    } catch (error) {
      console.error('Error fetching top scores:', error);
      res.status(500).json({ error: 'Failed to fetch top scores' });
    }
  }

  /**
   * GET /api/statistics/recent
   * Get recent games
   */
  async getRecentGames(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query['limit'] as string) || 20;
      const recentGames = await statisticsService.getRecentGames(limit);

      res.status(200).json(recentGames);
    } catch (error) {
      console.error('Error fetching recent games:', error);
      res.status(500).json({ error: 'Failed to fetch recent games' });
    }
  }

  /**
   * POST /api/statistics
   * Record new game statistics
   */
  async recordStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statsData: Omit<GameStatistics, 'id' | 'createdAt'> = req.body;

      // Validate required fields
      if (!statsData.gameId || !statsData.outcome || !statsData.gameMode) {
        res.status(400).json({ error: 'Missing required fields: gameId, outcome, gameMode' });
        return;
      }

      const statistics = await statisticsService.recordGameStatistics(statsData);

      res.status(201).json(statistics);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error recording statistics:', error);
        res.status(500).json({ error: 'Failed to record statistics' });
      }
    }
  }

  /**
   * GET /api/statistics/period
   * Get statistics for a specific time period
   */
  async getStatisticsForPeriod(req: Request, res: Response): Promise<void> {
    try {
      const startDateStr = req.query['startDate'] as string;
      const endDateStr = req.query['endDate'] as string;

      if (!startDateStr || !endDateStr) {
        res.status(400).json({ error: 'Missing required query parameters: startDate, endDate' });
        return;
      }

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({ error: 'Invalid date format' });
        return;
      }

      const periodStats = await statisticsService.getStatisticsForPeriod(startDate, endDate);

      res.status(200).json(periodStats);
    } catch (error) {
      console.error('Error fetching period statistics:', error);
      res.status(500).json({ error: 'Failed to fetch period statistics' });
    }
  }

  /**
   * DELETE /api/statistics?olderThanDays=90
   * Cleanup old statistics (admin endpoint)
   */
  async cleanupOldStatistics(req: Request, res: Response): Promise<void> {
    try {
      const daysParam = req.query['olderThanDays'] as string | undefined;
      const days = parseIntParam(daysParam);

      if (isNaN(days) || days < 30) {
        res.status(400).json({ error: 'Invalid days parameter. Must be at least 30 days' });
        return;
      }

      const deletedCount = await statisticsService.cleanupOldStatistics(days);

      res.status(200).json({ message: `Deleted ${deletedCount} old statistics`, deletedCount });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error cleaning up statistics:', error);
        res.status(500).json({ error: 'Failed to cleanup statistics' });
      }
    }
  }
}

export const statisticsController = new StatisticsController();
