import multer from 'multer';
import { Request } from 'express';
import { ApiError } from './errorHandler.middleware';

/**
 * Configure multer for file uploads
 */

// Memory storage - file is stored in memory as Buffer
const storage = multer.memoryStorage();

// File filter for Excel files only
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept Excel files only
  const allowedMimes = [
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  ];

  const allowedExtensions = ['.xls', '.xlsx'];

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
        'Solo se permiten archivos Excel (.xls, .xlsx)'
      )
    );
  }
};

// Configure multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max file size
  },
});

/**
 * Middleware to handle multer errors
 */
export const handleUploadError = (
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
        'El archivo excede el tamaño máximo permitido de 5 MB'
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
