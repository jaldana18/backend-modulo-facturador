import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixActivityLogsIdentity1736442000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the table exists and has the identity issue
    const tableExists = await queryRunner.hasTable('activity_logs');
    
    if (!tableExists) {
      // If table doesn't exist, the CreateActivityLogs migration will handle it
      return;
    }

    // Get current data if any exists
    const hasData = await queryRunner.query(
      `SELECT COUNT(*) as count FROM activity_logs`
    );
    
    if (hasData[0].count > 0) {
      // Backup existing data
      await queryRunner.query(`
        SELECT * INTO activity_logs_backup FROM activity_logs
      `);
    }

    // Drop the table completely
    await queryRunner.query(`
      IF OBJECT_ID('activity_logs', 'U') IS NOT NULL
      BEGIN
        -- Drop indexes first
        IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_activity_logs_company_type' AND object_id = OBJECT_ID('activity_logs'))
          DROP INDEX idx_activity_logs_company_type ON activity_logs;
        
        IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_activity_logs_type_created' AND object_id = OBJECT_ID('activity_logs'))
          DROP INDEX idx_activity_logs_type_created ON activity_logs;
        
        IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_activity_logs_user_created' AND object_id = OBJECT_ID('activity_logs'))
          DROP INDEX idx_activity_logs_user_created ON activity_logs;
        
        IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_activity_logs_company_created' AND object_id = OBJECT_ID('activity_logs'))
          DROP INDEX idx_activity_logs_company_created ON activity_logs;
        
        -- Drop foreign keys
        IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_activity_logs_user' AND parent_object_id = OBJECT_ID('activity_logs'))
          ALTER TABLE activity_logs DROP CONSTRAINT fk_activity_logs_user;
        
        IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_activity_logs_company' AND parent_object_id = OBJECT_ID('activity_logs'))
          ALTER TABLE activity_logs DROP CONSTRAINT fk_activity_logs_company;
        
        -- Drop the table
        DROP TABLE activity_logs;
      END
    `);

    // Recreate the table with proper identity column
    await queryRunner.query(`
      CREATE TABLE activity_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        company_id INT NOT NULL,
        user_id INT NOT NULL,
        activity_type NVARCHAR(50) NOT NULL,
        activity_description NVARCHAR(500) NOT NULL,
        entity_type NVARCHAR(50) NULL,
        entity_id INT NULL,
        entity_name NVARCHAR(200) NULL,
        metadata NVARCHAR(MAX) NULL,
        ip_address NVARCHAR(50) NULL,
        user_agent NVARCHAR(500) NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
      )
    `);

    // Recreate foreign keys
    await queryRunner.query(`
      ALTER TABLE activity_logs
      ADD CONSTRAINT fk_activity_logs_company
      FOREIGN KEY (company_id) REFERENCES companies(id)
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE activity_logs
      ADD CONSTRAINT fk_activity_logs_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE NO ACTION
    `);

    // Recreate indexes
    await queryRunner.query(`
      CREATE INDEX idx_activity_logs_company_created 
      ON activity_logs(company_id, created_at)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_activity_logs_user_created 
      ON activity_logs(user_id, created_at)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_activity_logs_type_created 
      ON activity_logs(activity_type, created_at)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_activity_logs_company_type 
      ON activity_logs(company_id, activity_type)
    `);

    // Restore data if it was backed up
    if (hasData[0].count > 0) {
      await queryRunner.query(`
        SET IDENTITY_INSERT activity_logs ON;
        
        INSERT INTO activity_logs (
          id, company_id, user_id, activity_type, activity_description,
          entity_type, entity_id, entity_name, metadata, ip_address, user_agent, created_at
        )
        SELECT 
          id, company_id, user_id, activity_type, activity_description,
          entity_type, entity_id, entity_name, metadata, ip_address, user_agent, created_at
        FROM activity_logs_backup;
        
        SET IDENTITY_INSERT activity_logs OFF;
        
        DROP TABLE activity_logs_backup;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // In case of rollback, we can't really go back to a broken state
    // So we'll just log a warning
    console.warn('Rolling back FixActivityLogsIdentity migration - this will not restore the broken state');
    // The CreateActivityLogs migration would handle the down properly
  }
}
