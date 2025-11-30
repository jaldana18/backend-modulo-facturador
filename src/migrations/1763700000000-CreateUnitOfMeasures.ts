import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateUnitOfMeasures1763700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create unit_of_measures table
    await queryRunner.createTable(
      new Table({
        name: 'unit_of_measures',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'identity',
          },
          {
            name: 'company_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'code',
            type: 'nvarchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'nvarchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'nvarchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'symbol',
            type: 'nvarchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'is_base_unit',
            type: 'bit',
            default: 0,
            isNullable: false,
          },
          {
            name: 'base_unit_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'conversion_factor',
            type: 'decimal',
            precision: 18,
            scale: 6,
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'bit',
            default: 1,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'datetime2',
            default: 'GETDATE()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'datetime2',
            default: 'GETDATE()',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create foreign key to companies
    await queryRunner.createForeignKey(
      'unit_of_measures',
      new TableForeignKey({
        name: 'FK_unit_of_measures_company',
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // Create self-referencing foreign key for base_unit_id
    // Note: SQL Server doesn't allow SET NULL on self-referencing FK with CASCADE elsewhere
    await queryRunner.createForeignKey(
      'unit_of_measures',
      new TableForeignKey({
        name: 'FK_unit_of_measures_base_unit',
        columnNames: ['base_unit_id'],
        referencedTableName: 'unit_of_measures',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      })
    );

    // Create unique index on company_id + code
    await queryRunner.createIndex(
      'unit_of_measures',
      new TableIndex({
        name: 'IDX_unit_of_measures_company_code',
        columnNames: ['company_id', 'code'],
        isUnique: true,
      })
    );

    // Create index on company_id + is_active
    await queryRunner.createIndex(
      'unit_of_measures',
      new TableIndex({
        name: 'IDX_unit_of_measures_company_active',
        columnNames: ['company_id', 'is_active'],
      })
    );

    // Add unit_of_measure_id to products table
    await queryRunner.query(`
      ALTER TABLE products
      ADD unit_of_measure_id INT NULL
    `);

    // Create foreign key from products to unit_of_measures
    await queryRunner.createForeignKey(
      'products',
      new TableForeignKey({
        name: 'FK_products_unit_of_measure',
        columnNames: ['unit_of_measure_id'],
        referencedTableName: 'unit_of_measures',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // Create index on products.unit_of_measure_id
    await queryRunner.createIndex(
      'products',
      new TableIndex({
        name: 'IDX_products_unit_of_measure',
        columnNames: ['unit_of_measure_id'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index on products
    await queryRunner.dropIndex('products', 'IDX_products_unit_of_measure');

    // Drop foreign key from products
    await queryRunner.dropForeignKey('products', 'FK_products_unit_of_measure');

    // Remove column from products
    await queryRunner.query(`
      ALTER TABLE products
      DROP COLUMN unit_of_measure_id
    `);

    // Drop indexes
    await queryRunner.dropIndex('unit_of_measures', 'IDX_unit_of_measures_company_active');
    await queryRunner.dropIndex('unit_of_measures', 'IDX_unit_of_measures_company_code');

    // Drop foreign keys
    await queryRunner.dropForeignKey('unit_of_measures', 'FK_unit_of_measures_base_unit');
    await queryRunner.dropForeignKey('unit_of_measures', 'FK_unit_of_measures_company');

    // Drop table
    await queryRunner.dropTable('unit_of_measures');
  }
}
