import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePaymentMethodsUniqueIndex1732997100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old unique index on company_id + code
    await queryRunner.query(`
      DROP INDEX idx_payment_methods_company_code ON payment_methods
    `);

    // Create new unique index on company_id + code + channel
    // This allows multiple payment methods with same code but different channels
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_payment_methods_company_code_channel 
      ON payment_methods(company_id, code, channel)
      WHERE channel IS NOT NULL
    `);

    // Create another unique index for NULL channels
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_payment_methods_company_code_null_channel 
      ON payment_methods(company_id, code)
      WHERE channel IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new indexes
    await queryRunner.query(`
      DROP INDEX idx_payment_methods_company_code_channel ON payment_methods
    `);
    
    await queryRunner.query(`
      DROP INDEX idx_payment_methods_company_code_null_channel ON payment_methods
    `);

    // Recreate old index
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_payment_methods_company_code 
      ON payment_methods(company_id, code)
    `);
  }
}
