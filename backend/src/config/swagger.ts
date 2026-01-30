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
    ],
    components: {
      schemas: {
        TowerDefinition: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'basic' },
            name: { type: 'string', example: 'Basic Tower' },
            color: { type: 'string', example: '#607D8B' },
            description: { type: 'string', example: 'Balanced tower for general defense' },
          },
        },
        TowerLevel: {
          type: 'object',
          properties: {
            towerType: { type: 'string', example: 'basic' },
            level: { type: 'number', example: 1 },
            cost: { type: 'number', example: 50 },
            damage: { type: 'number', example: 20 },
            range: { type: 'number', example: 120 },
            fireRate: { type: 'number', example: 1.0 },
          },
        },
        TowerDefinitionWithLevels: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'basic' },
            name: { type: 'string', example: 'Basic Tower' },
            color: { type: 'string', example: '#607D8B' },
            description: { type: 'string', example: 'Balanced tower for general defense' },
            maxLevel: { type: 'number', example: 5 },
            levels: {
              type: 'array',
              items: { $ref: '#/components/schemas/TowerLevel' },
            },
          },
        },
        TowerStats: {
          type: 'object',
          properties: {
            cost: { type: 'number', example: 50 },
            damage: { type: 'number', example: 20 },
            range: { type: 'number', example: 120 },
            fireRate: { type: 'number', example: 1.0 },
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
          required: ['cost', 'damage', 'range', 'fireRate'],
          properties: {
            cost: { type: 'number', example: 75 },
            damage: { type: 'number', example: 30 },
            range: { type: 'number', example: 135 },
            fireRate: { type: 'number', example: 1.1 },
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
