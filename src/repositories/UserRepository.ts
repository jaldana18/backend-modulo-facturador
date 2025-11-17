import { Repository, FindOptionsWhere } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User.entity';
import { QueryUsersDto } from '../dto/user/query-users.dto';

export interface PaginatedUserResponse {
  items: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class UserRepository extends Repository<User> {
  constructor() {
    super(User, AppDataSource.manager);
  }

  /**
   * Find users with pagination and filters
   */
  async findWithPagination(
    companyId: number,
    query: QueryUsersDto
  ): Promise<PaginatedUserResponse> {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    // Build where conditions
    const where: FindOptionsWhere<User> = {
      companyId,
    };

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Build query
    let queryBuilder = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .where(where);

    // Add search condition
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(user.firstName LIKE :search OR user.lastName LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Add sorting
    const validSortFields = ['firstName', 'lastName', 'email', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder = queryBuilder.orderBy(`user.${sortField}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder = queryBuilder.skip(skip).take(limit);

    // Execute query - Remove sensitive fields
    const items = await queryBuilder
      .select([
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.role',
        'user.isActive',
        'user.lastLogin',
        'user.createdAt',
        'user.updatedAt',
        'company.id',
        'company.name',
      ])
      .getMany();

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find user by email within company
   */
  async findByEmail(companyId: number, email: string): Promise<User | null> {
    return this.findOne({
      where: { companyId, email },
    });
  }

  /**
   * Check if email exists for another user in company
   */
  async isEmailTaken(companyId: number, email: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('user')
      .where('user.companyId = :companyId', { companyId })
      .andWhere('user.email = :email', { email });

    if (excludeId) {
      query.andWhere('user.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Count users by company
   */
  async countByCompany(companyId: number, isActive?: boolean): Promise<number> {
    const where: FindOptionsWhere<User> = { companyId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    return this.count({ where });
  }

  /**
   * Get all active users for a company
   */
  async findActiveUsers(companyId: number): Promise<User[]> {
    return this.find({
      where: { companyId, isActive: true },
      order: { firstName: 'ASC' },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive'],
    });
  }
}
