import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDiscountFieldsToSales1764300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add discount_type column
    await queryRunner.addColumn(
      'sales',
      new TableColumn({
        name: 'discount_type',
        type: 'varchar',
        length: '20',
        isNullable: true,
        default: "'none'",
        comment: 'Tipo de descuento: percentage, fixed, none',
      })
    );

    // Add discount_percentage column
    await queryRunner.addColumn(
      'sales',
      new TableColumn({
        name: 'discount_percentage',
        type: 'decimal',
        precision: 5,
        scale: 2,
        isNullable: true,
        default: 0,
        comment: 'Porcentaje de descuento global para la venta',
      })
    );

    // Add discount_reason column
    await queryRunner.addColumn(
      'sales',
      new TableColumn({
        name: 'discount_reason',
        type: 'nvarchar',
        length: '500',
        isNullable: true,
        comment: 'Razón o justificación del descuento aplicado',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns in reverse order
    await queryRunner.dropColumn('sales', 'discount_reason');
    await queryRunner.dropColumn('sales', 'discount_percentage');
    await queryRunner.dropColumn('sales', 'discount_type');
  }
}
