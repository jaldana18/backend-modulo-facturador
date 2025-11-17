import { AppDataSource } from '../config/database';
import { User } from '../entities/User.entity';
import { ApiError } from '../middleware/errorHandler.middleware';
import { comparePassword, hashPassword } from '../utils/encryption.util';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.util';
import { loggers } from '../config/logger';
import { JWTPayload } from '../common.types';
import { CompanyService } from './CompanyService';
import { RegisterCompanyDto } from '../dto/auth/register-company.dto';

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Login with email and password
   */
  async login(email: string, password: string, _ip?: string, _userAgent?: string) {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['company'],
    });

    if (!user) {
      loggers.logAuth('login_failed', undefined, email, false, 'user_not_found');
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      loggers.logAuth('login_failed', user.id, email, false, 'user_inactive');
      throw new ApiError(401, 'USER_INACTIVE', 'User account is inactive');
    }

    // Check if company is active
    if (!user.company.isActive) {
      loggers.logAuth('login_failed', user.id, email, false, 'company_inactive');
      throw new ApiError(401, 'COMPANY_INACTIVE', 'Company account is inactive');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      loggers.logAuth('login_failed', user.id, email, false, 'invalid_password');
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Generate tokens
    const payload: JWTPayload = {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
      warehouseId: user.warehouseId, // Include warehouse for 'user' role
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await this.userRepository.save(user);

    loggers.logAuth('login_success', user.id, email, true);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        company: {
          id: user.company.id,
          name: user.company.name,
        },
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      const message = (error as Error).message;
      loggers.logAuth('refresh_failed', undefined, undefined, false, message);
      throw new ApiError(401, message, 'Invalid or expired refresh token');
    }

    // Find user
    const user = await this.userRepository.findOne({
      where: { id: decoded.userId },
      relations: ['company'],
    });

    if (!user) {
      loggers.logAuth('refresh_failed', decoded.userId, undefined, false, 'user_not_found');
      throw new ApiError(401, 'USER_NOT_FOUND', 'User not found');
    }

    // Check if refresh token matches
    if (user.refreshToken !== refreshToken) {
      loggers.logSecurity('refresh_token_mismatch', 'high', {
        userId: user.id,
        providedToken: refreshToken.substring(0, 20) + '...',
      });
      throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token does not match');
    }

    // Check if user is active
    if (!user.isActive) {
      loggers.logAuth('refresh_failed', user.id, user.email, false, 'user_inactive');
      throw new ApiError(401, 'USER_INACTIVE', 'User account is inactive');
    }

    // Check if company is active
    if (!user.company.isActive) {
      loggers.logAuth('refresh_failed', user.id, user.email, false, 'company_inactive');
      throw new ApiError(401, 'COMPANY_INACTIVE', 'Company account is inactive');
    }

    // Generate new access token
    const payload: JWTPayload = {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
      warehouseId: user.warehouseId, // Include warehouse for 'user' role
    };

    const newAccessToken = generateAccessToken(payload);

    loggers.logAuth('token_refreshed', user.id, user.email, true);

    return {
      accessToken: newAccessToken,
    };
  }

  /**
   * Logout user
   */
  async logout(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Clear refresh token
    user.refreshToken = null;
    await this.userRepository.save(user);

    loggers.logAuth('logout_success', user.id, user.email, true);

    return {
      message: 'Logout successful',
    };
  }

  /**
   * Get current user info
   */
  async getCurrentUser(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['company'],
    });

    if (!user) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
      company: {
        id: user.company.id,
        name: user.company.name,
        email: user.company.email,
      },
      lastLogin: user.lastLogin,
    };
  }

  /**
   * Register a new company with admin user
   */
  async registerCompany(dto: RegisterCompanyDto, _ip?: string, _userAgent?: string) {
    const companyService = new CompanyService();

    // Use transaction to ensure atomicity
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      // Create company
      const company = await companyService.createCompany(dto.company, undefined, transactionalEntityManager);

      // Create admin user
      const user = this.userRepository.create({
        email: dto.adminUser.email,
        passwordHash: await hashPassword(dto.adminUser.password),
        firstName: dto.adminUser.firstName,
        lastName: dto.adminUser.lastName,
        role: 'admin',
        companyId: company.id,
        isActive: true,
      });

      await transactionalEntityManager.save(user);

      // Generate tokens
      const payload: JWTPayload = {
        userId: user.id,
        companyId: user.companyId,
        email: user.email,
        role: user.role,
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      // Save refresh token
      user.refreshToken = refreshToken;
      user.lastLogin = new Date();
      await transactionalEntityManager.save(user);

      loggers.logAuth('company_registration_success', user.id, user.email, true);

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId,
          company: {
            id: company.id,
            name: company.name,
          },
        },
      };
    });
  }
}
