import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Sale } from './Sale.entity';
import { Product } from './Product.entity';

@Entity('sale_details')
@Index(['saleId'])
@Index(['productId'])
export class SaleDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sale_id' })
  saleId: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ type: 'nvarchar', length: '300' })
  description: string; // Descripción del producto al momento de la venta

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  quantity: number;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  unitPrice: number;

  @Column({
    name: 'tax_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 19,
  })
  taxPercentage: number;

  @Column({
    name: 'discount_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  discountPercentage: number;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  discountAmount: number;

  @Column({
    name: 'line_total',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  lineTotal: number; // Total de la línea

  @Column({ name: 'is_kit', default: false })
  isKit: boolean; // Indica si es un kit que debe descontar componentes

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string | null; // JSON

  // Relations
  @ManyToOne(() => Sale, (sale) => sale.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // Helper methods
  getMetadata(): any {
    return this.metadata ? JSON.parse(this.metadata) : {};
  }

  setMetadata(metadata: any): void {
    this.metadata = JSON.stringify(metadata);
  }

  // Calcula el total de la línea
  calculateLineTotal(): void {
    const subtotal = this.quantity * this.unitPrice;
    const discount = this.discountPercentage
      ? (subtotal * this.discountPercentage) / 100
      : this.discountAmount;
    const subtotalAfterDiscount = subtotal - discount;
    const tax = (subtotalAfterDiscount * this.taxPercentage) / 100;
    this.lineTotal = subtotalAfterDiscount + tax;
  }

  // Calcula solo el subtotal sin impuestos
  getSubtotal(): number {
    const subtotal = this.quantity * this.unitPrice;
    const discount = this.discountPercentage
      ? (subtotal * this.discountPercentage) / 100
      : this.discountAmount;
    return subtotal - discount;
  }

  // Calcula solo el impuesto
  getTaxAmount(): number {
    return (this.getSubtotal() * this.taxPercentage) / 100;
  }
}
