import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chess Tower Defense API',
      version: '1.0.0',
      description: 'REST API for Chess-themed Tower Defense Game',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Game',
        description: 'Game lifecycle management',
      },
      {
        name: 'Tower',
        description: 'Tower placement and management',
      },
      {
        name: 'Wave',
        description: 'Enemy wave management',
      },
      {
        name: 'Config',
        description: 'Game configuration: towers, enemies, settings',
      },
      {
        name: 'Statistics',
        description: 'Game statistics and analytics',
      },
    ],
    components: {
      schemas: {
        TowerDefinition: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Morphy Tower' },
            color: { type: 'string', example: '#607D8B' },
            description: { type: 'string', example: 'The foundation of any defense' },
            maxLevel: { type: 'number', example: 5 },
            attackType: {
              type: 'string',
              enum: ['single', 'pierce', 'splash', 'chain', 'multi', 'aura'],
              example: 'single',
            },
            projectileType: {
              type: 'string',
              enum: ['homing', 'ballistic', 'lob'],
              example: 'homing',
            },
            defaultTargeting: {
              type: 'string',
              enum: ['first', 'last', 'nearest', 'strongest', 'weakest'],
              example: 'first',
            },
          },
        },
        TowerLevel: {
          type: 'object',
          properties: {
            towerId: { type: 'number', example: 1 },
            level: { type: 'number', example: 1 },
            cost: { type: 'number', example: 30 },
            damage: { type: 'number', example: 20 },
            range: { type: 'number', example: 120 },
            fireRate: { type: 'number', example: 1.0 },
            projectileSpeed: { type: 'number', example: 400 },
            splashRadius: { type: 'number', example: 0 },
            splashChance: { type: 'number', example: 0 },
            chainCount: { type: 'number', example: 0 },
            pierceCount: { type: 'number', example: 0 },
            targetCount: { type: 'number', example: 1 },
            statusEffect: {
              type: 'string',
              enum: ['none', 'slow', 'poison', 'armor_shred', 'mark'],
              example: 'none',
            },
            effectDuration: { type: 'number', example: 0 },
            effectStrength: { type: 'number', example: 0 },
            auraRadius: { type: 'number', example: 0 },
            auraEffect: {
              type: 'string',
              enum: ['none', 'damage_buff', 'speed_buff', 'range_buff'],
              example: 'none',
            },
            auraStrength: { type: 'number', example: 0 },
          },
        },
        TowerDefinitionWithLevels: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Morphy Tower' },
            color: { type: 'string', example: '#607D8B' },
            description: { type: 'string', example: 'The foundation of any defense' },
            maxLevel: { type: 'number', example: 5 },
            attackType: {
              type: 'string',
              enum: ['single', 'pierce', 'splash', 'chain', 'multi', 'aura'],
              example: 'single',
            },
            projectileType: {
              type: 'string',
              enum: ['homing', 'ballistic', 'lob'],
              example: 'homing',
            },
            defaultTargeting: {
              type: 'string',
              enum: ['first', 'last', 'nearest', 'strongest', 'weakest'],
              example: 'first',
            },
            levels: {
              type: 'array',
              items: { $ref: '#/components/schemas/TowerLevel' },
            },
          },
        },
        TowerStats: {
          type: 'object',
          properties: {
            cost: { type: 'number', example: 30 },
            damage: { type: 'number', example: 20 },
            range: { type: 'number', example: 120 },
            fireRate: { type: 'number', example: 1.0 },
            projectileSpeed: { type: 'number', example: 400 },
            splashRadius: { type: 'number', example: 0 },
            splashChance: { type: 'number', example: 0 },
            chainCount: { type: 'number', example: 0 },
            pierceCount: { type: 'number', example: 0 },
            targetCount: { type: 'number', example: 1 },
            statusEffect: {
              type: 'string',
              enum: ['none', 'slow', 'poison', 'armor_shred', 'mark'],
              example: 'none',
            },
            effectDuration: { type: 'number', example: 0 },
            effectStrength: { type: 'number', example: 0 },
            auraRadius: { type: 'number', example: 0 },
            auraEffect: {
              type: 'string',
              enum: ['none', 'damage_buff', 'speed_buff', 'range_buff'],
              example: 'none',
            },
            auraStrength: { type: 'number', example: 0 },
          },
        },
        EnemyDefinition: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'pawn' },
            name: { type: 'string', example: 'Pawn' },
            health: { type: 'number', example: 50 },
            speed: { type: 'number', example: 60 },
            reward: { type: 'number', example: 10 },
            color: { type: 'string', example: '#4CAF50' },
            size: { type: 'number', example: 20 },
          },
        },
        Tower: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', example: 'basic' },
            gridX: { type: 'number', example: 5 },
            gridY: { type: 'number', example: 3 },
            x: { type: 'number', example: 330 },
            y: { type: 'number', example: 210 },
            level: { type: 'number', example: 1 },
            stats: { $ref: '#/components/schemas/TowerStats' },
            lastFireTime: { type: 'number', example: 0 },
          },
        },
        EnemySpawnData: {
          type: 'object',
          properties: {
            type: { type: 'string', example: 'pawn' },
            spawnDelay: { type: 'number', example: 800 },
          },
        },
        StartGameResponse: {
          type: 'object',
          properties: {
            gameId: {
              type: 'string',
              format: 'uuid',
              example: '6fb3101c-f3f4-4da7-a8c8-6df383f5adc7',
            },
            initialCoins: { type: 'number', example: 200 },
            lives: { type: 'number', example: 10 },
          },
        },
        GameConfigResponse: {
          type: 'object',
          properties: {
            towers: {
              type: 'array',
              items: { $ref: '#/components/schemas/TowerDefinitionWithLevels' },
            },
            enemies: {
              type: 'array',
              items: { $ref: '#/components/schemas/EnemyDefinition' },
            },
          },
        },
        GameStateResponse: {
          type: 'object',
          properties: {
            coins: { type: 'number', example: 150 },
            lives: { type: 'number', example: 10 },
            wave: { type: 'number', example: 1 },
            towers: {
              type: 'array',
              items: { $ref: '#/components/schemas/Tower' },
            },
          },
        },
        BuildTowerRequest: {
          type: 'object',
          required: ['towerType', 'gridX', 'gridY'],
          properties: {
            towerType: { type: 'string', example: 'basic' },
            gridX: { type: 'number', example: 5 },
            gridY: { type: 'number', example: 3 },
          },
        },
        BuildTowerResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            tower: { $ref: '#/components/schemas/Tower' },
            remainingCoins: { type: 'number', example: 150 },
          },
        },
        UpgradeTowerResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            tower: { $ref: '#/components/schemas/Tower' },
            remainingCoins: { type: 'number', example: 100 },
          },
        },
        SellTowerResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            refundAmount: { type: 'number', example: 35 },
            remainingCoins: { type: 'number', example: 185 },
          },
        },
        StartWaveResponse: {
          type: 'object',
          properties: {
            waveNumber: { type: 'number', example: 1 },
            enemies: {
              type: 'array',
              items: { $ref: '#/components/schemas/EnemySpawnData' },
            },
            enemyHealthWaveMultiplier: { type: 'number', example: 0.1 },
            enemyRewardWaveMultiplier: { type: 'number', example: 0.05 },
          },
        },
        EndGameRequest: {
          type: 'object',
          required: ['finalWave', 'enemiesKilled'],
          properties: {
            finalWave: { type: 'number', example: 5 },
            enemiesKilled: { type: 'number', example: 42 },
          },
        },
        EndGameResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
          },
        },
        TowerLevelInput: {
          type: 'object',
          required: [
            'cost',
            'damage',
            'range',
            'fireRate',
            'projectileSpeed',
            'splashRadius',
            'splashChance',
            'chainCount',
            'pierceCount',
            'targetCount',
            'statusEffect',
            'effectDuration',
            'effectStrength',
            'auraRadius',
            'auraEffect',
            'auraStrength',
          ],
          properties: {
            cost: { type: 'number', example: 40 },
            damage: { type: 'number', example: 28 },
            range: { type: 'number', example: 120 },
            fireRate: { type: 'number', example: 1.1 },
            projectileSpeed: { type: 'number', example: 400 },
            splashRadius: { type: 'number', example: 0 },
            splashChance: { type: 'number', example: 0 },
            chainCount: { type: 'number', example: 0 },
            pierceCount: { type: 'number', example: 0 },
            targetCount: { type: 'number', example: 1 },
            statusEffect: {
              type: 'string',
              enum: ['none', 'slow', 'poison', 'armor_shred', 'mark'],
              example: 'none',
            },
            effectDuration: { type: 'number', example: 0 },
            effectStrength: { type: 'number', example: 0 },
            auraRadius: { type: 'number', example: 0 },
            auraEffect: {
              type: 'string',
              enum: ['none', 'damage_buff', 'speed_buff', 'range_buff'],
              example: 'none',
            },
            auraStrength: { type: 'number', example: 0 },
          },
        },
        GameSettings: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 2 },
            mode: { type: 'string', enum: ['easy', 'normal', 'hard', 'custom'], example: 'normal' },
            initialCoins: { type: 'number', example: 200 },
            initialLives: { type: 'number', example: 10 },
            towerCostMultiplier: { type: 'number', example: 1.0 },
            enemyHealthMultiplier: { type: 'number', example: 1.0 },
            enemySpeedMultiplier: { type: 'number', example: 1.0 },
            enemyRewardMultiplier: { type: 'number', example: 1.0 },
            enemyHealthWaveMultiplier: { type: 'number', example: 0.1 },
            enemyRewardWaveMultiplier: { type: 'number', example: 0.05 },
          },
        },
        GameStatistics: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            gameId: { type: 'string', format: 'uuid' },
            timestamp: { type: 'string', format: 'date-time' },
            duration: { type: 'number', example: 60000 },
            outcome: { type: 'string', enum: ['win', 'loss'], example: 'win' },
            gameMode: { type: 'string', enum: ['10waves', '20waves', 'endless'], example: '10waves' },
            finalWave: { type: 'number', example: 10 },
            wavesCompleted: { type: 'number', example: 10 },
            enemiesKilledTotal: { type: 'number', example: 100 },
            enemiesKilledByType: { type: 'object', example: { pawn: 50, knight: 50 } },
            towersBuiltTotal: { type: 'number', example: 5 },
            towersBuiltByType: { type: 'object', example: { basic: 3, sniper: 2 } },
            coinsEarned: { type: 'number', example: 1000 },
            coinsSpent: { type: 'number', example: 800 },
            damageDealt: { type: 'number', example: 5000 },
          },
        },
        StatisticsSummary: {
          type: 'object',
          properties: {
            totalGames: { type: 'number', example: 42 },
            wins: { type: 'number', example: 28 },
            losses: { type: 'number', example: 14 },
            winRate: { type: 'number', example: 66.7 },
            avgWavesCompleted: { type: 'number', example: 7.5 },
            avgDuration: { type: 'number', example: 45000 },
            totalEnemiesKilled: { type: 'number', example: 3500 },
            totalDamageDealt: { type: 'number', example: 150000 },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Error message' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/routes/swagger/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
