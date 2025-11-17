import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateProducts1736710000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create products table
    await queryRunner.createTable(
      new Table({
        name: 'products',
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
            name: 'sku',
            type: 'nvarchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'nvarchar',
            length: '300',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'nvarchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'unit_of_measure',
            type: 'nvarchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'minimum_stock',
            type: 'decimal',
            precision: 18,
            scale: 4,
            default: 0,
          },
          {
            name: 'reorder_point',
            type: 'decimal',
            precision: 18,
            scale: 4,
            default: 0,
          },
          {
            name: 'cost',
            type: 'nvarchar',
            length: '500', // Encrypted field
            isNullable: true,
          },
          {
            name: 'price',
            type: 'nvarchar',
            length: '500', // Encrypted field
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'bit',
            default: 1,
          },
          {
            name: 'metadata',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime2',
            default: 'GETDATE()',
          },
          {
            name: 'updated_at',
            type: 'datetime2',
            default: 'GETDATE()',
          },
        ],
      }),
      true
    );

    // Create foreign key for products.company_id
    await queryRunner.createForeignKey(
      'products',
      new TableForeignKey({
        name: 'fk_products_company',
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // Create indexes for products
    await queryRunner.createIndex(
      'products',
      new TableIndex({
        name: 'idx_products_company_sku',
        columnNames: ['company_id', 'sku'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'products',
      new TableIndex({
        name: 'idx_products_company',
        columnNames: ['company_id'],
      })
    );

    await queryRunner.createIndex(
      'products',
      new TableIndex({
        name: 'idx_products_company_active',
        columnNames: ['company_id', 'is_active'],
      })
    );

    await queryRunner.createIndex(
      'products',
      new TableIndex({
        name: 'idx_products_company_category',
        columnNames: ['company_id', 'category'],
      })
    );

    await queryRunner.createIndex(
      'products',
      new TableIndex({
        name: 'idx_products_sku',
        columnNames: ['sku'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('products', 'idx_products_sku');
    await queryRunner.dropIndex('products', 'idx_products_company_category');
    await queryRunner.dropIndex('products', 'idx_products_company_active');
    await queryRunner.dropIndex('products', 'idx_products_company');
    await queryRunner.dropIndex('products', 'idx_products_company_sku');

    // Drop foreign key
    await queryRunner.dropForeignKey('products', 'fk_products_company');

    // Drop table
    await queryRunner.dropTable('products');
  }
}
