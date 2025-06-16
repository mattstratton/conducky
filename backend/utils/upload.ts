import multer = require("multer");
import { Request } from "express";

/**
 * Configuration options for upload middleware
 */
export interface UploadConfig {
  /** Array of allowed MIME types (e.g., ['image/png', 'image/jpeg']) */
  allowedMimeTypes: string[];
  /** Maximum file size in megabytes */
  maxSizeMB: number;
}

/**
 * Creates a multer upload middleware with specified configuration
 * @param config - Upload configuration options
 * @returns Configured multer middleware
 */
export function createUploadMiddleware(config: UploadConfig): multer.Multer {
  const { allowedMimeTypes, maxSizeMB } = config;

  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error("Invalid file type"));
      }
      cb(null, true);
    },
  });
} 