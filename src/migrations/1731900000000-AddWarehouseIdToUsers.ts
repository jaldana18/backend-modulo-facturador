import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddWarehouseIdToUsers1731900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add warehouse_id column to users table
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'warehouse_id',
        type: 'int',
        isNullable: true,
      })
    );

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE users
      ADD CONSTRAINT FK_users_warehouse
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
      ON DELETE SET NULL
    `);

    // Add index for performance
    await queryRunner.query(`
      CREATE INDEX IDX_users_warehouse_id ON users(warehouse_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE users
      DROP CONSTRAINT FK_users_warehouse
    `);

    // Drop index
    await queryRunner.query(`
      DROP INDEX IDX_users_warehouse_id ON users
    `);

    // Drop column
    await queryRunner.dropColumn('users', 'warehouse_id');
  }
}
