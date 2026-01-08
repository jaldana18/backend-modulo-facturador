import { AppDataSource } from '../config/database';
import { logger } from '../config/logger';

/**
 * Clean company-specific catalog data before creating global records
 */
const cleanCatalogData = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    logger.info('🧹 Cleaning company-specific catalog data...');

    // Delete company-specific units (products should update to use global units)
    await AppDataSource.query(`
      DELETE FROM unit_of_measures WHERE company_id IS NOT NULL
    `);
    logger.info(`✅ Deleted company-specific units`);

    // Delete company-specific categories
    await AppDataSource.query(`
      DELETE FROM categories WHERE company_id IS NOT NULL
    `);
    logger.info(`✅ Deleted company-specific categories`);

    logger.info('🎉 Cleanup completed successfully!');
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Cleanup failed:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
};

cleanCatalogData();
