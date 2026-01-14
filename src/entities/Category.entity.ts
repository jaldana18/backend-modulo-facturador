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

@Entity('categories')
@Index(['companyId', 'name'], { unique: true })
@Index(['companyId', 'isActive'])
@Index(['companyId', 'sortOrder'])
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id', nullable: true })
  companyId: number | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company | null;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string | null; // Hex color for UI (e.g., "#3B82F6")

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null; // Icon name for UI (e.g., "laptop", "box", "briefcase")

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Optional: For hierarchical categories (parent/child)
  @Column({ name: 'parent_id', nullable: true })
  parentId: number | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Category | null;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper method to check if category has products
  hasProducts(): boolean {
    return this.products && this.products.length > 0;
  }

  // Helper method to get full path for hierarchical categories
  getFullPath(): string {
    if (!this.parent) {
      return this.name;
    }
    return `${this.parent.getFullPath()} > ${this.name}`;
  }
}
