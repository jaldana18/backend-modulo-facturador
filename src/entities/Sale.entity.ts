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
import { Customer } from './Customer.entity';
import { User } from './User.entity';
import { Warehouse } from './Warehouse.entity';
import { SaleDetail } from './SaleDetail.entity';
import { Payment } from './Payment.entity';

export enum SaleStatus {
  DRAFT = 'draft', // Borrador
  QUOTED = 'quoted', // Cotización
  PROFORMA = 'proforma', // Factura proforma
  CONFIRMED = 'confirmed', // Confirmada
  INVOICED = 'invoiced', // Facturada
  DISPATCHED = 'dispatched', // Despachada
  DELIVERED = 'delivered', // Entregada
  CANCELLED = 'cancelled', // Cancelada
  CREDITED = 'credited', // Con nota crédito
}

export enum SaleType {
  QUOTE = 'quote', // Cotización
  PROFORMA = 'proforma', // Factura proforma
  INVOICE = 'invoice', // Factura
  REMISSION = 'remission', // Remisión
  CREDIT_NOTE = 'credit_note', // Nota crédito
}

export enum PaymentStatus {
  PENDING = 'pending', // Pendiente
  PARTIAL = 'partial', // Pago parcial
  PAID = 'paid', // Pagado
  OVERDUE = 'overdue', // Vencido
}

export enum DiscountType {
  NONE = 'none', // Sin descuento
  PERCENTAGE = 'percentage', // Descuento porcentual
  FIXED = 'fixed', // Descuento fijo en monto
}

@Entity('sales')
@Index(['companyId', 'saleNumber'], { unique: true })
@Index(['companyId', 'status'])
@Index(['companyId', 'saleType'])
@Index(['companyId', 'customerId'])
@Index(['companyId', 'saleDate'])
@Index(['companyId', 'paymentStatus'])
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'sale_number', type: 'nvarchar', length: '50', unique: true })
  saleNumber: string; // Número de venta único

  @Column({
    name: 'sale_type',
    type: 'varchar',
    length: '20',
    default: SaleType.INVOICE,
  })
  saleType: SaleType;

  @Column({
    type: 'varchar',
    length: '20',
    default: SaleStatus.DRAFT,
  })
  status: SaleStatus;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'user_id' })
  userId: number; // Usuario que creó la venta

  @Column({ name: 'warehouse_id', nullable: true })
  warehouseId: number | null;

  @Column({ name: 'sale_date', type: 'datetime' })
  saleDate: Date;

  @Column({ name: 'due_date', type: 'datetime', nullable: true })
  dueDate: Date | null; // Fecha de vencimiento para crédito

  @Column({
    name: 'subtotal',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  subtotal: number;

  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  taxAmount: number; // IVA

  @Column({
    name: 'tax_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 19,
  })
  taxPercentage: number; // Porcentaje de IVA (19% en Colombia)

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  discountAmount: number;

  @Column({
    name: 'discount_type',
    type: 'varchar',
    length: '20',
    default: DiscountType.NONE,
    nullable: true,
  })
  discountType: DiscountType;

  @Column({
    name: 'discount_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    nullable: true,
  })
  discountPercentage: number;

  @Column({
    name: 'discount_reason',
    type: 'nvarchar',
    length: '500',
    nullable: true,
  })
  discountReason: string | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  total: number;

  @Column({
    name: 'paid_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  paidAmount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  balance: number; // Saldo pendiente

  @Column({
    name: 'payment_status',
    type: 'varchar',
    length: '20',
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  // Campos preparatorios para integración futura con proveedor externo de facturación electrónica
  @Column({ name: 'external_invoice_id', type: 'nvarchar', length: '100', nullable: true })
  externalInvoiceId: string | null; // ID de factura del proveedor externo

  @Column({ name: 'external_invoice_provider', type: 'nvarchar', length: '50', nullable: true })
  externalInvoiceProvider: string | null; // Nombre del proveedor (ej: "alegra", "siigo", etc)

  @Column({ name: 'external_invoice_data', type: 'nvarchar', length: 'max', nullable: true })
  externalInvoiceData: string | null; // JSON con datos de la factura externa

  @Column({ name: 'reference_sale_id', nullable: true })
  referenceSaleId: number | null; // Referencia a venta original (para notas crédito)

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

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse | null;

  @OneToMany(() => SaleDetail, (detail) => detail.sale, { cascade: true })
  details: SaleDetail[];

  @OneToMany(() => Payment, (payment) => payment.sale)
  payments: Payment[];

  @ManyToOne(() => Sale)
  @JoinColumn({ name: 'reference_sale_id' })
  referenceSale: Sale | null; // Venta original para notas crédito

  // Helper methods
  getMetadata(): any {
    return this.metadata ? JSON.parse(this.metadata) : {};
  }

  setMetadata(metadata: any): void {
    this.metadata = JSON.stringify(metadata);
  }

  // Calcula totales
  calculateTotals(): void {
    // El subtotal debe calcularse desde los detalles
    // Calcular descuento según tipo
    if (this.discountType === DiscountType.PERCENTAGE && this.discountPercentage) {
      this.discountAmount = (this.subtotal * this.discountPercentage) / 100;
    } else if (this.discountType === DiscountType.FIXED) {
      // discountAmount ya está establecido
    } else {
      this.discountAmount = 0;
    }

    this.taxAmount = (this.subtotal * this.taxPercentage) / 100;
    this.total = this.subtotal + this.taxAmount - this.discountAmount;
    this.balance = this.total - this.paidAmount;
  }

  // Verifica si es borrador y puede editarse
  isDraft(): boolean {
    return this.status === SaleStatus.DRAFT;
  }

  // Verifica si puede cancelarse
  canCancel(): boolean {
    return this.status !== SaleStatus.CANCELLED && this.status !== SaleStatus.CREDITED;
  }

  // Verifica si afecta inventario
  affectsInventory(): boolean {
    return [
      SaleStatus.CONFIRMED,
      SaleStatus.INVOICED,
      SaleStatus.DISPATCHED,
      SaleStatus.DELIVERED,
    ].includes(this.status);
  }

  // Actualiza el estado de pago
  updatePaymentStatus(): void {
    if (this.paidAmount === 0) {
      this.paymentStatus = PaymentStatus.PENDING;
    } else if (this.paidAmount >= this.total) {
      this.paymentStatus = PaymentStatus.PAID;
    } else {
      this.paymentStatus = PaymentStatus.PARTIAL;
    }

    // Check overdue
    if (
      this.dueDate &&
      this.dueDate < new Date() &&
      this.paymentStatus !== PaymentStatus.PAID
    ) {
      this.paymentStatus = PaymentStatus.OVERDUE;
    }
  }
}
