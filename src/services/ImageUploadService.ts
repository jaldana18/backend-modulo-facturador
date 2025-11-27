import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

export interface UploadedFileInfo {
  filename: string;
  path: string;
  url: string;
  size: number;
  mimetype: string;
}

export class ImageUploadService {
  private readonly baseUploadDir = path.join(process.cwd(), 'uploads');
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB

  /**
   * Get the upload directory for a specific company
   */
  private getCompanyUploadDir(companyId: number): string {
    return path.join(this.baseUploadDir, 'products', `company-${companyId}`);
  }

  /**
   * Ensure the upload directory exists for a company
   */
  private async ensureUploadDirExists(companyId: number): Promise<void> {
    const uploadDir = this.getCompanyUploadDir(companyId);
    
    try {
      await access(uploadDir, fs.constants.F_OK);
    } catch {
      // Directory doesn't exist, create it
      await mkdir(uploadDir, { recursive: true });
      logger.info(`Created upload directory for company ${companyId}: ${uploadDir}`);
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new Error(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`
      );
    }

    // Check mime type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`
      );
    }
  }

  /**
   * Generate a unique filename while preserving the extension
   */
  private generateUniqueFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename).toLowerCase();
    const uniqueId = uuidv4();
    return `${uniqueId}${ext}`;
  }

  /**
   * Save uploaded file to company-specific directory
   */
  async saveProductImage(
    file: Express.Multer.File,
    companyId: number,
    productId?: number
  ): Promise<UploadedFileInfo> {
    try {
      // Validate file
      this.validateFile(file);

      // Ensure upload directory exists
      await this.ensureUploadDirExists(companyId);

      // Generate unique filename
      const filename = this.generateUniqueFilename(file.originalname);
      const uploadDir = this.getCompanyUploadDir(companyId);
      const filepath = path.join(uploadDir, filename);

      // Save file
      await fs.promises.writeFile(filepath, file.buffer);

      // Generate relative URL path
      const relativeUrl = `/uploads/products/company-${companyId}/${filename}`;

      logger.info(
        `Image uploaded successfully for company ${companyId}${
          productId ? ` - product ${productId}` : ''
        }: ${filename}`
      );

      return {
        filename,
        path: filepath,
        url: relativeUrl,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      logger.error('Error saving product image:', error);
      throw error;
    }
  }

  /**
   * Delete a product image file
   */
  async deleteProductImage(imageUrl: string): Promise<void> {
    try {
      // Extract the file path from the URL
      // URL format: /uploads/products/company-{id}/{filename}
      const relativePath = imageUrl.replace(/^\//, ''); // Remove leading slash
      const filepath = path.join(process.cwd(), relativePath);

      // Check if file exists
      try {
        await access(filepath, fs.constants.F_OK);
      } catch {
        logger.warn(`File not found for deletion: ${filepath}`);
        return;
      }

      // Delete file
      await unlink(filepath);
      logger.info(`Image deleted successfully: ${filepath}`);
    } catch (error) {
      logger.error('Error deleting product image:', error);
      throw error;
    }
  }

  /**
   * Replace existing product image
   */
  async replaceProductImage(
    file: Express.Multer.File,
    companyId: number,
    productId: number,
    currentImageUrl?: string | null
  ): Promise<UploadedFileInfo> {
    try {
      // Delete old image if it exists
      if (currentImageUrl) {
        try {
          await this.deleteProductImage(currentImageUrl);
        } catch (error) {
          logger.warn('Could not delete old image, continuing with upload:', error);
        }
      }

      // Upload new image
      return await this.saveProductImage(file, companyId, productId);
    } catch (error) {
      logger.error('Error replacing product image:', error);
      throw error;
    }
  }

  /**
   * Get the absolute path from a relative URL
   */
  getAbsolutePath(imageUrl: string): string {
    const relativePath = imageUrl.replace(/^\//, '');
    return path.join(process.cwd(), relativePath);
  }

  /**
   * Check if a file exists
   */
  async fileExists(imageUrl: string): Promise<boolean> {
    try {
      const filepath = this.getAbsolutePath(imageUrl);
      await access(filepath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
