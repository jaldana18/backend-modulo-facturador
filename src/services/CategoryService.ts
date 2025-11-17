import { CategoryRepository } from '../repositories/CategoryRepository';
import { Category } from '../entities/Category.entity';
import { CreateCategoryDto } from '../dto/category/create-category.dto';
import { UpdateCategoryDto } from '../dto/category/update-category.dto';
import { QueryCategoriesDto } from '../dto/category/query-categories.dto';
import { ApiError } from '../middleware/errorHandler.middleware';
import { loggers } from '../config/logger';

export class CategoryService {
  private categoryRepository = new CategoryRepository();

  /**
   * Get categories with pagination and filters
   */
  async getCategories(companyId: number, query: QueryCategoriesDto) {
    return this.categoryRepository.findWithPagination(companyId, query);
  }

  /**
   * Get category by ID
   */
  async getCategoryById(companyId: number, categoryId: number): Promise<Category> {
    const category = await this.categoryRepository.findByIdWithProductCount(companyId, categoryId);

    if (!category) {
      throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    return category;
  }

  /**
   * Create new category
   */
  async createCategory(
    companyId: number,
    userId: number,
    dto: CreateCategoryDto
  ): Promise<Category> {
    // Check if category name already exists for this company
    const existingCategory = await this.categoryRepository.findByName(companyId, dto.name);

    if (existingCategory) {
      throw new ApiError(
        409,
        'CATEGORY_NAME_EXISTS',
        `Category with name "${dto.name}" already exists`
      );
    }

    // Validate parent category if provided
    if (dto.parentId) {
      const isValidParent = await this.categoryRepository.validateParentCategory(
        companyId,
        dto.parentId
      );

      if (!isValidParent) {
        throw new ApiError(404, 'PARENT_CATEGORY_NOT_FOUND', 'Parent category not found or inactive');
      }
    }

    // Create category
    const category = this.categoryRepository.create({
      companyId,
      name: dto.name,
      description: dto.description || null,
      color: dto.color || null,
      icon: dto.icon || null,
      sortOrder: dto.sortOrder ?? 0,
      parentId: dto.parentId || null,
      isActive: dto.isActive ?? true,
    });

    await this.categoryRepository.save(category);

    loggers.logOperation('category_created', userId, companyId, {
      categoryId: category.id,
      categoryName: category.name,
    });

    return category;
  }

  /**
   * Update category
   */
  async updateCategory(
    companyId: number,
    userId: number,
    categoryId: number,
    dto: UpdateCategoryDto
  ): Promise<Category> {
    // Find category
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, companyId },
    });

    if (!category) {
      throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    // Check if new name conflicts with existing category
    if (dto.name && dto.name !== category.name) {
      const existingCategory = await this.categoryRepository.findByName(companyId, dto.name);

      if (existingCategory) {
        throw new ApiError(
          409,
          'CATEGORY_NAME_EXISTS',
          `Category with name "${dto.name}" already exists`
        );
      }
    }

    // Validate parent category if provided
    if (dto.parentId !== undefined) {
      if (dto.parentId === categoryId) {
        throw new ApiError(400, 'INVALID_PARENT', 'Category cannot be its own parent');
      }

      if (dto.parentId !== null) {
        const isValidParent = await this.categoryRepository.validateParentCategory(
          companyId,
          dto.parentId
        );

        if (!isValidParent) {
          throw new ApiError(
            404,
            'PARENT_CATEGORY_NOT_FOUND',
            'Parent category not found or inactive'
          );
        }

        // Check for circular reference (prevent A -> B -> A)
        const parent = await this.categoryRepository.findOne({
          where: { id: dto.parentId },
          relations: ['parent'],
        });

        if (parent?.parentId === categoryId) {
          throw new ApiError(400, 'CIRCULAR_REFERENCE', 'Circular parent-child reference detected');
        }
      }
    }

    // Update fields
    if (dto.name !== undefined) category.name = dto.name;
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.color !== undefined) category.color = dto.color;
    if (dto.icon !== undefined) category.icon = dto.icon;
    if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;
    if (dto.parentId !== undefined) category.parentId = dto.parentId;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;

    await this.categoryRepository.save(category);

    loggers.logOperation('category_updated', userId, companyId, {
      categoryId: category.id,
      categoryName: category.name,
      changes: dto,
    });

    return category;
  }

  /**
   * Delete category (soft delete by default)
   */
  async deleteCategory(
    companyId: number,
    userId: number,
    categoryId: number,
    permanent: boolean = false
  ): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, companyId },
    });

    if (!category) {
      throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    // Check if category has active products
    const hasProducts = await this.categoryRepository.hasActiveProducts(categoryId);

    if (hasProducts) {
      throw new ApiError(
        400,
        'CATEGORY_HAS_PRODUCTS',
        'Cannot delete category with active products. Deactivate or reassign products first.'
      );
    }

    if (permanent) {
      // Hard delete
      await this.categoryRepository.remove(category);
      loggers.logOperation('category_permanently_deleted', userId, companyId, {
        categoryId: category.id,
        categoryName: category.name,
      });
    } else {
      // Soft delete
      category.isActive = false;
      await this.categoryRepository.save(category);
      loggers.logOperation('category_deactivated', userId, companyId, {
        categoryId: category.id,
        categoryName: category.name,
      });
    }
  }

  /**
   * Get all active categories (for dropdowns)
   */
  async getActiveCategories(companyId: number): Promise<Category[]> {
    return this.categoryRepository.findActiveCategories(companyId);
  }

  /**
   * Get hierarchical category tree
   */
  async getCategoryTree(companyId: number): Promise<Category[]> {
    return this.categoryRepository.findHierarchical(companyId);
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(companyId: number) {
    const categories = await this.categoryRepository.find({
      where: { companyId },
    });

    const activeCategories = categories.filter((cat) => cat.isActive);
    const inactiveCategories = categories.filter((cat) => !cat.isActive);
    const rootCategories = categories.filter((cat) => !cat.parentId);
    const subcategories = categories.filter((cat) => cat.parentId);

    return {
      total: categories.length,
      active: activeCategories.length,
      inactive: inactiveCategories.length,
      rootCategories: rootCategories.length,
      subcategories: subcategories.length,
    };
  }
}
