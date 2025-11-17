import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Company } from './Company.entity';
import { Product } from './Product.entity';
import { User } from './User.entity';
import { Warehouse } from './Warehouse.entity';

export enum TransactionType {
  INBOUND = 'inbound',   // Entrada de mercancía
  OUTBOUND = 'outbound', // Salida de mercancía
  ADJUSTMENT = 'adjustment', // Ajuste de inventario
  TRANSFER = 'transfer', // Transferencia entre ubicaciones
}

export enum TransactionReason {
  PURCHASE = 'purchase',           // Compra a proveedor
  SALE = 'sale',                   // Venta a cliente
  RETURN = 'return',               // Devolución
  DAMAGED = 'damaged',             // Producto dañado
  LOST = 'lost',                   // Producto perdido
  FOUND = 'found',                 // Producto encontrado
  CORRECTION = 'correction',       // Corrección de inventario
  INITIAL_STOCK = 'initial_stock', // Inventario inicial
  TRANSFER_IN = 'transfer_in',     // Transferencia entrante
  TRANSFER_OUT = 'transfer_out',   // Transferencia saliente
  OTHER = 'other',                 // Otro motivo
}

@Entity('inventory_transactions')
@Index(['companyId', 'productId'])
@Index(['companyId', 'type'])
@Index(['companyId', 'createdAt'])
@Index(['userId'])
export class InventoryTransaction {
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

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'warehouse_id', nullable: true })
  warehouseId: number | null;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse | null;

  @Column({
    type: 'nvarchar',
    length: 20,
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'nvarchar',
    length: 50,
    enum: TransactionReason,
  })
  reason: TransactionReason;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
  })
  quantity: number;

  @Column({
    name: 'previous_stock',
    type: 'decimal',
    precision: 18,
    scale: 4,
  })
  previousStock: number;

  @Column({
    name: 'new_stock',
    type: 'decimal',
    precision: 18,
    scale: 4,
  })
  newStock: number;

  @Column({
    name: 'unit_cost',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  unitCost: number | null;

  @Column({
    name: 'total_cost',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  totalCost: number | null;

  @Column({
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  reference: string | null; // Número de orden, factura, etc.

  @Column({
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  location: string | null; // Ubicación del almacén

  @Column({
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  notes: string | null;

  @Column({
    type: 'nvarchar',
    length: 'max',
    nullable: true,
  })
  metadata: string | null; // JSON string para campos adicionales

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Helper method to parse metadata JSON
  getMetadata(): any {
    return this.metadata ? JSON.parse(this.metadata) : {};
  }

  // Helper method to set metadata JSON
  setMetadata(metadata: any): void {
    this.metadata = JSON.stringify(metadata);
  }

  // Check if transaction increases stock
  isInbound(): boolean {
    return this.type === TransactionType.INBOUND ||
           this.type === TransactionType.ADJUSTMENT && this.quantity > 0;
  }

  // Check if transaction decreases stock
  isOutbound(): boolean {
    return this.type === TransactionType.OUTBOUND ||
           this.type === TransactionType.ADJUSTMENT && this.quantity < 0;
  }

  // Get absolute quantity
  getAbsoluteQuantity(): number {
    return Math.abs(this.quantity);
  }

  // Calculate stock change
  getStockChange(): number {
    return this.newStock - this.previousStock;
  }
}
