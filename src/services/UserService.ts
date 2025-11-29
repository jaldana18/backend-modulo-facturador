import { UserRepository, PaginatedUserResponse } from '../repositories/UserRepository';
import { User } from '../entities/User.entity';
import { ApiError } from '../middleware/errorHandler.middleware';
import { loggers } from '../config/logger';
import { hashPassword } from '../utils/encryption.util';
import { QueryUsersDto } from '../dto/user/query-users.dto';
import { ActivityType } from '../entities/ActivityLog.entity';

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'user';
  isActive?: boolean;
}

export class UserService {
  private userRepository = new UserRepository();

  /**
   * Query users with filters
   */
  async queryUsers(companyId: number, query: QueryUsersDto): Promise<PaginatedUserResponse> {
    return this.userRepository.findWithPagination(companyId, query);
  }

  /**
   * Get user by ID
   */
  async getUserById(companyId: number, userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId, companyId },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'lastLogin', 'createdAt', 'updatedAt'],
      relations: ['company'],
    });

    if (!user) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    return user;
  }

  /**
   * Create new user
   */
  async createUser(companyId: number, dto: CreateUserDto, createdBy: number): Promise<User> {
    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(companyId, dto.email);
    if (existingUser) {
      throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', `User with email "${dto.email}" already exists`);
    }

    // Hash password
    const passwordHash = await hashPassword(dto.password);

    // Create user
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role || 'user',
      companyId,
      isActive: true,
    });

    await this.userRepository.save(user);

    loggers.logOperation('user_created', createdBy, companyId, {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Log user activity
    await loggers.logActivity({
      companyId,
      userId: createdBy,
      activityType: ActivityType.USER_CREATE,
      description: `Creó usuario ${user.firstName} ${user.lastName} (${user.email})`,
      entityType: 'user',
      entityId: user.id,
      entityName: `${user.firstName} ${user.lastName}`,
      metadata: {
        email: user.email,
        role: user.role,
      },
    });

    // Remove sensitive fields before returning
    delete (user as any).passwordHash;
    delete (user as any).refreshToken;

    return user;
  }

  /**
   * Update user
   */
  async updateUser(
    companyId: number,
    userId: number,
    dto: UpdateUserDto,
    updatedBy: number
  ): Promise<User> {
    const user = await this.getUserById(companyId, userId);

    // Check if email is being changed and if it already exists
    if (dto.email && dto.email !== user.email) {
      const isTaken = await this.userRepository.isEmailTaken(companyId, dto.email, userId);
      if (isTaken) {
        throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', `User with email "${dto.email}" already exists`);
      }
    }

    // Update fields
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    await this.userRepository.save(user);

    loggers.logOperation('user_updated', updatedBy, companyId, {
      userId: user.id,
      changes: dto,
    });

    // Log user activity
    await loggers.logActivity({
      companyId,
      userId: updatedBy,
      activityType: ActivityType.USER_UPDATE,
      description: `Actualizó usuario ${user.firstName} ${user.lastName} (${user.email})`,
      entityType: 'user',
      entityId: user.id,
      entityName: `${user.firstName} ${user.lastName}`,
      metadata: {
        updatedFields: Object.keys(dto),
      },
    });

    return user;
  }

  /**
   * Delete user (soft delete - set isActive to false)
   */
  async deleteUser(companyId: number, userId: number, deletedBy: number): Promise<void> {
    const user = await this.getUserById(companyId, userId);

    // Prevent self-deletion
    if (userId === deletedBy) {
      throw new ApiError(400, 'CANNOT_DELETE_SELF', 'You cannot delete your own account');
    }

    // Soft delete
    user.isActive = false;
    user.refreshToken = null;
    await this.userRepository.save(user);

    loggers.logOperation('user_deleted', deletedBy, companyId, {
      userId: user.id,
      email: user.email,
    });
  }

  /**
   * Get user statistics for company
   */
  async getUserStats(companyId: number) {
    const total = await this.userRepository.countByCompany(companyId);
    const active = await this.userRepository.countByCompany(companyId, true);
    const inactive = total - active;

    return {
      total,
      active,
      inactive,
    };
  }
}
