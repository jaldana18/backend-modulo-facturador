import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBatchAllocations1736770000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create batch_allocations table
    await queryRunner.query(`
      CREATE TABLE batch_allocations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        batch_id INT NOT NULL,
        transaction_id INT NOT NULL,

        -- Future integration references
        sales_order_id INT NULL,
        invoice_id INT NULL,
        invoice_line_id INT NULL,

        -- Quantities and costs
        quantity DECIMAL(18,4) NOT NULL,
        unit_cost DECIMAL(18,4) NOT NULL,
        total_cost DECIMAL(18,4) NOT NULL,

        -- Audit fields
        user_id INT NOT NULL,
        notes NVARCHAR(500) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        -- Foreign keys
        CONSTRAINT fk_batch_allocations_batch
          FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE NO ACTION,
        CONSTRAINT fk_batch_allocations_transaction
          FOREIGN KEY (transaction_id) REFERENCES inventory_transactions(id) ON DELETE NO ACTION,
        CONSTRAINT fk_batch_allocations_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION,

        -- Constraints
        CONSTRAINT chk_batch_allocations_quantity
          CHECK (quantity > 0),
        CONSTRAINT chk_batch_allocations_costs
          CHECK (unit_cost >= 0 AND total_cost >= 0)
      );
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX idx_batch_allocations_batch
      ON batch_allocations (batch_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_batch_allocations_transaction
      ON batch_allocations (transaction_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_batch_allocations_sales_order
      ON batch_allocations (sales_order_id)
      WHERE sales_order_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_batch_allocations_invoice
      ON batch_allocations (invoice_id)
      WHERE invoice_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_batch_allocations_created
      ON batch_allocations (created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_batch_allocations_user
      ON batch_allocations (user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_batch_allocations_user ON batch_allocations;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_batch_allocations_created ON batch_allocations;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_batch_allocations_invoice ON batch_allocations;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_batch_allocations_sales_order ON batch_allocations;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_batch_allocations_transaction ON batch_allocations;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_batch_allocations_batch ON batch_allocations;`);

    // Drop table
    await queryRunner.query(`DROP TABLE batch_allocations;`);
  }
}
