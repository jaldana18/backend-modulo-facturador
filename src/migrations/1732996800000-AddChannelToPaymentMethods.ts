import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddChannelToPaymentMethods1732996800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add channel column to payment_methods table
    await queryRunner.addColumn(
      'payment_methods',
      new TableColumn({
        name: 'channel',
        type: 'nvarchar',
        length: '100',
        isNullable: true,
        comment: 'Canal o billetera específica: nequi, daviplata, bancolombia, etc.',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove channel column
    await queryRunner.dropColumn('payment_methods', 'channel');
  }
}
