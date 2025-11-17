import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ApiError } from '../middleware/errorHandler.middleware';

/**
 * Validate a DTO and throw ApiError if validation fails
 */
export const validateDto = async <T extends object>(
  dtoClass: new () => T,
  plain: any
): Promise<T> => {
  const dtoObject = plainToClass(dtoClass, plain);
  const errors = await validate(dtoObject);

  if (errors.length > 0) {
    const messages = errors.map((error: ValidationError) => {
      return Object.values(error.constraints || {}).join(', ');
    });

    throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', {
      fields: errors.map((error) => ({
        field: error.property,
        errors: Object.values(error.constraints || {}),
      })),
    });
  }

  return dtoObject;
};

/**
 * Email validation regex
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password strength validation
 */
export const validatePasswordStrength = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return strongPasswordRegex.test(password);
};

/**
 * Sanitize string input (remove potential XSS)
 */
export const sanitizeString = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
};
