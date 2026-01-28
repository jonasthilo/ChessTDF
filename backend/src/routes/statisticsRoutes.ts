import { Router } from 'express';
import { statisticsController } from '../controllers/StatisticsController';

const router = Router();

// GET /api/statistics - Get all statistics with pagination
router.get('/', (req, res) => statisticsController.getAllStatistics(req, res));

// GET /api/statistics/summary - Get aggregated summary
router.get('/summary', (req, res) => statisticsController.getStatisticsSummary(req, res));

// GET /api/statistics/top-scores - Get top scores
router.get('/top-scores', (req, res) => statisticsController.getTopScores(req, res));

// GET /api/statistics/recent - Get recent games
router.get('/recent', (req, res) => statisticsController.getRecentGames(req, res));

// GET /api/statistics/period - Get statistics for time period
router.get('/period', (req, res) => statisticsController.getStatisticsForPeriod(req, res));

// GET /api/statistics/game/:gameId - Get statistics for specific game
router.get('/game/:gameId', (req, res) => statisticsController.getGameStatistics(req, res));

// GET /api/statistics/outcome/:outcome - Get statistics by outcome
router.get('/outcome/:outcome', (req, res) => statisticsController.getStatisticsByOutcome(req, res));

// GET /api/statistics/mode/:gameMode - Get statistics by game mode
router.get('/mode/:gameMode', (req, res) => statisticsController.getStatisticsByGameMode(req, res));

// POST /api/statistics - Record new game statistics
router.post('/', (req, res) => statisticsController.recordStatistics(req, res));

// DELETE /api/statistics/cleanup/:days - Cleanup old statistics (admin)
router.delete('/cleanup/:days', (req, res) => statisticsController.cleanupOldStatistics(req, res));

export default router;
