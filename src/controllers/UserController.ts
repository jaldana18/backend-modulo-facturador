import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { QueryUsersDto } from '../dto/user/query-users.dto';
import { validateDto } from '../utils/validators.util';
import { ApiResponse } from '../common.types';

export class UserController {
  private userService = new UserService();

  /**
   * GET /api/v1/users
   * Get all users with filters
   */
  getUsers = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    // Validate query params
    const queryDto = await validateDto(QueryUsersDto, req.query);

    const result = await this.userService.queryUsers(companyId, queryDto);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/users/:id
   * Get user by ID
   */
  getUserById = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = parseInt(req.params.id);

    const user = await this.userService.getUserById(companyId, userId);

    const response: ApiResponse = {
      success: true,
      data: user,
    };

    res.json(response);
  };

  /**
   * POST /api/v1/users
   * Create new user (admin only)
   */
  createUser = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const createdBy = req.user!.userId;

    const user = await this.userService.createUser(companyId, req.body, createdBy);

    const response: ApiResponse = {
      success: true,
      data: user,
    };

    res.status(201).json(response);
  };

  /**
   * PUT /api/v1/users/:id
   * Update user
   */
  updateUser = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = parseInt(req.params.id);
    const updatedBy = req.user!.userId;

    const user = await this.userService.updateUser(companyId, userId, req.body, updatedBy);

    const response: ApiResponse = {
      success: true,
      data: user,
    };

    res.json(response);
  };

  /**
   * DELETE /api/v1/users/:id
   * Delete user (soft delete)
   */
  deleteUser = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;
    const userId = parseInt(req.params.id);
    const deletedBy = req.user!.userId;

    await this.userService.deleteUser(companyId, userId, deletedBy);

    const response: ApiResponse = {
      success: true,
      message: 'User deleted successfully',
    };

    res.json(response);
  };

  /**
   * GET /api/v1/users/stats
   * Get user statistics
   */
  getUserStats = async (req: Request, res: Response): Promise<void> => {
    const companyId = req.user!.companyId;

    const stats = await this.userService.getUserStats(companyId);

    const response: ApiResponse = {
      success: true,
      data: stats,
    };

    res.json(response);
  };
}
