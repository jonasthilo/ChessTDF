// Swagger JSDoc definitions for Config routes
// This file is scanned by swagger-jsdoc and contains no executable code.

/**
 * @swagger
 * /api/config/towers:
 *   get:
 *     summary: Get tower definitions with levels
 *     description: Returns all tower definitions with their level configurations. Optionally filter by tower id.
 *     tags: [Config]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         required: false
 *         description: Tower ID to filter (e.g., 1, 2, 3)
 *     responses:
 *       200:
 *         description: Tower definitions with levels
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/TowerDefinitionWithLevels'
 *                 - $ref: '#/components/schemas/TowerDefinitionWithLevels'
 *       404:
 *         description: Tower not found (when id provided)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/config/towers/{id}:
 *   patch:
 *     summary: Update tower definition metadata
 *     description: Update tower metadata (name, description, color, maxLevel)
 *     tags: [Config]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tower ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               color:
 *                 type: string
 *               maxLevel:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *     responses:
 *       200:
 *         description: Updated tower definition
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TowerDefinitionWithLevels'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tower not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/config/towers/{towerId}/levels:
 *   get:
 *     summary: Get all levels for a tower ID
 *     tags: [Config]
 *     parameters:
 *       - in: path
 *         name: towerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tower ID
 *     responses:
 *       200:
 *         description: Array of tower levels
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TowerLevel'
 *       404:
 *         description: Tower levels not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/config/towers/{towerId}/levels/{level}:
 *   get:
 *     summary: Get specific level for a tower ID
 *     tags: [Config]
 *     parameters:
 *       - in: path
 *         name: towerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tower ID
 *       - in: path
 *         name: level
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Level number
 *     responses:
 *       200:
 *         description: Tower level data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TowerLevel'
 *       400:
 *         description: Invalid level parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tower level not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     summary: Create or update a tower level
 *     tags: [Config]
 *     parameters:
 *       - in: path
 *         name: towerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tower ID
 *       - in: path
 *         name: level
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Level number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TowerLevelInput'
 *     responses:
 *       200:
 *         description: Created/updated tower level
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TowerLevel'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Delete a tower level
 *     tags: [Config]
 *     parameters:
 *       - in: path
 *         name: towerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tower ID
 *       - in: path
 *         name: level
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Level number
 *     responses:
 *       200:
 *         description: Level deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Tower level not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/config/enemies:
 *   get:
 *     summary: Get all enemy definitions
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Array of enemy definitions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EnemyDefinition'
 */

/**
 * @swagger
 * /api/config/enemies/{id}:
 *   get:
 *     summary: Get specific enemy definition
 *     tags: [Config]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Enemy ID
 *     responses:
 *       200:
 *         description: Enemy definition
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EnemyDefinition'
 *       404:
 *         description: Enemy not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     summary: Update enemy definition
 *     tags: [Config]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Enemy ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EnemyDefinition'
 *     responses:
 *       200:
 *         description: Updated enemy definition
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EnemyDefinition'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Enemy not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/config/settings:
 *   get:
 *     summary: Get all settings presets
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Array of settings presets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GameSettings'
 *   post:
 *     summary: Create custom settings
 *     tags: [Config]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GameSettings'
 *     responses:
 *       201:
 *         description: Created settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GameSettings'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/config/settings/default:
 *   get:
 *     summary: Get default (normal) settings
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: Default settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GameSettings'
 *       404:
 *         description: Default settings not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/config/settings/{mode}:
 *   get:
 *     summary: Get settings by mode
 *     tags: [Config]
 *     parameters:
 *       - in: path
 *         name: mode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [easy, normal, hard, custom]
 *         description: Settings mode
 *     responses:
 *       200:
 *         description: Settings for mode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GameSettings'
 *       400:
 *         description: Invalid mode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Settings not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/config/settings/id/{id}:
 *   get:
 *     summary: Get settings by ID
 *     tags: [Config]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Settings ID
 *     responses:
 *       200:
 *         description: Settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GameSettings'
 *       400:
 *         description: Invalid ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Settings not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     summary: Update settings
 *     tags: [Config]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Settings ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GameSettings'
 *     responses:
 *       200:
 *         description: Updated settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GameSettings'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Settings not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

export {};
