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
import { Category } from './Category.entity';
import { UnitOfMeasure } from './UnitOfMeasure.entity';
import { numericEncryptionTransformer } from '../utils/encryption.util';

@Entity('products')
@Index(['companyId', 'sku'], { unique: true })
@Index(['companyId', 'isActive'])
@Index(['companyId', 'categoryId'])
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ length: 100 })
  sku: string;

  @Column({ length: 300 })
  name: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  description: string | null;

  // Legacy field - kept for backward compatibility, use categoryId instead
  @Column({ type: 'nvarchar', length: 100, nullable: true })
  category: string | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId: number | null;

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'category_id' })
  categoryRelation: Category | null;

  // Legacy field - kept for backward compatibility, use unitOfMeasureId instead
  @Column({ name: 'unit_of_measure', length: 50 })
  unitOfMeasure: string;

  @Column({ name: 'unit_of_measure_id', nullable: true })
  unitOfMeasureId: number | null;

  @ManyToOne(() => UnitOfMeasure, (unit) => unit.products)
  @JoinColumn({ name: 'unit_of_measure_id' })
  unitOfMeasureRelation: UnitOfMeasure | null;

  @Column({
    name: 'minimum_stock',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  minimumStock: number;

  @Column({
    name: 'reorder_point',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  reorderPoint: number;

  @Column({
    type: 'nvarchar',
    length: 500,
    nullable: true,
    transformer: numericEncryptionTransformer,
  })
  cost: number;

  @Column({
    type: 'nvarchar',
    length: 500,
    nullable: true,
    transformer: numericEncryptionTransformer,
  })
  price: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'image_url', type: 'nvarchar', length: 500, nullable: true })
  imageUrl: string | null; // URL or relative path to product image

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string | null; // JSON string for additional fields

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper method to parse metadata JSON
  getMetadata(): any {
    return this.metadata ? JSON.parse(this.metadata) : {};
  }

  // Helper method to set metadata JSON
  setMetadata(metadata: any): void {
    this.metadata = JSON.stringify(metadata);
  }

  // Check if stock is below minimum
  isBelowMinimum(currentStock: number): boolean {
    return currentStock < this.minimumStock;
  }

  // Check if stock should trigger reorder
  shouldReorder(currentStock: number): boolean {
    return currentStock <= this.reorderPoint;
  }

  // Calculate profit margin (if cost and price are set)
  getProfitMargin(): number | null {
    if (!this.cost || !this.price) return null;
    return ((this.price - this.cost) / this.cost) * 100;
  }
}
