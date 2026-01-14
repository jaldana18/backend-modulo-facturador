import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * DTO for resetting password
 */
export class ResetPasswordDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;
}
