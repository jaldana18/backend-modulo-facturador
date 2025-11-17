import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryTransactions1736730000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create inventory_transactions table
    await queryRunner.query(`
      CREATE TABLE inventory_transactions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        company_id INT NOT NULL,
        product_id INT NOT NULL,
        user_id INT NOT NULL,
        type NVARCHAR(20) NOT NULL,
        reason NVARCHAR(50) NOT NULL,
        quantity DECIMAL(18,4) NOT NULL,
        previous_stock DECIMAL(18,4) NOT NULL,
        new_stock DECIMAL(18,4) NOT NULL,
        unit_cost DECIMAL(18,4),
        total_cost DECIMAL(18,4),
        reference NVARCHAR(100),
        location NVARCHAR(100),
        notes NVARCHAR(500),
        metadata NVARCHAR(MAX),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT fk_inventory_transactions_company
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        CONSTRAINT fk_inventory_transactions_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE NO ACTION,
        CONSTRAINT fk_inventory_transactions_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION
      );
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX idx_inventory_transactions_company_product
      ON inventory_transactions (company_id, product_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_transactions_company_type
      ON inventory_transactions (company_id, type);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_transactions_company_created
      ON inventory_transactions (company_id, created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_transactions_user
      ON inventory_transactions (user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_transactions_product
      ON inventory_transactions (product_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_transactions_created
      ON inventory_transactions (created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_transactions_created ON inventory_transactions;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_transactions_product ON inventory_transactions;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_transactions_user ON inventory_transactions;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_transactions_company_created ON inventory_transactions;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_transactions_company_type ON inventory_transactions;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_transactions_company_product ON inventory_transactions;`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS inventory_transactions;`);
  }
}
