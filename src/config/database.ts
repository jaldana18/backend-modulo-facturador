import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import path from 'path';
import { config } from './environment';
import { validateMigrations } from '../utils/migration-validator.util';
import { runAutoMigrations } from '../utils/auto-migration.util';

const dataSourceOptions: DataSourceOptions = {
  type: 'mssql',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: false, // NEVER use true in production
  logging: ['error'], // Only log errors, not queries
  entities: [path.join(__dirname, '../entities/**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../migrations/**/*{.ts,.js}')],
  subscribers: [],
  options: {
    encrypt: config.database.encrypt,
    trustServerCertificate: config.database.trustServerCertificate,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
  },
  extra: {
    // Connection timeout
    connectionTimeout: 30000,
    // Request timeout
    requestTimeout: 30000,
  },
};

const AppDataSource = new DataSource(dataSourceOptions);

/**
 * Initialize database connection
 */
export const initializeDatabase = async (options?: {
  validateSchema?: boolean;
  strictValidation?: boolean;
  runMigrations?: boolean;
}): Promise<void> => {
  const {
    validateSchema = true,
    strictValidation = false,
    runMigrations = config.migrations.autoRun
  } = options || {};

  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Run pending migrations automatically if enabled
    if (runMigrations) {
      const result = await runAutoMigrations(
        AppDataSource,
        config.migrations.forceInProduction
      );

      if (!result.success && config.nodeEnv === 'production') {
        console.warn('⚠️ Migrations skipped in production. Run manually: npm run migration:run');
      }
    }

    // Validate schema if enabled
    if (validateSchema) {
      await validateMigrations(AppDataSource, strictValidation);
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

/**
 * Close database connection
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Database connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
};

// Export as named and default for compatibility
export { AppDataSource };
export default AppDataSource;
