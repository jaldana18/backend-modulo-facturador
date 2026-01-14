import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddImageToProduct1763446638447 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('products', new TableColumn({
            name: 'imagen',
            type: 'nvarchar',
            length: '500',
            isNullable: true,
            comment: 'Ruta relativa de la imagen del producto'
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('products', 'imagen');
    }

}
