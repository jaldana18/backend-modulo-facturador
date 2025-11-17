import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { User } from './User.entity';
import { encryptionTransformer } from '../utils/encryption.util';

@Entity('companies')
@Index(['isActive'])
@Index(['taxId'], { unique: true })
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'legal_name', length: 300, nullable: true })
  legalName: string;

  @Column({
    name: 'tax_id',
    length: 500, // Encrypted fields need more space
    unique: true,
    transformer: encryptionTransformer,
  })
  taxId: string;

  @Column({ length: 200, nullable: true })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 500, nullable: true })
  address: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  settings: string; // JSON string for additional settings

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => User, (user) => user.company)
  users: User[];

  // Helper method to parse settings JSON
  getSettings(): any {
    return this.settings ? JSON.parse(this.settings) : {};
  }

  // Helper method to set settings JSON
  setSettings(settings: any): void {
    this.settings = JSON.stringify(settings);
  }
}
