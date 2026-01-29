import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import gameRoutes from './routes/gameRoutes';
import configRoutes from './routes/configRoutes';
import statisticsRoutes from './routes/statisticsRoutes';
import { swaggerSpec } from './config/swagger';
import { testConnection } from './database/db';

const app = express();
const PORT = process.env['PORT'] || 3001;

// Middleware
app.use(cors()); // Enable CORS for frontend
app.use(express.json()); // Parse JSON request bodies

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Swagger UI
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Chess TDF API Documentation',
  })
);

// Swagger JSON endpoint
app.get('/api-docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns server and database health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded]
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [connected, disconnected]
 *                         latency:
 *                           type: number
 *                           description: Database query latency in milliseconds
 *       503:
 *         description: Service unavailable (database down)
 */
app.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const dbConnected = await testConnection();
    const dbLatency = Date.now() - startTime;

    const response = {
      status: dbConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbConnected ? 'connected' : 'disconnected',
          latency: dbLatency,
        },
      },
    };

    res.status(dbConnected ? 200 : 503).json(response);
  } catch (_error) {
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: 'disconnected',
          latency: null,
        },
      },
    });
  }
});

// API Routes
app.use('/api/game', gameRoutes);
app.use('/api/config', configRoutes);
app.use('/api/statistics', statisticsRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, async () => {
  console.log('Chess Tower Defense Server');
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Docs: http://localhost:${PORT}/api-docs`);

  // Test database connection
  console.log('\nTesting database connection...');
  const dbConnected = await testConnection();
  if (dbConnected) {
    console.log('Database connected successfully');
  } else {
    console.error('Database connection failed');
  }
});

export default app;
