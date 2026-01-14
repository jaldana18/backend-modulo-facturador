import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { ApiError } from './errorHandler.middleware';
import fs from 'fs';

/**
 * Configure multer for product image uploads
 */

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Disk storage - save files to disk
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // Generate unique filename: companyId_timestamp_randomNumber.ext
    const companyId = (req as any).user?.companyId || 'unknown';
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const ext = path.extname(file.originalname);
    const filename = `${companyId}_${timestamp}_${random}${ext}`;
    cb(null, filename);
  },
});

// File filter for image files only
const imageFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept image files only
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

  const isValidMime = allowedMimes.includes(file.mimetype);
  const isValidExtension = allowedExtensions.some((ext) =>
    file.originalname.toLowerCase().endsWith(ext)
  );

  if (isValidMime || isValidExtension) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        'INVALID_FILE_TYPE',
        'Solo se permiten archivos de imagen (.jpg, .jpeg, .png, .webp, .gif)'
      )
    );
  }
};

// Configure multer instance for images
export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB max file size
  },
});

/**
 * Middleware to handle image upload errors
 */
export const handleImageUploadError = (
  error: any,
  req: Request,
  res: any,
  next: any
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      throw new ApiError(
        400,
        'FILE_TOO_LARGE',
        'La imagen excede el tamaño máximo permitido de 2 MB'
      );
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      throw new ApiError(
        400,
        'UNEXPECTED_FILE',
        'Campo de archivo no esperado'
      );
    }
    throw new ApiError(400, 'UPLOAD_ERROR', error.message);
  }
  next(error);
};

/**
 * Delete uploaded image file
 */
export const deleteImageFile = (imagePath: string | null): void => {
  if (!imagePath) return;

  const fullPath = path.join(__dirname, '../../', imagePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};
