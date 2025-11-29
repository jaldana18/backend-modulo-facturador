import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { LoginDto } from '../dto/auth/login.dto';
import { RefreshTokenDto } from '../dto/auth/refresh.dto';
import { RegisterCompanyDto } from '../dto/auth/register-company.dto';
import { ResetPasswordDto } from '../dto/auth/reset-password.dto';
import { validateDto } from '../utils/validators.util';
import { ApiResponse } from '../common.types';

export class AuthController {
  private authService = new AuthService();

  /**
   * POST /api/v1/auth/login
   */
  login = async (req: Request, res: Response): Promise<void> => {
    // Validate DTO
    const loginDto = await validateDto(LoginDto, req.body);

    // Get IP and user agent
    const ip = req.ip;
    const userAgent = req.get('user-agent');

    // Login
    const result = await this.authService.login(loginDto.email, loginDto.password, ip, userAgent);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  };

  /**
   * POST /api/v1/auth/refresh
   */
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    // Validate DTO
    const refreshDto = await validateDto(RefreshTokenDto, req.body);

    // Refresh token
    const result = await this.authService.refreshToken(refreshDto.refreshToken);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  };

  /**
   * POST /api/v1/auth/logout
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    // User must be authenticated (from middleware)
    const userId = req.user!.userId;

    // Logout
    const result = await this.authService.logout(userId);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  };

  /**
   * GET /api/v1/auth/me
   */
  getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    // User must be authenticated (from middleware)
    const userId = req.user!.userId;

    // Get user info
    const result = await this.authService.getCurrentUser(userId);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  };

  /**
   * POST /api/v1/auth/register-company
   * Public endpoint to register a new company with admin user
   */
  registerCompany = async (req: Request, res: Response): Promise<void> => {
    // Validate DTO
    const registerDto = await validateDto(RegisterCompanyDto, req.body);

    // Get IP and user agent
    const ip = req.ip;
    const userAgent = req.get('user-agent');

    // Register company and user
    const result = await this.authService.registerCompany(registerDto, ip, userAgent);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Company and admin user registered successfully',
    };

    res.status(201).json(response);
  };

  /**
   * POST /api/v1/auth/reset-password
   * Public endpoint to reset password using only email
   */
  resetPassword = async (req: Request, res: Response): Promise<void> => {
    // Validate DTO
    const resetPasswordDto = await validateDto(ResetPasswordDto, req.body);

    // Reset password
    const result = await this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.newPassword
    );

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Password reset successfully',
    };

    res.json(response);
  };
}
