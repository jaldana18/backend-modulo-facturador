import { DataSource } from 'typeorm';
import { logger } from '../config/logger';
import { config } from '../config/environment';

export interface MigrationStatus {
  hasPendingMigrations: boolean;
  pendingMigrations: string[];
  executedMigrations: string[];
  totalPending: number;
}

export interface MigrationResult {
  success: boolean;
  executed: string[];
  failed?: string;
  error?: Error;
}

/**
 * Auto Migration Manager
 * Handles automatic detection and execution of pending migrations
 */
export class AutoMigrationManager {
  constructor(private dataSource: DataSource) {}

  /**
   * Check for pending migrations
   */
  async checkPendingMigrations(): Promise<MigrationStatus> {
    try {
      const pendingMigrations = await this.dataSource.showMigrations();
      const executedMigrations = await this.dataSource.query(
        `SELECT name FROM migrations ORDER BY timestamp ASC`
      ).catch(() => [] as any[]); // Table might not exist yet

      const executedNames = new Set(
        executedMigrations.map((m: any) => m.name as string)
      );

      const allMigrations = this.dataSource.migrations
        .map((m) => m.name)
        .filter((name): name is string => name !== undefined);
      const pending = allMigrations.filter((name) => !executedNames.has(name));

      return {
        hasPendingMigrations: pendingMigrations,
        pendingMigrations: pending,
        executedMigrations: Array.from(executedNames) as string[],
        totalPending: pending.length,
      };
    } catch (error) {
      logger.error('Error checking pending migrations', {
        type: 'migration_check_error',
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  /**
   * Run pending migrations automatically
   * @param force - Force execution even in production (use with caution)
   */
  async runPendingMigrations(force: boolean = false): Promise<MigrationResult> {
    const isProduction = config.nodeEnv === 'production';
    const isDevelopment = config.nodeEnv === 'development';

    try {
      // Check for pending migrations first
      const status = await this.checkPendingMigrations();

      if (!status.hasPendingMigrations) {
        logger.info('✅ No pending migrations to run', {
          type: 'migration_status',
          totalExecuted: status.executedMigrations.length,
        });
        return {
          success: true,
          executed: [],
        };
      }

      // Production safety check
      if (isProduction && !force) {
        const message =
          '⚠️ Pending migrations detected in PRODUCTION. Automatic execution is disabled for safety.';
        logger.warn(message, {
          type: 'migration_production_warning',
          pendingCount: status.totalPending,
          pendingMigrations: status.pendingMigrations,
        });
        console.warn('\n' + message);
        console.warn('Pending migrations:');
        status.pendingMigrations.forEach((m) => console.warn(`  - ${m}`));
        console.warn('\nTo run migrations manually:');
        console.warn('  npm run migration:run\n');

        return {
          success: false,
          executed: [],
          failed:
            'Production migrations require manual execution or force flag',
        };
      }

      // Development or forced execution
      logger.info(`🔄 Running ${status.totalPending} pending migrations...`, {
        type: 'migration_start',
        environment: config.nodeEnv,
        pendingMigrations: status.pendingMigrations,
        forced: force,
      });

      console.log(
        `\n🔄 Running ${status.totalPending} pending migrations...`
      );
      status.pendingMigrations.forEach((m) => console.log(`  - ${m}`));

      // Execute migrations
      const executedMigrations = await this.dataSource.runMigrations({
        transaction: 'all', // Run all migrations in a single transaction
      });

      const executedNames = executedMigrations.map((m) => m.name);

      logger.info('✅ Migrations executed successfully', {
        type: 'migration_success',
        count: executedMigrations.length,
        migrations: executedNames,
      });

      console.log(`\n✅ Successfully executed ${executedNames.length} migrations`);
      executedNames.forEach((m) => console.log(`  ✓ ${m}`));
      console.log('');

      return {
        success: true,
        executed: executedNames,
      };
    } catch (error) {
      const err = error as Error;
      logger.error('❌ Migration execution failed', {
        type: 'migration_error',
        error: err.message,
        stack: err.stack,
      });

      console.error('\n❌ Migration execution failed');
      console.error(`Error: ${err.message}\n`);

      return {
        success: false,
        executed: [],
        failed: err.message,
        error: err,
      };
    }
  }

  /**
   * Get migration history
   */
  async getMigrationHistory(): Promise<any[]> {
    try {
      return await this.dataSource.query(
        `SELECT * FROM migrations ORDER BY timestamp ASC`
      );
    } catch (error) {
      logger.warn('Could not retrieve migration history', {
        type: 'migration_history_error',
        error: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * Validate migrations table exists
   */
  async validateMigrationsTable(): Promise<boolean> {
    try {
      await this.dataSource.query(
        `SELECT TOP 1 * FROM migrations`
      );
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Helper function to run auto migrations
 */
export async function runAutoMigrations(
  dataSource: DataSource,
  force: boolean = false
): Promise<MigrationResult> {
  const manager = new AutoMigrationManager(dataSource);
  return await manager.runPendingMigrations(force);
}

/**
 * Helper function to check migration status
 */
export async function checkMigrationStatus(
  dataSource: DataSource
): Promise<MigrationStatus> {
  const manager = new AutoMigrationManager(dataSource);
  return await manager.checkPendingMigrations();
}
