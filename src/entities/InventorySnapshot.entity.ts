import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from './Company.entity';
import { Product } from './Product.entity';
import { Warehouse } from './Warehouse.entity';

@Entity('inventory_snapshots')
@Index(['companyId', 'snapshotDate'])
@Index(['companyId', 'productId', 'snapshotDate'])
export class InventorySnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id', type: 'int' })
  companyId: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'warehouse_id', type: 'int', nullable: true })
  warehouseId: number | null;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse | null;

  @Column({ type: 'date', name: 'snapshot_date' })
  snapshotDate: Date;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    name: 'stock_quantity',
  })
  stockQuantity: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    name: 'stock_value',
  })
  stockValue: number; // quantity * unit_cost

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    name: 'unit_cost',
    nullable: true,
  })
  unitCost: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Helper method to calculate stock value
  calculateStockValue(): number {
    return this.stockQuantity * (this.unitCost || 0);
  }

  // Check if stock is at risk
  isLowStock(minimumStock: number): boolean {
    return this.stockQuantity < minimumStock;
  }
}
