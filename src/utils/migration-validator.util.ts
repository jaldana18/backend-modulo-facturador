import { DataSource, EntityMetadata } from 'typeorm';
import { logger } from '../config/logger';

interface ColumnDifference {
  columnName: string;
  entity: any;
  database: any;
  issue: string;
}

interface TableDifference {
  tableName: string;
  missingColumns: string[];
  extraColumns: string[];
  columnDifferences: ColumnDifference[];
}

interface ValidationResult {
  valid: boolean;
  differences: TableDifference[];
  summary: {
    totalTables: number;
    tablesWithIssues: number;
    totalIssues: number;
  };
}

/**
 * Validates that entity metadata matches the actual database schema
 */
export class MigrationValidator {
  constructor(private dataSource: DataSource) {}

  /**
   * Main validation method - compares all entities with database tables
   */
  async validate(): Promise<ValidationResult> {
    const differences: TableDifference[] = [];
    const entityMetadatas = this.dataSource.entityMetadatas;

    for (const metadata of entityMetadatas) {
      const tableDiff = await this.validateTable(metadata);
      if (
        tableDiff.missingColumns.length > 0 ||
        tableDiff.extraColumns.length > 0 ||
        tableDiff.columnDifferences.length > 0
      ) {
        differences.push(tableDiff);
      }
    }

    const result: ValidationResult = {
      valid: differences.length === 0,
      differences,
      summary: {
        totalTables: entityMetadatas.length,
        tablesWithIssues: differences.length,
        totalIssues: differences.reduce(
          (sum, diff) =>
            sum +
            diff.missingColumns.length +
            diff.extraColumns.length +
            diff.columnDifferences.length,
          0
        ),
      },
    };

    return result;
  }

  /**
   * Validates a single table against its entity metadata
   */
  private async validateTable(
    metadata: EntityMetadata
  ): Promise<TableDifference> {
    const tableName = metadata.tableName;
    const missingColumns: string[] = [];
    const extraColumns: string[] = [];
    const columnDifferences: ColumnDifference[] = [];

    try {
      // Get actual columns from database
      const dbColumns = await this.getDatabaseColumns(tableName);
      const dbColumnNames = new Set(dbColumns.map((col) => col.COLUMN_NAME));

      // Get entity columns from metadata
      const entityColumns = metadata.columns.map((col) => ({
        name: col.databaseName,
        type: col.type,
        length: col.length,
        nullable: col.isNullable,
        isPrimary: col.isPrimary,
        isGenerated: col.isGenerated,
      }));

      const entityColumnNames = new Set(entityColumns.map((col) => col.name));

      // Find missing columns (in entity but not in DB)
      for (const entityCol of entityColumns) {
        if (!dbColumnNames.has(entityCol.name)) {
          missingColumns.push(entityCol.name);
        }
      }

      // Find extra columns (in DB but not in entity)
      for (const dbCol of dbColumns) {
        if (!entityColumnNames.has(dbCol.COLUMN_NAME)) {
          extraColumns.push(dbCol.COLUMN_NAME);
        }
      }

      // Compare column properties for matching columns
      for (const entityCol of entityColumns) {
        const dbCol = dbColumns.find((col) => col.COLUMN_NAME === entityCol.name);
        if (dbCol) {
          const diff = this.compareColumn(entityCol, dbCol);
          if (diff) {
            columnDifferences.push({
              columnName: entityCol.name,
              entity: entityCol,
              database: dbCol,
              issue: diff,
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error validating table', {
        type: 'migration_validation_error',
        tableName,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
    }

    return {
      tableName,
      missingColumns,
      extraColumns,
      columnDifferences,
    };
  }

  /**
   * Gets column information from the database
   */
  private async getDatabaseColumns(tableName: string): Promise<any[]> {
    const query = `
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') as IS_IDENTITY
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @0
      ORDER BY ORDINAL_POSITION
    `;

    return await this.dataSource.query(query, [tableName]);
  }

  /**
   * Compares entity column definition with database column
   */
  private compareColumn(entityCol: any, dbCol: any): string | null {
    const issues: string[] = [];

    // Check nullable
    const dbNullable = dbCol.IS_NULLABLE === 'YES';
    if (entityCol.nullable !== dbNullable) {
      issues.push(
        `nullable mismatch (entity: ${entityCol.nullable}, db: ${dbNullable})`
      );
    }

    // Check type compatibility
    const typeMatch = this.checkTypeCompatibility(
      entityCol.type,
      dbCol.DATA_TYPE,
      entityCol.length,
      dbCol.CHARACTER_MAXIMUM_LENGTH
    );
    if (!typeMatch) {
      issues.push(
        `type mismatch (entity: ${entityCol.type}${entityCol.length ? `(${entityCol.length})` : ''}, db: ${dbCol.DATA_TYPE}${dbCol.CHARACTER_MAXIMUM_LENGTH ? `(${dbCol.CHARACTER_MAXIMUM_LENGTH})` : ''})`
      );
    }

    return issues.length > 0 ? issues.join(', ') : null;
  }

  /**
   * Checks if TypeORM type is compatible with SQL Server type
   */
  private checkTypeCompatibility(
    typeormType: any,
    sqlType: string,
    entityLength?: string | number,
    dbLength?: number
  ): boolean {
    const typeormTypeStr = String(typeormType).toLowerCase();
    const sqlTypeLower = sqlType.toLowerCase();

    // Type mappings
    const typeMap: Record<string, string[]> = {
      int: ['int', 'integer'],
      nvarchar: ['nvarchar', 'varchar'],
      varchar: ['varchar', 'nvarchar'],
      datetime2: ['datetime2', 'datetime'],
      decimal: ['decimal', 'numeric'],
      bit: ['bit', 'boolean'],
    };

    // Check basic type compatibility
    for (const [key, values] of Object.entries(typeMap)) {
      if (values.includes(typeormTypeStr) && values.includes(sqlTypeLower)) {
        // For string types, check length if specified
        if (
          ['nvarchar', 'varchar'].includes(sqlTypeLower) &&
          entityLength &&
          entityLength !== 'max'
        ) {
          const expectedLength = Number(entityLength);
          if (dbLength && dbLength !== expectedLength) {
            return false;
          }
        }
        return true;
      }
    }

    // Direct match
    return typeormTypeStr === sqlTypeLower;
  }

  /**
   * Formats validation result as a readable report
   */
  formatReport(result: ValidationResult): string {
    if (result.valid) {
      return '✅ All entities are in sync with database schema';
    }

    const lines: string[] = [
      '❌ Schema Validation Failed',
      '',
      `Summary:`,
      `  Total tables: ${result.summary.totalTables}`,
      `  Tables with issues: ${result.summary.tablesWithIssues}`,
      `  Total issues: ${result.summary.totalIssues}`,
      '',
      'Differences:',
    ];

    for (const diff of result.differences) {
      lines.push(`\n📋 Table: ${diff.tableName}`);

      if (diff.missingColumns.length > 0) {
        lines.push(`  ⚠️  Missing columns in database:`);
        diff.missingColumns.forEach((col) => lines.push(`     - ${col}`));
      }

      if (diff.extraColumns.length > 0) {
        lines.push(`  ⚠️  Extra columns in database (not in entity):`);
        diff.extraColumns.forEach((col) => lines.push(`     - ${col}`));
      }

      if (diff.columnDifferences.length > 0) {
        lines.push(`  ⚠️  Column definition mismatches:`);
        diff.columnDifferences.forEach((colDiff) =>
          lines.push(`     - ${colDiff.columnName}: ${colDiff.issue}`)
        );
      }
    }

    lines.push('');
    lines.push('💡 Run migrations to sync the schema:');
    lines.push('   npm run migration:run');

    return lines.join('\n');
  }

  /**
   * Validates and throws error if schema is out of sync
   */
  async validateOrThrow(): Promise<void> {
    const result = await this.validate();

    if (!result.valid) {
      const report = this.formatReport(result);
      logger.error('Schema validation failed', {
        type: 'schema_validation_failed',
        differences: result.differences,
        report,
      });
      throw new Error(
        `Schema validation failed. Run migrations to sync the schema.`
      );
    }

    // Silent success - schema validation passed
  }

  /**
   * Validates and logs warning if schema is out of sync
   */
  async validateAndWarn(): Promise<ValidationResult> {
    const result = await this.validate();

    if (!result.valid) {
      const report = this.formatReport(result);
      logger.warn('Schema validation warning', {
        type: 'schema_validation_warning',
        report,
        differences: result.differences,
      });
      console.warn('\n' + report + '\n');
    }
    // Silent success - schema is valid

    return result;
  }
}

/**
 * Helper function to validate migrations
 */
export async function validateMigrations(
  dataSource: DataSource,
  strict: boolean = false
): Promise<ValidationResult> {
  const validator = new MigrationValidator(dataSource);

  if (strict) {
    await validator.validateOrThrow();
    return { valid: true, differences: [], summary: { totalTables: 0, tablesWithIssues: 0, totalIssues: 0 } };
  } else {
    return await validator.validateAndWarn();
  }
}
