import { logger } from '../config/logger';
import { seedCatalogData } from './catalog-data.seed';
import { seedPaymentMethods } from './payment-methods.seed';
import { seedInitialData } from './initial-data.seed';
import { AppDataSource } from '../config/database';

/**
 * Run all seeds in correct order
 */
export const runAllSeeds = async () => {
  try {
    logger.info('🚀 Starting database seeding...');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('✅ Database connection initialized');
    }

    // 1. Seed catalog data (categories and units) - GLOBAL
    await seedCatalogData();

    // 2. Seed payment methods - GLOBAL
    await seedPaymentMethods();

    // 3. Seed initial company and users - DEMO DATA
    await seedInitialData();

    logger.info('🎉 All seeds completed successfully!');
    
    await AppDataSource.destroy();
    logger.info('✅ Database connection closed');
  } catch (error) {
    logger.error('❌ Error running seeds:', error);
    throw error;
  }
};

// Run all seeds if executed directly
if (require.main === module) {
  runAllSeeds()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    });
}
