import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Company } from './Company.entity';
import { Product } from './Product.entity';

@Entity('unit_of_measures')
@Index(['companyId', 'code'], { unique: true })
@Index(['companyId', 'isActive'])
export class UnitOfMeasure {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ length: 20 })
  code: string; // e.g., "KG", "L", "M", "UNIT", "BOX"

  @Column({ length: 100 })
  name: string; // e.g., "Kilogram", "Liter", "Meter", "Unit", "Box"

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  symbol: string | null; // e.g., "kg", "l", "m", "un", "box"

  @Column({ name: 'is_base_unit', default: false })
  isBaseUnit: boolean; // True for standard SI units or primary units

  @Column({ name: 'base_unit_id', nullable: true })
  baseUnitId: number | null; // For conversion (e.g., gram -> kilogram)

  @ManyToOne(() => UnitOfMeasure, { nullable: true })
  @JoinColumn({ name: 'base_unit_id' })
  baseUnit: UnitOfMeasure | null;

  @Column({
    name: 'conversion_factor',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  conversionFactor: number | null; // e.g., 1000 (grams per kilogram)

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Product, (product) => product.unitOfMeasureRelation)
  products: Product[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper method to check if unit has products
  hasProducts(): boolean {
    return this.products && this.products.length > 0;
  }

  // Helper method to convert to base unit
  convertToBaseUnit(quantity: number): number | null {
    if (!this.baseUnit || !this.conversionFactor) {
      return this.isBaseUnit ? quantity : null;
    }
    return quantity * this.conversionFactor;
  }

  // Helper method to convert from base unit
  convertFromBaseUnit(quantity: number): number | null {
    if (!this.baseUnit || !this.conversionFactor) {
      return this.isBaseUnit ? quantity : null;
    }
    return quantity / this.conversionFactor;
  }
}
