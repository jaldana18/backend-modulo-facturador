import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';
import { CreateProductDto } from '../dto/product/create-product.dto';
import { UpdateProductDto } from '../dto/product/update-product.dto';
import { QueryProductsDto } from '../dto/product/query-products.dto';
import { validateDto } from '../utils/validators.util';
import { ApiResponse } from '../common.types';

export class ProductController {
  private productService = new ProductService();

  /**
   * GET /api/v1/products
   */
  getProducts = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    // Validate query params
    const queryDto = await validateDto(QueryProductsDto, req.query);

    // Get products
    const result = await this.productService.getProducts(companyId, queryDto);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/products/:id
   */
  getProductById = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const productId = parseInt(req.params.id);

    const product = await this.productService.getProductById(companyId, productId);

    const response: ApiResponse = {
      success: true,
      data: product,
    };

    res.json(response);
  };

  /**
   * POST /api/v1/products
   */
  createProduct = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    // Validate DTO
    const createDto = await validateDto(CreateProductDto, req.body);

    // Create product
    const product = await this.productService.createProduct(companyId, userId, createDto);

    const response: ApiResponse = {
      success: true,
      data: product,
    };

    res.status(201).json(response);
  };

  /**
   * PUT /api/v1/products/:id
   */
  updateProduct = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const productId = parseInt(req.params.id);

    // Validate DTO
    const updateDto = await validateDto(UpdateProductDto, req.body);

    // Update product
    const product = await this.productService.updateProduct(companyId, userId, productId, updateDto);

    const response: ApiResponse = {
      success: true,
      data: product,
    };

    res.json(response);
  };

  /**
   * DELETE /api/v1/products/:id
   */
  deleteProduct = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const productId = parseInt(req.params.id);

    // Check if permanent delete is requested
    const permanent = req.query.permanent === 'true';

    if (permanent) {
      await this.productService.permanentlyDeleteProduct(companyId, userId, productId);
    } else {
      await this.productService.deleteProduct(companyId, userId, productId);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        message: permanent ? 'Product permanently deleted' : 'Product deleted (soft delete)',
      },
    };

    res.json(response);
  };

  /**
   * GET /api/v1/products/categories
   */
  getCategories = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    const categories = await this.productService.getCategories(companyId);

    const response: ApiResponse = {
      success: true,
      data: categories,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/products/category/:category
   */
  getProductsByCategory = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const category = req.params.category;

    const products = await this.productService.getProductsByCategory(companyId, category);

    const response: ApiResponse = {
      success: true,
      data: products,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/products/statistics
   */
  getStatistics = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    const statistics = await this.productService.getProductStatistics(companyId);

    const response: ApiResponse = {
      success: true,
      data: statistics,
    };

    res.json(response);
  };
}
