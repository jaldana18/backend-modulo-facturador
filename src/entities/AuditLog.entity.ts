import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User.entity';
import { Company } from './Company.entity';

/**
 * Audit log entity for tracking all user actions in the system
 * Stores comprehensive audit trail for compliance, security, and troubleshooting
 */
@Entity('audit_logs')
@Index(['companyId', 'createdAt']) // For efficient company-based queries with time range
@Index(['userId', 'createdAt']) // For user activity history
@Index(['entityType', 'entityId']) // For entity-specific audit trail
@Index(['action']) // For filtering by action type
@Index(['createdAt']) // For time-based queries
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id', type: 'int' })
  companyId: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * Action type performed by the user
   * Examples: CREATE, UPDATE, DELETE, ACTIVATE, DEACTIVATE, LOGIN, LOGOUT
   */
  @Column({ type: 'varchar', length: 50 })
  action: string;

  /**
   * Entity type that was affected
   * Examples: Product, User, Customer, Warehouse, InventoryTransaction, Sale
   */
  @Column({ name: 'entity_type', type: 'varchar', length: 100 })
  entityType: string;

  /**
   * ID of the affected entity (if applicable)
   */
  @Column({ name: 'entity_id', type: 'int', nullable: true })
  entityId: number | null;

  /**
   * Human-readable description of the action
   * Example: "Usuario creó producto 'Laptop Dell XPS 15' (SKU: PROD-001)"
   */
  @Column({ type: 'nvarchar', length: 500 })
  description: string;

  /**
   * IP address of the user who performed the action
   */
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  /**
   * User agent string (browser/client information)
   */
  @Column({ name: 'user_agent', type: 'nvarchar', length: 500, nullable: true })
  userAgent: string | null;

  /**
   * Previous values before the change (for UPDATE actions)
   * Stored as JSON string
   */
  @Column({ name: 'old_values', type: 'nvarchar', length: 'MAX', nullable: true })
  oldValues: string | null;

  /**
   * New values after the change
   * Stored as JSON string
   */
  @Column({ name: 'new_values', type: 'nvarchar', length: 'MAX', nullable: true })
  newValues: string | null;

  /**
   * Additional metadata about the action
   * Stored as JSON string
   * Can include: warehouseId, reference numbers, batch info, etc.
   */
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  metadata: string | null;

  /**
   * Severity level of the action
   * info: Normal operations (CREATE, READ)
   * warning: Important changes (UPDATE, DEACTIVATE)
   * critical: Destructive actions (DELETE, major configuration changes)
   */
  @Column({ type: 'varchar', length: 20, default: 'info' })
  severity: 'info' | 'warning' | 'critical';

  /**
   * Module or feature where the action occurred
   * Examples: inventory, sales, users, products, warehouses
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  module: string | null;

  /**
   * Timestamp when the action was performed
   */
  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;
}
