import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateAuditLogs1764200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create audit_logs table
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
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
            name: 'user_id',
            type: 'int',
            isNullable: true,
            comment: 'User who performed the action (null for system actions)',
          },
          {
            name: 'action',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment: 'Action type: CREATE, UPDATE, DELETE, ACTIVATE, DEACTIVATE, LOGIN, LOGOUT, etc.',
          },
          {
            name: 'entity_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: 'Entity type: Product, User, Customer, Warehouse, InventoryTransaction, Sale, etc.',
          },
          {
            name: 'entity_id',
            type: 'int',
            isNullable: true,
            comment: 'ID of the affected entity',
          },
          {
            name: 'description',
            type: 'nvarchar',
            length: '500',
            isNullable: false,
            comment: 'Human-readable description of the action',
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
            comment: 'IP address (supports IPv4 and IPv6)',
          },
          {
            name: 'user_agent',
            type: 'nvarchar',
            length: '500',
            isNullable: true,
            comment: 'User agent string (browser/client info)',
          },
          {
            name: 'old_values',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: true,
            comment: 'Previous values before change (JSON format)',
          },
          {
            name: 'new_values',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: true,
            comment: 'New values after change (JSON format)',
          },
          {
            name: 'metadata',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: true,
            comment: 'Additional metadata (JSON format): warehouseId, references, etc.',
          },
          {
            name: 'severity',
            type: 'varchar',
            length: '20',
            default: "'info'",
            isNullable: false,
            comment: 'Severity: info, warning, critical',
          },
          {
            name: 'module',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'Module: inventory, sales, users, products, warehouses, etc.',
          },
          {
            name: 'created_at',
            type: 'datetime2',
            default: 'GETDATE()',
            isNullable: false,
            comment: 'Timestamp when the action was performed',
          },
        ],
      }),
      true
    );

    // Create foreign key for company_id
    await queryRunner.createForeignKey(
      'audit_logs',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_audit_logs_company',
      })
    );

    // Create foreign key for user_id
    await queryRunner.createForeignKey(
      'audit_logs',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_audit_logs_user',
      })
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_company_created',
        columnNames: ['company_id', 'created_at'],
      })
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_user_created',
        columnNames: ['user_id', 'created_at'],
      })
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_entity',
        columnNames: ['entity_type', 'entity_id'],
      })
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_action',
        columnNames: ['action'],
      })
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_created_at',
        columnNames: ['created_at'],
      })
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_module',
        columnNames: ['module'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_module');
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_created_at');
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_action');
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_entity');
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_user_created');
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_company_created');

    // Drop foreign keys
    await queryRunner.dropForeignKey('audit_logs', 'FK_audit_logs_user');
    await queryRunner.dropForeignKey('audit_logs', 'FK_audit_logs_company');

    // Drop table
    await queryRunner.dropTable('audit_logs');
  }
}
