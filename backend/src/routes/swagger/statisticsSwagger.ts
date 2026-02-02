// Swagger JSDoc definitions for Statistics routes
// This file is scanned by swagger-jsdoc and contains no executable code.

/**
 * @swagger
 * /api/statistics:
 *   get:
 *     summary: Get all statistics with pagination
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Paginated statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statistics:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GameStatistics'
 *                 total:
 *                   type: number
 *                   example: 42
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Record new game statistics
 *     tags: [Statistics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GameStatistics'
 *     responses:
 *       201:
 *         description: Statistics recorded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GameStatistics'
 *       400:
 *         description: Missing required fields or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Cleanup old statistics (admin)
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: olderThanDays
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 30
 *         description: Delete statistics older than this many days (minimum 30)
 *     responses:
 *       200:
 *         description: Statistics cleaned up
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Deleted 5 old statistics
 *                 deletedCount:
 *                   type: number
 *                   example: 5
 *       400:
 *         description: Invalid days parameter (must be at least 30)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/statistics/summary:
 *   get:
 *     summary: Get aggregated statistics summary
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Statistics summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatisticsSummary'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/statistics/top-scores:
 *   get:
 *     summary: Get top scores (highest waves in endless mode)
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top scores to return
 *     responses:
 *       200:
 *         description: Top scores
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GameStatistics'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/statistics/recent:
 *   get:
 *     summary: Get recent games
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of recent games to return
 *     responses:
 *       200:
 *         description: Recent games
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GameStatistics'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/statistics/period:
 *   get:
 *     summary: Get statistics for a specific time period
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for the period
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for the period
 *     responses:
 *       200:
 *         description: Period statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalGames:
 *                   type: number
 *                 wins:
 *                   type: number
 *                 losses:
 *                   type: number
 *                 avgWave:
 *                   type: number
 *       400:
 *         description: Missing or invalid date parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/statistics/game/{gameId}:
 *   get:
 *     summary: Get statistics for a specific game
 *     tags: [Statistics]
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Game session ID
 *     responses:
 *       200:
 *         description: Game statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GameStatistics'
 *       404:
 *         description: Statistics not found for this game
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/statistics/outcome/{outcome}:
 *   get:
 *     summary: Get statistics filtered by outcome
 *     tags: [Statistics]
 *     parameters:
 *       - in: path
 *         name: outcome
 *         required: true
 *         schema:
 *           type: string
 *           enum: [win, loss]
 *         description: Game outcome to filter by
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Statistics filtered by outcome
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GameStatistics'
 *       400:
 *         description: Invalid outcome
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/statistics/mode/{gameMode}:
 *   get:
 *     summary: Get statistics filtered by game mode
 *     tags: [Statistics]
 *     parameters:
 *       - in: path
 *         name: gameMode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [10waves, 20waves, endless]
 *         description: Game mode to filter by
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Statistics filtered by game mode
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GameStatistics'
 *       400:
 *         description: Invalid game mode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

export {};
