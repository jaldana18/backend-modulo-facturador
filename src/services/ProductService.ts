import { ProductRepository } from '../repositories/ProductRepository';
import { Product } from '../entities/Product.entity';
import { CreateProductDto } from '../dto/product/create-product.dto';
import { UpdateProductDto } from '../dto/product/update-product.dto';
import { QueryProductsDto } from '../dto/product/query-products.dto';
import { ApiError } from '../middleware/errorHandler.middleware';
import { loggers } from '../config/logger';
import { PaginatedResponse } from '../common.types';

export class ProductService {
  private productRepository = new ProductRepository();

  /**
   * Get all products with pagination and filters
   */
  async getProducts(
    companyId: number,
    query: QueryProductsDto
  ): Promise<PaginatedResponse<Product>> {
    return this.productRepository.findWithPagination(companyId, query);
  }

  /**
   * Get product by ID
   */
  async getProductById(companyId: number, productId: number): Promise<Product & { currentStock: number }> {
    const product = await this.productRepository.findByIdWithStock(productId, companyId);

    if (!product) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }

    return product;
  }

  /**
   * Create new product
   */
  async createProduct(companyId: number, userId: number, dto: CreateProductDto): Promise<Product> {
    // Check if SKU already exists
    const existingProduct = await this.productRepository.findBySku(companyId, dto.sku);

    if (existingProduct) {
      throw new ApiError(409, 'SKU_ALREADY_EXISTS', `Product with SKU "${dto.sku}" already exists`);
    }

    // Create product
    const product = this.productRepository.create({
      companyId,
      sku: dto.sku,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      unitOfMeasure: dto.unitOfMeasure,
      minimumStock: dto.minimumStock || 0,
      reorderPoint: dto.reorderPoint || 0,
      cost: dto.cost,
      price: dto.price,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
    });

    await this.productRepository.save(product);

    loggers.logOperation('product_created', userId, companyId, {
      productId: product.id,
      sku: product.sku,
      name: product.name,
    });

    return product;
  }

  /**
   * Update product
   */
  async updateProduct(
    companyId: number,
    userId: number,
    productId: number,
    dto: UpdateProductDto
  ): Promise<Product> {
    // Get existing product
    const product = await this.getProductById(companyId, productId);

    // If SKU is being changed, check if new SKU exists
    if (dto.sku && dto.sku !== product.sku) {
      const existingProduct = await this.productRepository.findBySku(companyId, dto.sku);
      if (existingProduct) {
        throw new ApiError(409, 'SKU_ALREADY_EXISTS', `Product with SKU "${dto.sku}" already exists`);
      }
    }

    // Update fields
    if (dto.sku !== undefined) product.sku = dto.sku;
    if (dto.name !== undefined) product.name = dto.name;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.category !== undefined) product.category = dto.category;
    if (dto.unitOfMeasure !== undefined) product.unitOfMeasure = dto.unitOfMeasure;
    if (dto.minimumStock !== undefined) product.minimumStock = dto.minimumStock;
    if (dto.reorderPoint !== undefined) product.reorderPoint = dto.reorderPoint;
    if (dto.cost !== undefined) product.cost = dto.cost;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.isActive !== undefined) product.isActive = dto.isActive;
    if (dto.metadata !== undefined) {
      product.metadata = dto.metadata ? JSON.stringify(dto.metadata) : null;
    }

    await this.productRepository.save(product);

    loggers.logOperation('product_updated', userId, companyId, {
      productId: product.id,
      sku: product.sku,
      changes: dto,
    });

    return product;
  }

  /**
   * Delete product (soft delete by setting isActive = false)
   */
  async deleteProduct(companyId: number, userId: number, productId: number): Promise<void> {
    const product = await this.getProductById(companyId, productId);

    product.isActive = false;
    await this.productRepository.save(product);

    loggers.logOperation('product_deleted', userId, companyId, {
      productId: product.id,
      sku: product.sku,
      name: product.name,
    });
  }

  /**
   * Permanently delete product (hard delete)
   */
  async permanentlyDeleteProduct(
    companyId: number,
    userId: number,
    productId: number
  ): Promise<void> {
    const product = await this.getProductById(companyId, productId);

    await this.productRepository.remove(product);

    loggers.logOperation('product_permanently_deleted', userId, companyId, {
      productId,
      sku: product.sku,
      name: product.name,
    });
  }

  /**
   * Get all categories
   */
  async getCategories(companyId: number): Promise<string[]> {
    return this.productRepository.getCategories(companyId);
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(companyId: number, category: string): Promise<Product[]> {
    return this.productRepository.findByCategory(companyId, category);
  }

  /**
   * Get product statistics
   */
  async getProductStatistics(companyId: number) {
    const [totalProducts, activeProducts, categories] = await Promise.all([
      this.productRepository.countByCompany(companyId),
      this.productRepository.countByCompany(companyId, true),
      this.productRepository.getCategories(companyId),
    ]);

    return {
      totalProducts,
      activeProducts,
      inactiveProducts: totalProducts - activeProducts,
      totalCategories: categories.length,
      categories,
    };
  }
}
