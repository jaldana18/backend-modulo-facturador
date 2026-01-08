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

@Entity('payment_methods')
@Index(['companyId', 'code'], { unique: true })
@Index(['companyId', 'isActive'])
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id', nullable: true })
  companyId: number | null;

  @Column({ type: 'nvarchar', length: '100' })
  name: string; // Efectivo, Tarjeta, Transferencia, etc.

  @Column({ type: 'nvarchar', length: '50' })
  code: string; // cash, card, transfer, check, etc.

  @Column({ type: 'nvarchar', length: '100', nullable: true })
  channel: string | null; // Canal/billetera: nequi, daviplata, bancolombia, etc.

  @Column({ name: 'requires_reference', default: false })
  requiresReference: boolean; // Si requiere número de referencia

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string | null; // JSON para configuración adicional

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  // Helper methods
  getMetadata(): any {
    return this.metadata ? JSON.parse(this.metadata) : {};
  }

  setMetadata(metadata: any): void {
    this.metadata = JSON.stringify(metadata);
  }
}
