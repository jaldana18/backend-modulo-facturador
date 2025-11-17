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

@Entity('warehouses')
@Index(['companyId'])
@Index(['companyId', 'isActive'])
@Index(['companyId', 'code'], { unique: true })
export class Warehouse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'nvarchar', length: 50 })
  code: string;

  @Column({ type: 'nvarchar', length: 200 })
  name: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  address: string | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  state: string | null;

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  zip: string | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  email: string | null;

  @Column({ name: 'manager_name', type: 'nvarchar', length: 200, nullable: true })
  managerName: string | null;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive: boolean;

  @Column({ name: 'is_main', type: 'bit', default: false })
  isMain: boolean;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  metadata: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  getMetadata(): any {
    return this.metadata ? JSON.parse(this.metadata) : null;
  }

  setMetadata(data: any): void {
    this.metadata = data ? JSON.stringify(data) : null;
  }

  getFullAddress(): string {
    const parts = [this.address, this.city, this.state, this.zip, this.country].filter(
      (part) => part
    );
    return parts.join(', ');
  }
}
