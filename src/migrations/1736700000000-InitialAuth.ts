import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class InitialAuth1736700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create companies table
    await queryRunner.createTable(
      new Table({
        name: 'companies',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'identity',
          },
          {
            name: 'name',
            type: 'nvarchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'legal_name',
            type: 'nvarchar',
            length: '300',
            isNullable: true,
          },
          {
            name: 'tax_id',
            type: 'nvarchar',
            length: '500', // Encrypted field needs more space
            isNullable: false,
            isUnique: true,
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
            name: 'is_active',
            type: 'bit',
            default: 1,
          },
          {
            name: 'settings',
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

    // Create indexes for companies
    await queryRunner.createIndex(
      'companies',
      new TableIndex({
        name: 'idx_companies_active',
        columnNames: ['is_active'],
      })
    );

    await queryRunner.createIndex(
      'companies',
      new TableIndex({
        name: 'idx_companies_tax_id',
        columnNames: ['tax_id'],
        isUnique: true,
      })
    );

    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
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
            name: 'email',
            type: 'nvarchar',
            length: '200',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'password_hash',
            type: 'nvarchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'first_name',
            type: 'nvarchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'last_name',
            type: 'nvarchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'nvarchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'bit',
            default: 1,
          },
          {
            name: 'last_login',
            type: 'datetime2',
            isNullable: true,
          },
          {
            name: 'refresh_token',
            type: 'nvarchar',
            length: '500',
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

    // Create foreign key for users.company_id
    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        name: 'fk_users_company',
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // Create indexes for users
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_company',
        columnNames: ['company_id'],
      })
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_email',
        columnNames: ['email'],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_company_active',
        columnNames: ['company_id', 'is_active'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('users', 'idx_users_company_active');
    await queryRunner.dropIndex('users', 'idx_users_email');
    await queryRunner.dropIndex('users', 'idx_users_company');
    await queryRunner.dropIndex('companies', 'idx_companies_tax_id');
    await queryRunner.dropIndex('companies', 'idx_companies_active');

    // Drop foreign key
    await queryRunner.dropForeignKey('users', 'fk_users_company');

    // Drop tables
    await queryRunner.dropTable('users');
    await queryRunner.dropTable('companies');
  }
}
