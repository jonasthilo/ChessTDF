// Swagger JSDoc definitions for Game routes
// This file is scanned by swagger-jsdoc and contains no executable code.

/**
 * @swagger
 * /api/game/start:
 *   post:
 *     summary: Start a new game session
 *     tags: [Game]
 *     responses:
 *       201:
 *         description: Game created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StartGameResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/game/config:
 *   get:
 *     summary: Get game configuration (tower and enemy definitions)
 *     tags: [Game]
 *     responses:
 *       200:
 *         description: Game configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GameConfigResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/game/{gameId}/state:
 *   get:
 *     summary: Get current game state
 *     tags: [Game]
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The game session ID
 *     responses:
 *       200:
 *         description: Game state retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GameStateResponse'
 *       404:
 *         description: Game not found
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
 * /api/game/{gameId}/tower:
 *   post:
 *     summary: Build a tower at specified grid position
 *     tags: [Tower]
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The game session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BuildTowerRequest'
 *     responses:
 *       201:
 *         description: Tower built successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BuildTowerResponse'
 *       400:
 *         description: Invalid request (insufficient coins, invalid position, etc.)
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
 * /api/game/{gameId}/tower/{towerId}/upgrade:
 *   post:
 *     summary: Upgrade a tower to the next level
 *     tags: [Tower]
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The game session ID
 *       - in: path
 *         name: towerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The tower ID to upgrade
 *     responses:
 *       200:
 *         description: Tower upgraded successfully
 *       400:
 *         description: Invalid request (insufficient coins, max level, etc.)
 *       404:
 *         description: Game or tower not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/game/{gameId}/tower/{towerId}:
 *   delete:
 *     summary: Sell a tower for a partial refund
 *     tags: [Tower]
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The game session ID
 *       - in: path
 *         name: towerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The tower ID to sell
 *     responses:
 *       200:
 *         description: Tower sold successfully
 *       404:
 *         description: Game or tower not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/game/{gameId}/wave:
 *   post:
 *     summary: Start the next wave
 *     tags: [Wave]
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The game session ID
 *     responses:
 *       200:
 *         description: Wave started successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StartWaveResponse'
 *       404:
 *         description: Game not found
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
 * /api/game/{gameId}/end:
 *   post:
 *     summary: End the game and submit final stats
 *     tags: [Game]
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The game session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EndGameRequest'
 *     responses:
 *       200:
 *         description: Game ended successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EndGameResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/game/{gameId}/coins:
 *   post:
 *     summary: Add coins to the game (when enemy dies)
 *     tags: [Game]
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The game session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Coins added successfully
 *       400:
 *         description: Invalid amount
 *       404:
 *         description: Game not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/game/{gameId}/life/lose:
 *   post:
 *     summary: Lose a life (when enemy reaches end)
 *     tags: [Game]
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The game session ID
 *     responses:
 *       200:
 *         description: Life lost successfully
 *       404:
 *         description: Game not found
 *       500:
 *         description: Server error
 */

export {};
