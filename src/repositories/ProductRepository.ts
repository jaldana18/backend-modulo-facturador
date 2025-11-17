import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product.entity';
import { QueryProductsDto } from '../dto/product/query-products.dto';
import { PaginatedResponse } from '../common.types';

export class ProductRepository extends Repository<Product> {
  constructor() {
    super(Product, AppDataSource.manager);
  }

  /**
   * Find products with pagination and filters
   */
  async findWithPagination(
    companyId: number,
    query: QueryProductsDto
  ): Promise<PaginatedResponse<Product>> {
    const {
      page = 1,
      limit = 20,
      search,
      sku,
      category,
      isActive,
      minPrice,
      maxPrice,
      minStock,
      maxStock,
      lowStock,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = query;

    // Build where conditions
    const where: FindOptionsWhere<Product> = {
      companyId,
    };

    if (category) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (sku) {
      where.sku = sku;
    }

    // Build query with stock calculation using subquery
    let queryBuilder = this.createQueryBuilder('product')
      .leftJoinAndSelect(
        (subQuery) => {
          return subQuery
            .select('txn.productId', 'productId')
            .addSelect('MAX(txn.createdAt)', 'lastTransactionDate')
            .addSelect('MAX(txn.newStock)', 'currentStock')
            .from('inventory_transactions', 'txn')
            .groupBy('txn.productId');
        },
        'stock',
        'stock.productId = product.id'
      )
      .addSelect('COALESCE(stock.currentStock, 0)', 'product_currentStock')
      .where(where);

    // Add search condition
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(product.name LIKE :search OR product.sku LIKE :search OR product.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Add price range filters
    if (minPrice !== undefined) {
      queryBuilder = queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder = queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    // Add stock range filters
    if (minStock !== undefined) {
      queryBuilder = queryBuilder.andWhere('COALESCE(stock.currentStock, 0) >= :minStock', { minStock });
    }

    if (maxStock !== undefined) {
      queryBuilder = queryBuilder.andWhere('COALESCE(stock.currentStock, 0) <= :maxStock', { maxStock });
    }

    // Add low stock filter
    if (lowStock === true) {
      queryBuilder = queryBuilder.andWhere('COALESCE(stock.currentStock, 0) <= product.minimumStock');
    }

    // Add sorting
    const validSortFields = ['name', 'sku', 'category', 'price', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder = queryBuilder.orderBy(`product.${sortField}`, sortOrder);

    // Get total count (without stock join for performance)
    const countBuilder = this.createQueryBuilder('product').where(where);
    if (search) {
      countBuilder.andWhere(
        '(product.name LIKE :search OR product.sku LIKE :search OR product.description LIKE :search)',
        { search: `%${search}%` }
      );
    }
    const total = await countBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder = queryBuilder.skip(skip).take(limit);

    // Execute query and get raw results
    const rawResults = await queryBuilder.getRawAndEntities();

    // Map currentStock to products
    const items = rawResults.entities.map((product, index) => {
      const rawRow = rawResults.raw[index];
      (product as any).currentStock = parseFloat(rawRow.product_currentStock || 0);
      return product;
    });

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
   * Find product by SKU within company
   */
  async findBySku(companyId: number, sku: string): Promise<Product | null> {
    return this.findOne({
      where: { companyId, sku },
    });
  }

  /**
   * Find all products in a category
   */
  async findByCategory(companyId: number, category: string): Promise<Product[]> {
    return this.find({
      where: { companyId, category, isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Get all unique categories for a company
   */
  async getCategories(companyId: number): Promise<string[]> {
    const result = await this.createQueryBuilder('product')
      .select('DISTINCT product.category', 'category')
      .where('product.companyId = :companyId', { companyId })
      .andWhere('product.category IS NOT NULL')
      .andWhere('product.isActive = 1')
      .orderBy('product.category', 'ASC')
      .getRawMany();

    return result.map((r) => r.category);
  }

  /**
   * Count products by company
   */
  async countByCompany(companyId: number, isActive?: boolean): Promise<number> {
    const where: FindOptionsWhere<Product> = { companyId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    return this.count({ where });
  }

  /**
   * Bulk update products
   */
  async bulkUpdate(companyId: number, productIds: number[], updates: Partial<Product>): Promise<void> {
    await this.createQueryBuilder()
      .update(Product)
      .set(updates)
      .where('companyId = :companyId', { companyId })
      .andWhere('id IN (:...productIds)', { productIds })
      .execute();
  }

  /**
   * Get current stock for a product
   */
  async getCurrentStock(productId: number, companyId: number): Promise<number> {
    const result = await this.manager
      .createQueryBuilder()
      .select('txn.newStock', 'currentStock')
      .from('inventory_transactions', 'txn')
      .where('txn.productId = :productId', { productId })
      .andWhere('txn.companyId = :companyId', { companyId })
      .orderBy('txn.createdAt', 'DESC')
      .limit(1)
      .getRawOne();

    return result ? parseFloat(result.currentStock || 0) : 0;
  }

  /**
   * Find product by ID with current stock
   */
  async findByIdWithStock(productId: number, companyId: number): Promise<(Product & { currentStock: number }) | null> {
    const product = await this.findOne({
      where: { id: productId, companyId },
    });

    if (!product) {
      return null;
    }

    const currentStock = await this.getCurrentStock(productId, companyId);

    // Add currentStock to product instance
    Object.assign(product, { currentStock });

    return product as Product & { currentStock: number };
  }
}
