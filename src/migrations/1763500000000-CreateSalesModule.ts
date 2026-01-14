import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSalesModule1763500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Create customers table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'customers',
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
            name: 'document_type',
            type: 'varchar',
            length: '20',
            default: "'CC'",
          },
          {
            name: 'document_number',
            type: 'nvarchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'nvarchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'nvarchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'nvarchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'nvarchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'nvarchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'nvarchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'zip_code',
            type: 'nvarchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'credit_limit',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'current_balance',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'customer_type',
            type: 'varchar',
            length: '50',
            default: "'retail'",
          },
          {
            name: 'tax_responsible',
            type: 'bit',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'bit',
            default: 1,
          },
          {
            name: 'notes',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: true,
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

    // Foreign key for customers.company_id
    await queryRunner.createForeignKey(
      'customers',
      new TableForeignKey({
        name: 'fk_customers_company',
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // Indexes for customers
    await queryRunner.createIndex(
      'customers',
      new TableIndex({
        name: 'idx_customers_company_code',
        columnNames: ['company_id', 'code'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'customers',
      new TableIndex({
        name: 'idx_customers_company_document',
        columnNames: ['company_id', 'document_number'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'customers',
      new TableIndex({
        name: 'idx_customers_company_active',
        columnNames: ['company_id', 'is_active'],
      })
    );

    await queryRunner.createIndex(
      'customers',
      new TableIndex({
        name: 'idx_customers_company_type',
        columnNames: ['company_id', 'customer_type'],
      })
    );

    // ============================================
    // 2. Create payment_methods table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'payment_methods',
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
            name: 'name',
            type: 'nvarchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'code',
            type: 'nvarchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'requires_reference',
            type: 'bit',
            default: 0,
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

    // Foreign key for payment_methods.company_id
    await queryRunner.createForeignKey(
      'payment_methods',
      new TableForeignKey({
        name: 'fk_payment_methods_company',
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // Indexes for payment_methods
    await queryRunner.createIndex(
      'payment_methods',
      new TableIndex({
        name: 'idx_payment_methods_company_code',
        columnNames: ['company_id', 'code'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'payment_methods',
      new TableIndex({
        name: 'idx_payment_methods_company_active',
        columnNames: ['company_id', 'is_active'],
      })
    );

    // ============================================
    // 3. Create sales table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'sales',
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
            name: 'sale_number',
            type: 'nvarchar',
            length: '50',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'sale_type',
            type: 'varchar',
            length: '20',
            default: "'invoice'",
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'draft'",
          },
          {
            name: 'customer_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'warehouse_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'sale_date',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'due_date',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'subtotal',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'tax_amount',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'tax_percentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 19,
          },
          {
            name: 'discount_amount',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'total',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'paid_amount',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'payment_status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'external_invoice_id',
            type: 'nvarchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'external_invoice_provider',
            type: 'nvarchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'external_invoice_data',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: true,
          },
          {
            name: 'reference_sale_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'nvarchar',
            length: '500',
            isNullable: true,
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

    // Foreign keys for sales table
    await queryRunner.createForeignKey(
      'sales',
      new TableForeignKey({
        name: 'fk_sales_company',
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'sales',
      new TableForeignKey({
        name: 'fk_sales_customer',
        columnNames: ['customer_id'],
        referencedTableName: 'customers',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      })
    );

    await queryRunner.createForeignKey(
      'sales',
      new TableForeignKey({
        name: 'fk_sales_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      })
    );

    await queryRunner.createForeignKey(
      'sales',
      new TableForeignKey({
        name: 'fk_sales_warehouse',
        columnNames: ['warehouse_id'],
        referencedTableName: 'warehouses',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      })
    );

    await queryRunner.createForeignKey(
      'sales',
      new TableForeignKey({
        name: 'fk_sales_reference_sale',
        columnNames: ['reference_sale_id'],
        referencedTableName: 'sales',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      })
    );

    // Indexes for sales table
    await queryRunner.createIndex(
      'sales',
      new TableIndex({
        name: 'idx_sales_company_number',
        columnNames: ['company_id', 'sale_number'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'sales',
      new TableIndex({
        name: 'idx_sales_company_status',
        columnNames: ['company_id', 'status'],
      })
    );

    await queryRunner.createIndex(
      'sales',
      new TableIndex({
        name: 'idx_sales_company_type',
        columnNames: ['company_id', 'sale_type'],
      })
    );

    await queryRunner.createIndex(
      'sales',
      new TableIndex({
        name: 'idx_sales_company_customer',
        columnNames: ['company_id', 'customer_id'],
      })
    );

    await queryRunner.createIndex(
      'sales',
      new TableIndex({
        name: 'idx_sales_company_date',
        columnNames: ['company_id', 'sale_date'],
      })
    );

    await queryRunner.createIndex(
      'sales',
      new TableIndex({
        name: 'idx_sales_company_payment_status',
        columnNames: ['company_id', 'payment_status'],
      })
    );

    // ============================================
    // 4. Create sale_details table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'sale_details',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'identity',
          },
          {
            name: 'sale_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'product_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'nvarchar',
            length: '300',
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'decimal',
            precision: 18,
            scale: 4,
            default: 0,
          },
          {
            name: 'unit_price',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'tax_percentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 19,
          },
          {
            name: 'discount_percentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'discount_amount',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'line_total',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'is_kit',
            type: 'bit',
            default: 0,
          },
          {
            name: 'metadata',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Foreign keys for sale_details
    await queryRunner.createForeignKey(
      'sale_details',
      new TableForeignKey({
        name: 'fk_sale_details_sale',
        columnNames: ['sale_id'],
        referencedTableName: 'sales',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'sale_details',
      new TableForeignKey({
        name: 'fk_sale_details_product',
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      })
    );

    // Indexes for sale_details
    await queryRunner.createIndex(
      'sale_details',
      new TableIndex({
        name: 'idx_sale_details_sale',
        columnNames: ['sale_id'],
      })
    );

    await queryRunner.createIndex(
      'sale_details',
      new TableIndex({
        name: 'idx_sale_details_product',
        columnNames: ['product_id'],
      })
    );

    // ============================================
    // 5. Create payments table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'payments',
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
            name: 'sale_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'payment_method_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'payment_number',
            type: 'nvarchar',
            length: '50',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'payment_date',
            type: 'datetime2',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'completed'",
          },
          {
            name: 'reference_number',
            type: 'nvarchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'nvarchar',
            length: '500',
            isNullable: true,
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

    // Foreign keys for payments
    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        name: 'fk_payments_company',
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        name: 'fk_payments_sale',
        columnNames: ['sale_id'],
        referencedTableName: 'sales',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      })
    );

    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        name: 'fk_payments_payment_method',
        columnNames: ['payment_method_id'],
        referencedTableName: 'payment_methods',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      })
    );

    // Indexes for payments
    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'idx_payments_company_number',
        columnNames: ['company_id', 'payment_number'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'idx_payments_company_sale',
        columnNames: ['company_id', 'sale_id'],
      })
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'idx_payments_company_status',
        columnNames: ['company_id', 'status'],
      })
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'idx_payments_company_date',
        columnNames: ['company_id', 'payment_date'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop payments table and its dependencies
    await queryRunner.dropIndex('payments', 'idx_payments_company_date');
    await queryRunner.dropIndex('payments', 'idx_payments_company_status');
    await queryRunner.dropIndex('payments', 'idx_payments_company_sale');
    await queryRunner.dropIndex('payments', 'idx_payments_company_number');
    await queryRunner.dropForeignKey('payments', 'fk_payments_payment_method');
    await queryRunner.dropForeignKey('payments', 'fk_payments_sale');
    await queryRunner.dropForeignKey('payments', 'fk_payments_company');
    await queryRunner.dropTable('payments');

    // Drop sale_details table and its dependencies
    await queryRunner.dropIndex('sale_details', 'idx_sale_details_product');
    await queryRunner.dropIndex('sale_details', 'idx_sale_details_sale');
    await queryRunner.dropForeignKey('sale_details', 'fk_sale_details_product');
    await queryRunner.dropForeignKey('sale_details', 'fk_sale_details_sale');
    await queryRunner.dropTable('sale_details');

    // Drop sales table and its dependencies
    await queryRunner.dropIndex('sales', 'idx_sales_company_payment_status');
    await queryRunner.dropIndex('sales', 'idx_sales_company_date');
    await queryRunner.dropIndex('sales', 'idx_sales_company_customer');
    await queryRunner.dropIndex('sales', 'idx_sales_company_type');
    await queryRunner.dropIndex('sales', 'idx_sales_company_status');
    await queryRunner.dropIndex('sales', 'idx_sales_company_number');
    await queryRunner.dropForeignKey('sales', 'fk_sales_reference_sale');
    await queryRunner.dropForeignKey('sales', 'fk_sales_warehouse');
    await queryRunner.dropForeignKey('sales', 'fk_sales_user');
    await queryRunner.dropForeignKey('sales', 'fk_sales_customer');
    await queryRunner.dropForeignKey('sales', 'fk_sales_company');
    await queryRunner.dropTable('sales');

    // Drop payment_methods table and its dependencies
    await queryRunner.dropIndex('payment_methods', 'idx_payment_methods_company_active');
    await queryRunner.dropIndex('payment_methods', 'idx_payment_methods_company_code');
    await queryRunner.dropForeignKey('payment_methods', 'fk_payment_methods_company');
    await queryRunner.dropTable('payment_methods');

    // Drop customers table and its dependencies
    await queryRunner.dropIndex('customers', 'idx_customers_company_type');
    await queryRunner.dropIndex('customers', 'idx_customers_company_active');
    await queryRunner.dropIndex('customers', 'idx_customers_company_document');
    await queryRunner.dropIndex('customers', 'idx_customers_company_code');
    await queryRunner.dropForeignKey('customers', 'fk_customers_company');
    await queryRunner.dropTable('customers');
  }
}
