import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBatchReservations1736780000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create batch_reservations table
    await queryRunner.query(`
      CREATE TABLE batch_reservations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        batch_id INT NOT NULL,
        sales_order_id INT NULL,

        -- Quantities
        quantity DECIMAL(18,4) NOT NULL,

        -- Status and expiration
        status NVARCHAR(20) NOT NULL DEFAULT 'active',
        expires_at DATETIME2 NULL,

        -- Audit fields
        user_id INT NOT NULL,
        notes NVARCHAR(500) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

        -- Foreign keys
        CONSTRAINT fk_batch_reservations_batch
          FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE NO ACTION,
        CONSTRAINT fk_batch_reservations_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE NO ACTION,

        -- Constraints
        CONSTRAINT chk_batch_reservations_status
          CHECK (status IN ('active', 'fulfilled', 'cancelled', 'expired')),
        CONSTRAINT chk_batch_reservations_quantity
          CHECK (quantity > 0)
      );
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX idx_batch_reservations_batch
      ON batch_reservations (batch_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_batch_reservations_status
      ON batch_reservations (status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_batch_reservations_active
      ON batch_reservations (batch_id, status)
      WHERE status = 'active';
    `);

    await queryRunner.query(`
      CREATE INDEX idx_batch_reservations_sales_order
      ON batch_reservations (sales_order_id)
      WHERE sales_order_id IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_batch_reservations_expiry
      ON batch_reservations (expires_at)
      WHERE expires_at IS NOT NULL AND status = 'active';
    `);

    await queryRunner.query(`
      CREATE INDEX idx_batch_reservations_user
      ON batch_reservations (user_id);
    `);

    // Create trigger to update updated_at timestamp
    await queryRunner.query(`
      CREATE TRIGGER trg_batch_reservations_updated_at
      ON batch_reservations
      AFTER UPDATE
      AS
      BEGIN
        SET NOCOUNT ON;
        UPDATE batch_reservations
        SET updated_at = GETDATE()
        FROM batch_reservations br
        INNER JOIN inserted i ON br.id = i.id;
      END;
    `);

    // Create trigger to auto-expire reservations
    await queryRunner.query(`
      CREATE TRIGGER trg_batch_reservations_auto_expire
      ON batch_reservations
      AFTER INSERT, UPDATE
      AS
      BEGIN
        SET NOCOUNT ON;
        UPDATE batch_reservations
        SET status = 'expired'
        WHERE status = 'active'
          AND expires_at IS NOT NULL
          AND expires_at < GETDATE();
      END;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_batch_reservations_auto_expire;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_batch_reservations_updated_at;`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_batch_reservations_user ON batch_reservations;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_batch_reservations_expiry ON batch_reservations;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_batch_reservations_sales_order ON batch_reservations;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_batch_reservations_active ON batch_reservations;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_batch_reservations_status ON batch_reservations;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_batch_reservations_batch ON batch_reservations;`);

    // Drop table
    await queryRunner.query(`DROP TABLE batch_reservations;`);
  }
}
