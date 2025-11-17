import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateReportingTables1763260604978 implements MigrationInterface {
    name = 'CreateReportingTables1763260604978'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "sales_aggregates" ("id" int NOT NULL IDENTITY(1,1), "company_id" int NOT NULL, "product_id" int NOT NULL, "category_id" int, "aggregate_date" date NOT NULL, "period_type" nvarchar(20) CONSTRAINT CHK_5d3cc9a000a5c4717753adc844_ENUM CHECK(period_type IN ('day','week','month','year')) NOT NULL, "transaction_count" int NOT NULL CONSTRAINT "DF_bc8a953ff913e1f63d28077232f" DEFAULT 0, "total_quantity" decimal(18,4) NOT NULL CONSTRAINT "DF_b7b0068972d9b62eb1bad640cc9" DEFAULT 0, "total_revenue" decimal(18,4) NOT NULL CONSTRAINT "DF_ae1848710f7ab579263b1aeba1f" DEFAULT 0, "total_cost" decimal(18,4) CONSTRAINT "DF_2dc4682cbf49c47c658e09f9614" DEFAULT 0, "total_profit" decimal(18,4) CONSTRAINT "DF_89b31bbb125abc53f0e3c2a77ee" DEFAULT 0, "avg_unit_price" decimal(18,4), "created_at" datetime2 NOT NULL CONSTRAINT "DF_4708a22deadd9c70b727a2104f2" DEFAULT getdate(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_b2acbd3e3de1ac1c5a19df3e7d6" DEFAULT getdate(), CONSTRAINT "PK_aa68c6f0b52702caf6b4b5332c4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c5f5e9911c2ee42211052fec70" ON "sales_aggregates" ("company_id", "period_type", "aggregate_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_6d191b863352ec56cbb093bae2" ON "sales_aggregates" ("company_id", "product_id", "aggregate_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_0e70e95f07eec13aed77333ba9" ON "sales_aggregates" ("company_id", "aggregate_date") `);
        await queryRunner.query(`CREATE TABLE "inventory_snapshots" ("id" int NOT NULL IDENTITY(1,1), "company_id" int NOT NULL, "product_id" int NOT NULL, "warehouse_id" int, "snapshot_date" date NOT NULL, "stock_quantity" decimal(18,4) NOT NULL, "stock_value" decimal(18,4) NOT NULL, "unit_cost" decimal(18,4), "created_at" datetime2 NOT NULL CONSTRAINT "DF_787bc35e593f27125db7291d722" DEFAULT getdate(), CONSTRAINT "PK_8f1b9d563b63646dc2e6e129d68" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c34180b2b841944c6faa6fe468" ON "inventory_snapshots" ("company_id", "product_id", "snapshot_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_c230b50b4468387a6eb5a6edcd" ON "inventory_snapshots" ("company_id", "snapshot_date") `);
        await queryRunner.query(`ALTER TABLE "sales_aggregates" ADD CONSTRAINT "FK_dc7fa5faf2a550131fb747fafe0" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales_aggregates" ADD CONSTRAINT "FK_f4af6a3010e61ee5892dec17582" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales_aggregates" ADD CONSTRAINT "FK_107c8e77f8548828117f8eaf92a" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_snapshots" ADD CONSTRAINT "FK_f1a30db696ee039b4e1e7887664" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_snapshots" ADD CONSTRAINT "FK_17119845b93d2566281a3cf61bb" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_snapshots" ADD CONSTRAINT "FK_9e8dc5238e081d3777b06a3c19e" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_snapshots" DROP CONSTRAINT "FK_9e8dc5238e081d3777b06a3c19e"`);
        await queryRunner.query(`ALTER TABLE "inventory_snapshots" DROP CONSTRAINT "FK_17119845b93d2566281a3cf61bb"`);
        await queryRunner.query(`ALTER TABLE "inventory_snapshots" DROP CONSTRAINT "FK_f1a30db696ee039b4e1e7887664"`);
        await queryRunner.query(`ALTER TABLE "sales_aggregates" DROP CONSTRAINT "FK_107c8e77f8548828117f8eaf92a"`);
        await queryRunner.query(`ALTER TABLE "sales_aggregates" DROP CONSTRAINT "FK_f4af6a3010e61ee5892dec17582"`);
        await queryRunner.query(`ALTER TABLE "sales_aggregates" DROP CONSTRAINT "FK_dc7fa5faf2a550131fb747fafe0"`);
        await queryRunner.query(`DROP INDEX "IDX_c230b50b4468387a6eb5a6edcd" ON "inventory_snapshots"`);
        await queryRunner.query(`DROP INDEX "IDX_c34180b2b841944c6faa6fe468" ON "inventory_snapshots"`);
        await queryRunner.query(`DROP TABLE "inventory_snapshots"`);
        await queryRunner.query(`DROP INDEX "IDX_0e70e95f07eec13aed77333ba9" ON "sales_aggregates"`);
        await queryRunner.query(`DROP INDEX "IDX_6d191b863352ec56cbb093bae2" ON "sales_aggregates"`);
        await queryRunner.query(`DROP INDEX "IDX_c5f5e9911c2ee42211052fec70" ON "sales_aggregates"`);
        await queryRunner.query(`DROP TABLE "sales_aggregates"`);
    }

}
