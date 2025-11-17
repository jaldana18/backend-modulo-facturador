import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from './Company.entity';
import { Product } from './Product.entity';
import { Category } from './Category.entity';

export enum PeriodType {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

@Entity('sales_aggregates')
@Index(['companyId', 'aggregateDate'])
@Index(['companyId', 'productId', 'aggregateDate'])
@Index(['companyId', 'periodType', 'aggregateDate'])
export class SalesAggregate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'category_id', nullable: true })
  categoryId: number | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @Column({ type: 'date', name: 'aggregate_date' })
  aggregateDate: Date;

  @Column({
    type: 'nvarchar',
    length: 20,
    name: 'period_type',
    enum: PeriodType,
  })
  periodType: PeriodType;

  @Column({ type: 'int', name: 'transaction_count', default: 0 })
  transactionCount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    name: 'total_quantity',
    default: 0,
  })
  totalQuantity: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    name: 'total_revenue',
    default: 0,
  })
  totalRevenue: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    name: 'total_cost',
    default: 0,
    nullable: true,
  })
  totalCost: number | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    name: 'total_profit',
    default: 0,
    nullable: true,
  })
  totalProfit: number | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    name: 'avg_unit_price',
    nullable: true,
  })
  avgUnitPrice: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper method to calculate profit margin
  getProfitMargin(): number | null {
    if (!this.totalCost || !this.totalRevenue || this.totalCost === 0) {
      return null;
    }
    return ((this.totalRevenue - this.totalCost) / this.totalCost) * 100;
  }
}
