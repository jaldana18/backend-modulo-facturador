import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWarehouseToInventoryTransactions1736750000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add warehouse_id column
    await queryRunner.query(`
      ALTER TABLE inventory_transactions
      ADD warehouse_id INT NULL;
    `);

    // Add foreign key
    await queryRunner.query(`
      ALTER TABLE inventory_transactions
      ADD CONSTRAINT fk_inventory_transactions_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE NO ACTION;
    `);

    // Create index
    await queryRunner.query(`
      CREATE INDEX idx_inventory_transactions_warehouse
      ON inventory_transactions (warehouse_id);
    `);

    // Create composite index for company + warehouse + product
    await queryRunner.query(`
      CREATE INDEX idx_inventory_transactions_company_warehouse_product
      ON inventory_transactions (company_id, warehouse_id, product_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_transactions_company_warehouse_product ON inventory_transactions;
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_transactions_warehouse ON inventory_transactions;
    `);

    // Drop foreign key
    await queryRunner.query(`
      ALTER TABLE inventory_transactions
      DROP CONSTRAINT IF EXISTS fk_inventory_transactions_warehouse;
    `);

    // Drop column
    await queryRunner.query(`
      ALTER TABLE inventory_transactions
      DROP COLUMN IF EXISTS warehouse_id;
    `);
  }
}
