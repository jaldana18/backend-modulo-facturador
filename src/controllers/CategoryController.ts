import { Request, Response } from 'express';
import { CategoryService } from '../services/CategoryService';
import { CreateCategoryDto } from '../dto/category/create-category.dto';
import { UpdateCategoryDto } from '../dto/category/update-category.dto';
import { QueryCategoriesDto } from '../dto/category/query-categories.dto';
import { validateDto } from '../utils/validators.util';
import { ApiResponse } from '../common.types';

export class CategoryController {
  private categoryService = new CategoryService();

  /**
   * GET /api/v1/categories
   * Get all categories with pagination and filters
   */
  getCategories = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    // Validate query params
    const queryDto = await validateDto(QueryCategoriesDto, req.query);

    const result = await this.categoryService.getCategories(companyId, queryDto);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/categories/active
   * Get all active categories (for dropdowns)
   */
  getActiveCategories = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    const categories = await this.categoryService.getActiveCategories(companyId);

    const response: ApiResponse = {
      success: true,
      data: categories,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/categories/tree
   * Get hierarchical category tree
   */
  getCategoryTree = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    const tree = await this.categoryService.getCategoryTree(companyId);

    const response: ApiResponse = {
      success: true,
      data: tree,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/categories/stats
   * Get category statistics
   */
  getCategoryStats = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    const stats = await this.categoryService.getCategoryStats(companyId);

    const response: ApiResponse = {
      success: true,
      data: stats,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/categories/:id
   * Get category by ID
   */
  getCategoryById = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const categoryId = parseInt(req.params.id);

    const category = await this.categoryService.getCategoryById(companyId, categoryId);

    const response: ApiResponse = {
      success: true,
      data: category,
    };

    res.json(response);
  };

  /**
   * POST /api/v1/categories
   * Create new category
   */
  createCategory = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    // Validate DTO
    const createDto = await validateDto(CreateCategoryDto, req.body);

    const category = await this.categoryService.createCategory(companyId, userId, createDto);

    const response: ApiResponse = {
      success: true,
      data: category,
    };

    res.status(201).json(response);
  };

  /**
   * PUT /api/v1/categories/:id
   * Update category
   */
  updateCategory = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const categoryId = parseInt(req.params.id);

    // Validate DTO
    const updateDto = await validateDto(UpdateCategoryDto, req.body);

    const category = await this.categoryService.updateCategory(
      companyId,
      userId,
      categoryId,
      updateDto
    );

    const response: ApiResponse = {
      success: true,
      data: category,
    };

    res.json(response);
  };

  /**
   * DELETE /api/v1/categories/:id
   * Delete category (soft delete by default, permanent with ?permanent=true)
   */
  deleteCategory = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const categoryId = parseInt(req.params.id);
    const permanent = req.query.permanent === 'true';

    await this.categoryService.deleteCategory(companyId, userId, categoryId, permanent);

    const response: ApiResponse = {
      success: true,
      message: permanent ? 'Category permanently deleted' : 'Category deactivated',
    };

    res.json(response);
  };
}
