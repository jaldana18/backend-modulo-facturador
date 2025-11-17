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
import { InventoryBatch } from './InventoryBatch.entity';
import { User } from './User.entity';

export enum ReservationStatus {
  ACTIVE = 'active',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('batch_reservations')
@Index(['batchId'])
@Index(['status'])
@Index(['batchId', 'status'])
@Index(['salesOrderId'])
@Index(['expiresAt'])
@Index(['userId'])
export class BatchReservation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'batch_id' })
  batchId: number;

  @ManyToOne(() => InventoryBatch, (batch) => batch.reservations)
  @JoinColumn({ name: 'batch_id' })
  batch: InventoryBatch;

  @Column({ name: 'sales_order_id', type: 'int', nullable: true })
  salesOrderId: number | null;

  // === QUANTITIES ===
  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity: number;

  // === STATUS AND EXPIRATION ===
  @Column({
    type: 'nvarchar',
    length: 20,
    default: ReservationStatus.ACTIVE,
  })
  status: ReservationStatus;

  @Column({ name: 'expires_at', type: 'datetime2', nullable: true })
  expiresAt: Date | null;

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

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // === HELPER METHODS ===

  /**
   * Check if reservation is active
   */
  isActive(): boolean {
    return this.status === ReservationStatus.ACTIVE && !this.isExpired();
  }

  /**
   * Check if reservation is expired
   */
  isExpired(): boolean {
    if (!this.expiresAt) {
      return false;
    }
    return this.expiresAt < new Date() && this.status === ReservationStatus.ACTIVE;
  }

  /**
   * Get time remaining in hours
   */
  getHoursRemaining(): number | null {
    if (!this.expiresAt || this.status !== ReservationStatus.ACTIVE) {
      return null;
    }
    const now = new Date();
    const diffTime = this.expiresAt.getTime() - now.getTime();
    return Math.max(0, diffTime / (1000 * 60 * 60));
  }

  /**
   * Mark reservation as fulfilled
   */
  fulfill(): void {
    this.status = ReservationStatus.FULFILLED;
  }

  /**
   * Mark reservation as cancelled
   */
  cancel(): void {
    this.status = ReservationStatus.CANCELLED;
  }

  /**
   * Mark reservation as expired
   */
  expire(): void {
    this.status = ReservationStatus.EXPIRED;
  }

  /**
   * Check if reservation can be fulfilled
   */
  canFulfill(): boolean {
    return this.status === ReservationStatus.ACTIVE && !this.isExpired();
  }
}
