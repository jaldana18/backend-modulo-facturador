import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { MigrationValidator } from '../utils/migration-validator.util';

/**
 * CLI script to validate database schema against entities
 *
 * Usage:
 *   npm run schema:validate           - Validate and show warnings
 *   npm run schema:validate -- --strict  - Validate and exit with error if issues found
 */
async function validateSchema() {
  const strict = process.argv.includes('--strict');

  console.log('🔍 Validating database schema...\n');

  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connection established\n');

    // Run validation
    const validator = new MigrationValidator(AppDataSource);
    const result = await validator.validate();

    // Format and display report
    const report = validator.formatReport(result);
    console.log(report);

    // Close connection
    await AppDataSource.destroy();

    // Exit with appropriate code
    if (strict && !result.valid) {
      console.error('\n❌ Schema validation failed in strict mode');
      process.exit(1);
    } else if (result.valid) {
      console.log('\n✅ Schema validation completed successfully');
      process.exit(0);
    } else {
      console.log('\n⚠️  Schema validation completed with warnings');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error during validation:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

// Run validation
validateSchema();
