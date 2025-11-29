import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateActivityLogs1732748000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create activity_logs table
    await queryRunner.createTable(
      new Table({
        name: 'activity_logs',
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
            isNullable: false,
          },
          {
            name: 'activity_type',
            type: 'nvarchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'activity_description',
            type: 'nvarchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'entity_type',
            type: 'nvarchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'entity_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'entity_name',
            type: 'nvarchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'nvarchar',
            length: 'MAX',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'nvarchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'nvarchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime2',
            default: 'GETDATE()',
          },
        ],
      }),
      true
    );

    // Foreign key for company_id
    await queryRunner.createForeignKey(
      'activity_logs',
      new TableForeignKey({
        name: 'fk_activity_logs_company',
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // Foreign key for user_id
    await queryRunner.createForeignKey(
      'activity_logs',
      new TableForeignKey({
        name: 'fk_activity_logs_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      })
    );

    // Indexes for performance
    await queryRunner.createIndex(
      'activity_logs',
      new TableIndex({
        name: 'idx_activity_logs_company_created',
        columnNames: ['company_id', 'created_at'],
      })
    );

    await queryRunner.createIndex(
      'activity_logs',
      new TableIndex({
        name: 'idx_activity_logs_user_created',
        columnNames: ['user_id', 'created_at'],
      })
    );

    await queryRunner.createIndex(
      'activity_logs',
      new TableIndex({
        name: 'idx_activity_logs_type_created',
        columnNames: ['activity_type', 'created_at'],
      })
    );

    await queryRunner.createIndex(
      'activity_logs',
      new TableIndex({
        name: 'idx_activity_logs_company_type',
        columnNames: ['company_id', 'activity_type'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('activity_logs', 'idx_activity_logs_company_type');
    await queryRunner.dropIndex('activity_logs', 'idx_activity_logs_type_created');
    await queryRunner.dropIndex('activity_logs', 'idx_activity_logs_user_created');
    await queryRunner.dropIndex('activity_logs', 'idx_activity_logs_company_created');

    // Drop foreign keys
    await queryRunner.dropForeignKey('activity_logs', 'fk_activity_logs_user');
    await queryRunner.dropForeignKey('activity_logs', 'fk_activity_logs_company');

    // Drop table
    await queryRunner.dropTable('activity_logs');
  }
}
