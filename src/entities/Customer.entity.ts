import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Company } from './Company.entity';

export enum DocumentType {
  CC = 'CC', // Cédula de Ciudadanía
  NIT = 'NIT', // Número de Identificación Tributaria
  CE = 'CE', // Cédula de Extranjería
  PASSPORT = 'PASSPORT', // Pasaporte
}

export enum CustomerType {
  RETAIL = 'retail', // Minorista
  WHOLESALE = 'wholesale', // Mayorista
  VIP = 'vip', // VIP
  DISTRIBUTOR = 'distributor', // Distribuidor
}

@Entity('customers')
@Index(['companyId', 'code'], { unique: true })
@Index(['companyId', 'documentNumber'], { unique: true })
@Index(['companyId', 'isActive'])
@Index(['companyId', 'customerType'])
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ type: 'nvarchar', length: '20' })
  code: string; // Código único del cliente

  @Column({
    name: 'document_type',
    type: 'varchar',
    length: '20',
    default: DocumentType.CC,
  })
  documentType: DocumentType;

  @Column({ name: 'document_number', type: 'nvarchar', length: '50' })
  documentNumber: string; // Número de documento

  @Column({ type: 'nvarchar', length: '200' })
  name: string; // Nombre o razón social

  @Column({ type: 'nvarchar', length: '200', nullable: true })
  email: string | null;

  @Column({ type: 'nvarchar', length: '50', nullable: true })
  phone: string | null;

  @Column({ type: 'nvarchar', length: '500', nullable: true })
  address: string | null;

  @Column({ type: 'nvarchar', length: '100', nullable: true })
  city: string | null;

  @Column({ type: 'nvarchar', length: '100', nullable: true })
  state: string | null;

  @Column({ name: 'zip_code', type: 'nvarchar', length: '20', nullable: true })
  zipCode: string | null;

  @Column({
    name: 'credit_limit',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  creditLimit: number;

  @Column({
    name: 'current_balance',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  currentBalance: number; // Saldo actual de crédito

  @Column({
    name: 'customer_type',
    type: 'varchar',
    length: 50,
    default: CustomerType.RETAIL,
  })
  customerType: CustomerType;

  @Column({ name: 'tax_responsible', default: false })
  taxResponsible: boolean; // Responsable de IVA

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  notes: string | null;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string | null; // JSON para campos adicionales

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

  // Verifica si el cliente tiene crédito disponible
  hasAvailableCredit(amount: number): boolean {
    const availableCredit = this.creditLimit - this.currentBalance;
    return availableCredit >= amount;
  }

  // Calcula el crédito disponible
  getAvailableCredit(): number {
    return Math.max(0, this.creditLimit - this.currentBalance);
  }

  // Verifica si el cliente está en buen estado para vender
  canSell(): boolean {
    return this.isActive && this.currentBalance <= this.creditLimit;
  }
}
