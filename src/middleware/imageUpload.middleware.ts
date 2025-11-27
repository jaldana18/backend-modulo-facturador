import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler.middleware';

/**
 * Configure multer for image uploads
 */

// Memory storage - file is stored in memory as Buffer
const imageStorage = multer.memoryStorage();

// File filter for images only
const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept image files only
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

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
        'Solo se permiten archivos de imagen (jpg, png, gif, webp)'
      )
    );
  }
};

// Configure multer instance for images
export const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max file size
  },
});

/**
 * Middleware to handle image upload errors
 */
export const handleImageUploadError = (
  error: Error | multer.MulterError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      throw new ApiError(
        400,
        'FILE_TOO_LARGE',
        'La imagen excede el tamaño máximo permitido de 5 MB'
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

// Middleware for single image upload
export const uploadSingleImage = uploadImage.single('image');

// Middleware for multiple images upload (up to 10 files)
export const uploadMultipleImages = uploadImage.array('images', 10);
