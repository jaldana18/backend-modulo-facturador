import 'express-async-errors';
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/environment';
import { AppDataSource } from './config/database';
import { requestLogger } from './middleware/requestLogger.middleware';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import { apiRateLimiter } from './middleware/rateLimiter.middleware';
import { swaggerSpec } from './config/swagger';
import routes from './routes';

/**
 * Create and configure Express application
 */
export const createApp = (): Application => {
  const app = express();

  // Enable trust proxy for correct client IP detection behind proxies (required for express-rate-limit)
  app.set('trust proxy', 1); // 1 if behind one proxy (e.g., nginx), or true for all

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable CSP for Swagger UI
    })
  );

  // CORS configuration (TEMPORAL: allow all origins, no CORS policy)
  app.use(cors());

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Serve static files for uploaded images
  const uploadsPath = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // Request logging
  app.use(requestLogger);

  // Rate limiting
  app.use(apiRateLimiter);

  // Attach DataSource to request for tenant context
  app.use((req: any, _res, next) => {
    req.dataSource = AppDataSource;
    next();
  });

  // Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Inventory API Documentation',
    })
  );

  // Swagger JSON endpoint
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        database: AppDataSource.isInitialized ? 'connected' : 'disconnected',
      },
    });
  });

  // API routes
  app.use(`${config.api.prefix}/${config.api.version}`, routes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

export default createApp;
