import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryBatches1736760000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create inventory_batches table
    await queryRunner.query(`
      CREATE TABLE inventory_batches (
        id INT IDENTITY(1,1) PRIMARY KEY,
        company_id INT NOT NULL,
        product_id INT NOT NULL,
        warehouse_id INT NULL,
        batch_number NVARCHAR(100) NOT NULL,
        purchase_transaction_id INT NOT NULL,

        -- Quantities
        quantity_received DECIMAL(18,4) NOT NULL,
        quantity_available DECIMAL(18,4) NOT NULL,
        quantity_reserved DECIMAL(18,4) NOT NULL DEFAULT 0,
        quantity_allocated DECIMAL(18,4) NOT NULL DEFAULT 0,

        -- Costs
        unit_cost DECIMAL(18,4) NOT NULL,
        total_cost DECIMAL(18,4) NOT NULL,

        -- Additional information
        supplier_id INT NULL,
        purchase_date DATETIME2 NOT NULL,
        expiry_date DATETIME2 NULL,
        lot_number NVARCHAR(100) NULL,
        serial_numbers NVARCHAR(MAX) NULL,

        -- Status
        status NVARCHAR(20) NOT NULL DEFAULT 'active',
        notes NVARCHAR(500) NULL,
        metadata NVARCHAR(MAX) NULL,

        -- Audit fields
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        -- Foreign keys
        CONSTRAINT fk_inventory_batches_company
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        CONSTRAINT fk_inventory_batches_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE NO ACTION,
        CONSTRAINT fk_inventory_batches_warehouse
          FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE NO ACTION,
        CONSTRAINT fk_inventory_batches_transaction
          FOREIGN KEY (purchase_transaction_id) REFERENCES inventory_transactions(id) ON DELETE NO ACTION,

        -- Constraints
        CONSTRAINT chk_inventory_batches_status
          CHECK (status IN ('active', 'depleted', 'expired', 'blocked', 'reserved')),
        CONSTRAINT chk_inventory_batches_quantities
          CHECK (quantity_available >= 0 AND quantity_reserved >= 0 AND quantity_allocated >= 0),
        CONSTRAINT chk_inventory_batches_quantity_sum
          CHECK (quantity_available + quantity_reserved + quantity_allocated <= quantity_received)
      );
    `);

    // Create unique index for batch_number per company
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_inventory_batches_batch_number
      ON inventory_batches (company_id, batch_number);
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX idx_inventory_batches_company_product
      ON inventory_batches (company_id, product_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_batches_company_status
      ON inventory_batches (company_id, status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_batches_product_status
      ON inventory_batches (product_id, status)
      WHERE status = 'active';
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_batches_expiry
      ON inventory_batches (expiry_date)
      WHERE expiry_date IS NOT NULL AND status = 'active';
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inventory_batches_warehouse
      ON inventory_batches (warehouse_id, product_id)
      WHERE warehouse_id IS NOT NULL;
    `);

    // Create trigger to update updated_at timestamp
    await queryRunner.query(`
      CREATE TRIGGER trg_inventory_batches_updated_at
      ON inventory_batches
      AFTER UPDATE
      AS
      BEGIN
        SET NOCOUNT ON;
        UPDATE inventory_batches
        SET updated_at = GETDATE()
        FROM inventory_batches ib
        INNER JOIN inserted i ON ib.id = i.id;
      END;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_inventory_batches_updated_at;
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_batches_warehouse ON inventory_batches;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_batches_expiry ON inventory_batches;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_batches_product_status ON inventory_batches;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_batches_company_status ON inventory_batches;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_batches_company_product ON inventory_batches;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_batches_batch_number ON inventory_batches;`);

    // Drop table
    await queryRunner.query(`DROP TABLE inventory_batches;`);
  }
}
