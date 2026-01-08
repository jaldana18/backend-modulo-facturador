import { seedCatalogData } from '../seeds/catalog-data.seed';
import { AppDataSource } from '../config/database';
import { logger } from '../config/logger';

/**
 * Script to seed catalog data (categories and units of measure)
 * This will seed data for all existing companies
 * 
 * Usage:
 *   npm run seed:catalog
 *   npm run seed:catalog -- 1  (to seed only for company with ID 1)
 */
const runSeed = async () => {
  try {
    logger.info('🌱 Starting catalog seed script...');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('✅ Database connection established');
    }

    // Get company ID from command line argument if provided
    const companyIdArg = process.argv[2];
    const companyId = companyIdArg ? parseInt(companyIdArg) : undefined;

    if (companyId) {
      logger.info(`📦 Seeding catalog for company ID: ${companyId}`);
    } else {
      logger.info('📦 Seeding catalog for all companies');
    }

    // Run the seed
    await seedCatalogData(companyId);

    logger.info('✅ Catalog seed completed successfully!');
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Catalog seed failed:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
};

runSeed();
