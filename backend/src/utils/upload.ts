import multer = require("multer");
import { Request } from "express";
import crypto from 'crypto';
import { logger } from './logger';

/**
 * Configuration options for upload middleware
 */
export interface UploadConfig {
  /** Array of allowed MIME types (e.g., ['image/png', 'image/jpeg']) */
  allowedMimeTypes: string[];
  /** Maximum file size in megabytes */
  maxSizeMB: number;
  /** Array of allowed file extensions */
  allowedExtensions: string[];
}

/**
 * Validates file content against its declared MIME type
 * This helps prevent MIME type spoofing attacks
 */
function validateFileContent(file: Express.Multer.File): boolean {
  const buffer = file.buffer;
  if (!buffer || buffer.length === 0) return false;

  // Check file signatures (magic numbers) for common file types
  const signatures = {
    'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // Complete PNG signature
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/jpg': [0xFF, 0xD8, 0xFF],
    'application/pdf': [0x25, 0x50, 0x44, 0x46, 0x2D], // %PDF- (more complete)
    'text/plain': null, // Text files don't have reliable signatures
  };

  const signature = signatures[file.mimetype as keyof typeof signatures];
  if (!signature) {
    // Reject unknown file types for security
    logger.security('Rejected file with unknown signature', { 
      mimetype: file.mimetype,
      filename: file.originalname 
    });
    return false;
  }

  // Handle text/plain case
  if (signature === null) return true;

  // Ensure buffer is long enough for signature check
  if (buffer.length < signature.length) return false;

  // Check if buffer starts with expected signature
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitizes filename to prevent directory traversal and other attacks
 */
function sanitizeFilename(filename: string): string {
  // Remove directory traversal attempts
  let sanitized = filename.replace(/[\/\\\.\.]/g, '');
  
  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');
  
  // Limit length
  if (sanitized.length > 100) {
    const ext = sanitized.split('.').pop() || '';
    const name = sanitized.substring(0, 95 - ext.length);
    sanitized = `${name}.${ext}`;
  }
  
  // Ensure we have a valid filename
  if (!sanitized || sanitized.length === 0) {
    sanitized = `file_${crypto.randomBytes(8).toString('hex')}`;
  }
  
  return sanitized;
}

/**
 * Creates a multer upload middleware with specified configuration
 * @param config - Upload configuration options
 * @returns Configured multer middleware
 */
export function createUploadMiddleware(config: UploadConfig): multer.Multer {
  const { allowedMimeTypes, maxSizeMB, allowedExtensions } = config;

  return multer({
    storage: multer.memoryStorage(),
    limits: { 
      fileSize: maxSizeMB * 1024 * 1024,
      files: 10, // Limit number of files
      fieldSize: 1024 * 1024, // Limit field size to 1MB
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      // Check MIME type
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`));
      }
      
      // Check file extension
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      if (!ext || !allowedExtensions.includes(ext)) {
        return cb(new Error(`Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`));
      }
      
      // Sanitize filename
      file.originalname = sanitizeFilename(file.originalname);
      
      cb(null, true);
    },
  });
}

/**
 * Enhanced file validation middleware for additional security
 * Should be used after multer processing
 */
export function validateUploadedFiles(req: Request, res: any, next: any) {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    return next();
  }
  
  for (const file of files) {
    // Validate file content matches MIME type
    if (!validateFileContent(file)) {
      return res.status(400).json({ 
        error: `File ${file.originalname} content does not match declared type ${file.mimetype}` 
      });
    }
    
    // Additional security checks could be added here:
    // - Virus scanning integration
    // - Content analysis for malicious patterns
    // - File size double-check
    
    // Log file upload for security monitoring
    logger.fileUpload(file.originalname, file.mimetype, file.size, (req.user as any)?.id);
  }
  
  next();
} 