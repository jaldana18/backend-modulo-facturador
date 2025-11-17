import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Company } from './Company.entity';
import { UserRole } from '../common.types';
import { hashPassword } from '../utils/encryption.util';

@Entity('users')
@Index(['companyId'])
@Index(['email'], { unique: true })
@Index(['companyId', 'isActive'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @ManyToOne(() => Company, (company) => company.users)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ length: 200, unique: true })
  email: string;

  @Column({ name: 'password_hash', length: 500 })
  passwordHash: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ length: 50 })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login', type: 'datetime2', nullable: true })
  lastLogin: Date;

  @Column({ name: 'refresh_token', type: 'nvarchar', length: 500, nullable: true })
  refreshToken: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual field for password (not stored)
  private tempPassword?: string;

  // Helper to set password (will be hashed before save)
  setPassword(password: string): void {
    this.tempPassword = password;
  }

  // Hash password before insert
  @BeforeInsert()
  @BeforeUpdate()
  async hashPasswordBeforeSave(): Promise<void> {
    if (this.tempPassword) {
      this.passwordHash = await hashPassword(this.tempPassword);
      this.tempPassword = undefined;
    }
  }

  // Get full name
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // Convert to safe object (exclude sensitive data)
  toSafeObject(): Omit<User, 'passwordHash' | 'refreshToken'> {
    const { passwordHash, refreshToken, ...safeUser } = this;
    return safeUser as any;
  }
}
