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
import { Sale } from './Sale.entity';
import { PaymentMethod } from './PaymentMethod.entity';

export enum PaymentStatusEnum {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

@Entity('payments')
@Index(['companyId', 'paymentNumber'], { unique: true })
@Index(['companyId', 'saleId'])
@Index(['companyId', 'status'])
@Index(['companyId', 'paymentDate'])
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'sale_id' })
  saleId: number;

  @Column({ name: 'payment_method_id' })
  paymentMethodId: number;

  @Column({ name: 'payment_number', type: 'nvarchar', length: '50', unique: true })
  paymentNumber: string; // Número de recibo de pago

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  @Column({ name: 'payment_date', type: 'datetime2' })
  paymentDate: Date;

  @Column({
    type: 'varchar',
    length: '20',
    default: PaymentStatusEnum.COMPLETED,
  })
  status: PaymentStatusEnum;

  @Column({ name: 'reference_number', type: 'nvarchar', length: '100', nullable: true })
  referenceNumber: string | null; // Número de transacción, cheque, etc.

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  notes: string | null;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string | null; // JSON

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Sale, (sale) => sale.payments)
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @ManyToOne(() => PaymentMethod)
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod: PaymentMethod;

  // Helper methods
  getMetadata(): any {
    return this.metadata ? JSON.parse(this.metadata) : {};
  }

  setMetadata(metadata: any): void {
    this.metadata = JSON.stringify(metadata);
  }

  // Verifica si el pago es válido
  isValid(): boolean {
    return this.amount > 0 && this.status === PaymentStatusEnum.COMPLETED;
  }

  // Verifica si puede reembolsarse
  canRefund(): boolean {
    return this.status === PaymentStatusEnum.COMPLETED;
  }
}
