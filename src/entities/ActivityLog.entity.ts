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
import { User } from './User.entity';

/**
 * Activity types for business operations
 */
export enum ActivityType {
  // Inventory operations
  INVENTORY_UPLOAD = 'inventory_upload',
  INVENTORY_ADJUSTMENT = 'inventory_adjustment',
  INVENTORY_TRANSFER = 'inventory_transfer',
  INVENTORY_RECEIVE = 'inventory_receive',
  
  // Product operations
  PRODUCT_CREATE = 'product_create',
  PRODUCT_UPDATE = 'product_update',
  PRODUCT_DELETE = 'product_delete',
  PRODUCT_BULK_UPLOAD = 'product_bulk_upload',
  
  // Sales operations
  SALE_CREATE = 'sale_create',
  SALE_CANCEL = 'sale_cancel',
  SALE_PAYMENT_RECEIVED = 'sale_payment_received',
  
  // Customer operations
  CUSTOMER_CREATE = 'customer_create',
  CUSTOMER_UPDATE = 'customer_update',
  CUSTOMER_CREDIT_INCREASE = 'customer_credit_increase',
  CUSTOMER_CREDIT_DECREASE = 'customer_credit_decrease',
  
  // User operations
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_PASSWORD_RESET = 'user_password_reset',
  
  // Warehouse operations
  WAREHOUSE_CREATE = 'warehouse_create',
  WAREHOUSE_UPDATE = 'warehouse_update',
  
  // Batch operations
  BATCH_CREATE = 'batch_create',
  BATCH_ALLOCATE = 'batch_allocate',
  BATCH_EXPIRE = 'batch_expire',
  
  // Payment operations
  PAYMENT_CREATE = 'payment_create',
  PAYMENT_VOID = 'payment_void',
  
  // Other
  OTHER = 'other',
}

/**
 * Entity to store business activity logs
 */
@Entity('activity_logs')
@Index(['companyId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['activityType', 'createdAt'])
@Index(['companyId', 'activityType'])
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'activity_type',
    type: 'nvarchar',
    length: 50,
  })
  activityType: ActivityType;

  @Column({
    name: 'activity_description',
    type: 'nvarchar',
    length: 500,
  })
  activityDescription: string; // Human-readable description

  @Column({
    name: 'entity_type',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  entityType: string | null; // e.g., 'product', 'sale', 'customer'

  @Column({
    name: 'entity_id',
    type: 'int',
    nullable: true,
  })
  entityId: number | null; // ID of the affected entity

  @Column({
    name: 'entity_name',
    type: 'nvarchar',
    length: 200,
    nullable: true,
  })
  entityName: string | null; // Name of the affected entity for display

  @Column({
    name: 'metadata',
    type: 'nvarchar',
    length: 'max',
    nullable: true,
  })
  metadata: string | null; // JSON with additional details

  @Column({
    name: 'ip_address',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  ipAddress: string | null;

  @Column({
    name: 'user_agent',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

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
}
