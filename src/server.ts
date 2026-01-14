import 'reflect-metadata';
import { config } from './config/environment';
import { initializeDatabase, closeDatabase } from './config/database';
import { logger } from './config/logger';
import { createApp } from './app';

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase({
      validateSchema: config.validation.schemaOnStartup,
      strictValidation: config.validation.strictSchema,
    });

    // Create Express app
    const app = createApp();

    // Start listening
    const server = app.listen(config.port, () => {
      console.log(`\n🚀 Server ready on port ${config.port} [${config.nodeEnv}]`);
      console.log(`📖 API Docs: http://localhost:${config.port}/api-docs\n`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('✅ HTTP server closed');

        try {
          await closeDatabase();
          logger.info('✅ Database connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('⚠️ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
