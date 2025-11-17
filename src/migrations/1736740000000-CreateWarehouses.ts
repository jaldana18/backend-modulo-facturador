import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWarehouses1736740000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create warehouses table
    await queryRunner.query(`
      CREATE TABLE warehouses (
        id INT IDENTITY(1,1) PRIMARY KEY,
        company_id INT NOT NULL,
        code NVARCHAR(50) NOT NULL,
        name NVARCHAR(200) NOT NULL,
        description NVARCHAR(500),
        address NVARCHAR(100),
        city NVARCHAR(100),
        state NVARCHAR(100),
        zip NVARCHAR(20),
        country NVARCHAR(100),
        phone NVARCHAR(50),
        email NVARCHAR(200),
        manager_name NVARCHAR(200),
        is_active BIT NOT NULL DEFAULT 1,
        is_main BIT NOT NULL DEFAULT 0,
        metadata NVARCHAR(MAX),
        created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT fk_warehouses_company
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX idx_warehouses_company
      ON warehouses (company_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_warehouses_company_active
      ON warehouses (company_id, is_active);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_warehouses_company_code
      ON warehouses (company_id, code);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_warehouses_company_code ON warehouses;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_warehouses_company_active ON warehouses;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_warehouses_company ON warehouses;`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS warehouses;`);
  }
}
