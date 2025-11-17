import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { InventoryBatch } from './InventoryBatch.entity';
import { InventoryTransaction } from './InventoryTransaction.entity';
import { User } from './User.entity';

@Entity('batch_allocations')
@Index(['batchId'])
@Index(['transactionId'])
@Index(['salesOrderId'])
@Index(['invoiceId'])
@Index(['createdAt'])
@Index(['userId'])
export class BatchAllocation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'batch_id' })
  batchId: number;

  @ManyToOne(() => InventoryBatch, (batch) => batch.allocations)
  @JoinColumn({ name: 'batch_id' })
  batch: InventoryBatch;

  @Column({ name: 'transaction_id' })
  transactionId: number;

  @ManyToOne(() => InventoryTransaction)
  @JoinColumn({ name: 'transaction_id' })
  transaction: InventoryTransaction;

  // === FUTURE INTEGRATION REFERENCES ===
  @Column({ name: 'sales_order_id', type: 'int', nullable: true })
  salesOrderId: number | null;

  @Column({ name: 'invoice_id', type: 'int', nullable: true })
  invoiceId: number | null;

  @Column({ name: 'invoice_line_id', type: 'int', nullable: true })
  invoiceLineId: number | null;

  // === QUANTITIES AND COSTS ===
  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 18, scale: 4 })
  unitCost: number;

  @Column({ name: 'total_cost', type: 'decimal', precision: 18, scale: 4 })
  totalCost: number;

  // === AUDIT FIELDS ===
  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // === HELPER METHODS ===

  /**
   * Get cost per unit
   */
  getCostPerUnit(): number {
    if (this.quantity === 0) {
      return 0;
    }
    return this.totalCost / this.quantity;
  }

  /**
   * Verify that total cost matches unit cost * quantity
   */
  isCostConsistent(): boolean {
    const expectedTotal = this.unitCost * this.quantity;
    // Allow for small floating point differences
    return Math.abs(expectedTotal - this.totalCost) < 0.01;
  }
}
