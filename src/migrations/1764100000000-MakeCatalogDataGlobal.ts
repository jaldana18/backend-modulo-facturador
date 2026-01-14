import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeCatalogDataGlobal1764100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make company_id nullable in categories table
    await queryRunner.query(`
      ALTER TABLE categories
      ALTER COLUMN company_id INT NULL
    `);

    // Make company_id nullable in unit_of_measures table
    await queryRunner.query(`
      ALTER TABLE unit_of_measures
      ALTER COLUMN company_id INT NULL
    `);

    // Update indexes to allow NULL company_id
    // Drop existing unique index on categories
    await queryRunner.query(`
      DROP INDEX IDX_unit_of_measures_company_code ON unit_of_measures
    `);

    // Recreate index allowing NULL (unique constraint only on non-null company_id)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IDX_unit_of_measures_code_global 
      ON unit_of_measures(code) 
      WHERE company_id IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IDX_unit_of_measures_company_code 
      ON unit_of_measures(company_id, code) 
      WHERE company_id IS NOT NULL
    `);

    console.log('✅ Categories and units of measure can now be global (company_id nullable)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert indexes
    await queryRunner.query(`
      DROP INDEX IDX_unit_of_measures_company_code ON unit_of_measures
    `);

    await queryRunner.query(`
      DROP INDEX IDX_unit_of_measures_code_global ON unit_of_measures
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IDX_unit_of_measures_company_code 
      ON unit_of_measures(company_id, code)
    `);

    // Make company_id NOT NULL again (this will fail if there are global records)
    await queryRunner.query(`
      ALTER TABLE unit_of_measures
      ALTER COLUMN company_id INT NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE categories
      ALTER COLUMN company_id INT NOT NULL
    `);
  }
}
