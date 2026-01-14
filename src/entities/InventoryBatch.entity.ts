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
import { Product } from './Product.entity';
import { Warehouse } from './Warehouse.entity';
import { InventoryTransaction } from './InventoryTransaction.entity';
import { BatchAllocation } from './BatchAllocation.entity';
import { BatchReservation } from './BatchReservation.entity';

export enum BatchStatus {
  ACTIVE = 'active',
  DEPLETED = 'depleted',
  EXPIRED = 'expired',
  BLOCKED = 'blocked',
  RESERVED = 'reserved',
}

@Entity('inventory_batches')
@Index(['companyId', 'batchNumber'], { unique: true })
@Index(['companyId', 'productId'])
@Index(['companyId', 'status'])
@Index(['productId', 'status'])
@Index(['expiryDate'])
@Index(['warehouseId', 'productId'])
export class InventoryBatch {
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

  @Column({ name: 'warehouse_id', type: 'int', nullable: true })
  warehouseId: number | null;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse | null;

  @Column({ name: 'batch_number', type: 'nvarchar', length: 100 })
  batchNumber: string;

  @Column({ name: 'purchase_transaction_id' })
  purchaseTransactionId: number;

  @ManyToOne(() => InventoryTransaction)
  @JoinColumn({ name: 'purchase_transaction_id' })
  purchaseTransaction: InventoryTransaction;

  // === QUANTITIES ===
  @Column({
    name: 'quantity_received',
    type: 'decimal',
    precision: 18,
    scale: 4,
  })
  quantityReceived: number;

  @Column({
    name: 'quantity_available',
    type: 'decimal',
    precision: 18,
    scale: 4,
  })
  quantityAvailable: number;

  @Column({
    name: 'quantity_reserved',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  quantityReserved: number;

  @Column({
    name: 'quantity_allocated',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  quantityAllocated: number;

  // === COSTS ===
  @Column({
    name: 'unit_cost',
    type: 'decimal',
    precision: 18,
    scale: 4,
  })
  unitCost: number;

  @Column({
    name: 'total_cost',
    type: 'decimal',
    precision: 18,
    scale: 4,
  })
  totalCost: number;

  // === ADDITIONAL INFORMATION ===
  @Column({ name: 'supplier_id', type: 'int', nullable: true })
  supplierId: number | null;

  @Column({ name: 'purchase_date', type: 'datetime2' })
  purchaseDate: Date;

  @Column({ name: 'expiry_date', type: 'datetime2', nullable: true })
  expiryDate: Date | null;

  @Column({ name: 'lot_number', type: 'nvarchar', length: 100, nullable: true })
  lotNumber: string | null;

  @Column({ name: 'serial_numbers', type: 'nvarchar', length: 'max', nullable: true })
  serialNumbers: string | null; // JSON array

  // === STATUS ===
  @Column({ type: 'nvarchar', length: 20, default: BatchStatus.ACTIVE })
  status: BatchStatus;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  notes: string | null;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  metadata: string | null; // JSON string

  // === AUDIT FIELDS ===
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // === RELATIONS ===
  @OneToMany(() => BatchAllocation, (allocation) => allocation.batch)
  allocations: BatchAllocation[];

  @OneToMany(() => BatchReservation, (reservation) => reservation.batch)
  reservations: BatchReservation[];

  // === HELPER METHODS ===

  /**
   * Check if batch is depleted (no available quantity)
   */
  isDepleted(): boolean {
    return this.quantityAvailable === 0;
  }

  /**
   * Check if batch can allocate the requested quantity
   */
  canAllocate(quantity: number): boolean {
    return (
      this.quantityAvailable >= quantity &&
      this.status === BatchStatus.ACTIVE &&
      !this.isExpired()
    );
  }

  /**
   * Check if batch is expired
   */
  isExpired(): boolean {
    if (!this.expiryDate) {
      return false;
    }
    return this.expiryDate < new Date();
  }

  /**
   * Get days until expiry
   */
  getDaysUntilExpiry(): number | null {
    if (!this.expiryDate) {
      return null;
    }
    const now = new Date();
    const diffTime = this.expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Parse metadata JSON
   */
  getMetadata(): any {
    return this.metadata ? JSON.parse(this.metadata) : {};
  }

  /**
   * Set metadata JSON
   */
  setMetadata(metadata: any): void {
    this.metadata = JSON.stringify(metadata);
  }

  /**
   * Parse serial numbers JSON
   */
  getSerialNumbers(): string[] {
    return this.serialNumbers ? JSON.parse(this.serialNumbers) : [];
  }

  /**
   * Set serial numbers JSON
   */
  setSerialNumbers(serialNumbers: string[]): void {
    this.serialNumbers = JSON.stringify(serialNumbers);
  }

  /**
   * Check if batch should trigger reorder alert
   */
  isLowStock(): boolean {
    const threshold = this.quantityReceived * 0.2; // 20% threshold
    return this.quantityAvailable <= threshold;
  }

  /**
   * Get percentage of stock remaining
   */
  getStockPercentage(): number {
    if (this.quantityReceived === 0) {
      return 0;
    }
    return (this.quantityAvailable / this.quantityReceived) * 100;
  }
}
