import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowNullCompanyIdInPaymentMethods1732996900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Allow NULL in company_id for global payment methods
    await queryRunner.query(`
      ALTER TABLE payment_methods 
      ALTER COLUMN company_id INT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to NOT NULL
    await queryRunner.query(`
      ALTER TABLE payment_methods 
      ALTER COLUMN company_id INT NOT NULL
    `);
  }
}
