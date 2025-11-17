import { Repository, FindOptionsWhere } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Category } from '../entities/Category.entity';
import { QueryCategoriesDto } from '../dto/category/query-categories.dto';

export interface PaginatedCategoryResponse {
  items: Array<Category & { productCount?: number }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class CategoryRepository extends Repository<Category> {
  constructor() {
    super(Category, AppDataSource.manager);
  }

  /**
   * Find categories with pagination and filters
   */
  async findWithPagination(
    companyId: number,
    query: QueryCategoriesDto
  ): Promise<PaginatedCategoryResponse> {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      parentId,
      includeInactive = false,
      includeProductCount = false,
      sortBy = 'sortOrder',
      sortOrder = 'ASC',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: FindOptionsWhere<Category> = { companyId };

    if (isActive !== undefined) {
      where.isActive = isActive;
    } else if (!includeInactive) {
      where.isActive = true;
    }

    if (parentId !== undefined) {
      where.parentId = parentId;
    }

    // Build query
    let queryBuilder = this.createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .where(where);

    // Apply search filter
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(category.name LIKE :search OR category.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Add product count if requested
    if (includeProductCount) {
      queryBuilder = queryBuilder
        .loadRelationCountAndMap('category.productCount', 'category.products', 'products', (qb) =>
          qb.where('products.isActive = :isActive', { isActive: true })
        );
    }

    // Apply sorting
    const orderByColumn = `category.${sortBy}`;
    queryBuilder = queryBuilder.orderBy(orderByColumn, sortOrder);

    // Execute query with pagination
    const [items, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return {
      items: items as Array<Category & { productCount?: number }>,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find category by name within company
   */
  async findByName(companyId: number, name: string): Promise<Category | null> {
    return this.findOne({
      where: { companyId, name },
    });
  }

  /**
   * Find all active categories for a company
   */
  async findActiveCategories(companyId: number): Promise<Category[]> {
    return this.find({
      where: { companyId, isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Get category with product count
   */
  async findByIdWithProductCount(companyId: number, categoryId: number): Promise<Category | null> {
    return this.createQueryBuilder('category')
      .where('category.id = :categoryId AND category.companyId = :companyId', {
        categoryId,
        companyId,
      })
      .loadRelationCountAndMap('category.productCount', 'category.products', 'products', (qb) =>
        qb.where('products.isActive = :isActive', { isActive: true })
      )
      .leftJoinAndSelect('category.parent', 'parent')
      .getOne();
  }

  /**
   * Check if category has active products
   */
  async hasActiveProducts(categoryId: number): Promise<boolean> {
    const category = await this.createQueryBuilder('category')
      .where('category.id = :categoryId', { categoryId })
      .loadRelationCountAndMap('category.productCount', 'category.products', 'products', (qb) =>
        qb.where('products.isActive = :isActive', { isActive: true })
      )
      .getOne();

    return (category as any)?.productCount > 0;
  }

  /**
   * Get hierarchical categories (parent-child structure)
   */
  async findHierarchical(companyId: number): Promise<Category[]> {
    // Get all active categories
    const categories = await this.find({
      where: { companyId, isActive: true },
      relations: ['parent'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    // Build hierarchical structure (only root categories with children loaded)
    const rootCategories = categories.filter((cat) => !cat.parentId);

    // Load children for each root category
    for (const root of rootCategories) {
      root.children = categories.filter((cat) => cat.parentId === root.id);
    }

    return rootCategories;
  }

  /**
   * Check if parent category exists and belongs to company
   */
  async validateParentCategory(companyId: number, parentId: number): Promise<boolean> {
    const parent = await this.findOne({
      where: { id: parentId, companyId, isActive: true },
    });
    return !!parent;
  }
}
