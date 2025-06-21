/**
 * Validation Middleware
 * 
 * This module contains request validation middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Sanitize string input to prevent XSS attacks
 */
const sanitizeString = (value: string): string => {
  if (!value || typeof value !== 'string') return '';
  
  // Strip HTML tags and dangerous content
  const cleaned = DOMPurify.sanitize(value, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
  
  return cleaned.trim();
};

/**
 * Sanitize markdown content while preserving safe formatting
 */
const sanitizeMarkdown = (value: string): string => {
  if (!value || typeof value !== 'string') return '';
  
  // Allow basic markdown tags but strip dangerous content
  const cleaned = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a'],
    ALLOWED_ATTR: ['href'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'style'],
  });
  
  return cleaned.trim();
};

/**
 * User validation rules
 */
export const validateUser = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be 1-100 characters long')
    .matches(/^[a-zA-ZÀ-ÿ\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(sanitizeString),
    
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters')
    .normalizeEmail()
    .customSanitizer(sanitizeString),
    
  body('password')
    .optional()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters long')
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    })
    .withMessage('Password must contain at least one lowercase letter, uppercase letter, number, and special character'),
];

/**
 * Event validation rules
 */
export const validateEvent = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Event name must be 2-100 characters long')
    .customSanitizer(sanitizeString),
    
  body('slug')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Slug must be 2-50 characters long')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens')
    .not().matches(/^-|-$/)
    .withMessage('Slug cannot start or end with a hyphen')
    .not().matches(/--/)
    .withMessage('Slug cannot contain consecutive hyphens')
    .custom((value) => {
      const reserved = ['api', 'admin', 'www', 'mail', 'ftp', 'localhost', 'test', 'staging', 'dev'];
      if (reserved.includes(value)) {
        throw new Error('This slug is reserved and cannot be used');
      }
      return true;
    })
    .customSanitizer(sanitizeString),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters')
    .customSanitizer(sanitizeMarkdown),
    
  body('codeOfConduct')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Code of conduct must be less than 10000 characters')
    .customSanitizer(sanitizeMarkdown),
    
  body('contactEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please enter a valid contact email address')
    .normalizeEmail()
    .customSanitizer(sanitizeString),
    
  body('website')
    .optional()
    .trim()
    .isURL({ require_protocol: true, protocols: ['http', 'https'] })
    .withMessage('Please enter a valid URL with http:// or https://')
    .isLength({ max: 2048 })
    .withMessage('URL is too long (maximum 2048 characters)')
    .customSanitizer(sanitizeString),
];

/**
 * Report validation rules
 */
export const validateReport = [
  body('title')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be 10-200 characters long')
    .not().matches(/<[^>]*>|javascript:|data:/i)
    .withMessage('Title cannot contain HTML or script content')
    .customSanitizer(sanitizeString),
    
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be 10-5000 characters long')
    .customSanitizer(sanitizeMarkdown),
    
  body('type')
    .isIn(['harassment', 'discrimination', 'safety', 'other'])
    .withMessage('Report type must be one of: harassment, discrimination, safety, other'),
    
  body('incidentAt')
    .optional()
    .isISO8601()
    .withMessage('Incident date must be a valid date'),
    
  body('partiesInvolved')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Parties involved must be less than 1000 characters')
    .customSanitizer(sanitizeString),
    
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location must be less than 200 characters')
    .customSanitizer(sanitizeString),
    
  body('contactPreference')
    .optional()
    .isIn(['email', 'phone', 'in_person', 'none'])
    .withMessage('Contact preference must be one of: email, phone, in_person, none'),
];

/**
 * Comment validation rules
 */
export const validateComment = [
  body('body')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment must be 1-2000 characters long')
    .customSanitizer(sanitizeMarkdown),
    
  body('visibility')
    .isIn(['public', 'internal'])
    .withMessage('Visibility must be either public or internal'),
    
  body('isMarkdown')
    .optional()
    .isBoolean()
    .withMessage('isMarkdown must be a boolean'),
];

/**
 * Organization validation rules
 */
export const validateOrganization = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Organization name must be 2-100 characters long')
    .customSanitizer(sanitizeString),
    
  body('slug')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Slug must be 2-50 characters long')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens')
    .not().matches(/^-|-$/)
    .withMessage('Slug cannot start or end with a hyphen')
    .not().matches(/--/)
    .withMessage('Slug cannot contain consecutive hyphens')
    .customSanitizer(sanitizeString),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
    .customSanitizer(sanitizeString),
    
  body('website')
    .optional()
    .trim()
    .isURL({ require_protocol: true, protocols: ['http', 'https'] })
    .withMessage('Please enter a valid URL with http:// or https://')
    .customSanitizer(sanitizeString),
];

/**
 * Sanitize input middleware with enhanced validation
 * Applies DOMPurify sanitization to request data while preserving sensitive fields
 * Enhanced with type validation for sensitive fields
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any, path = ''): any => {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map((item, index) => sanitizeObject(item, `${path}[${index}]`));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = path ? `${path}.${key}` : key;
        
        // Enhanced validation for sensitive fields
        if (key.toLowerCase().includes('password')) {
          // Validate password format without sanitizing
          if (typeof value === 'string') {
            // Check for basic password requirements and potential attacks
            if (value.length < 8 || value.length > 128) {
              throw new Error(`Invalid password length in ${fieldPath}`);
            }
            // Ensure password doesn't contain obvious attack patterns
            if (/<script|javascript:|on\w+=/gi.test(value)) {
              throw new Error(`Invalid password format in ${fieldPath}`);
            }
            sanitized[key] = value; // Don't sanitize passwords
          } else {
            throw new Error(`Password must be a string in ${fieldPath}`);
          }
        } else if (key.toLowerCase().includes('token') || key.toLowerCase().includes('hash')) {
          // Validate token/hash format without sanitizing
          if (typeof value === 'string') {
            // Tokens/hashes should be alphanumeric with limited special chars
            if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
              throw new Error(`Invalid token/hash format in ${fieldPath}`);
            }
            if (value.length > 500) { // Reasonable token length limit
              throw new Error(`Token/hash too long in ${fieldPath}`);
            }
            sanitized[key] = value; // Don't sanitize tokens/hashes
          } else {
            throw new Error(`Token/hash must be a string in ${fieldPath}`);
          }
        } else if (key.toLowerCase().includes('email')) {
          // Enhanced email validation
          if (typeof value === 'string') {
            if (!validator.isEmail(value)) {
              throw new Error(`Invalid email format in ${fieldPath}`);
            }
            if (value.length > 254) { // RFC 5321 limit
              throw new Error(`Email too long in ${fieldPath}`);
            }
            // Sanitize email but preserve valid format
            sanitized[key] = DOMPurify.sanitize(value, {
              ALLOWED_TAGS: [],
              ALLOWED_ATTR: [],
            });
          } else if (value !== null && value !== undefined) {
            throw new Error(`Email must be a string in ${fieldPath}`);
          } else {
            sanitized[key] = value;
          }
        } else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('website')) {
          // Enhanced URL validation
          if (typeof value === 'string') {
            if (!validator.isURL(value, { 
              protocols: ['http', 'https'],
              require_protocol: true,
              require_valid_protocol: true,
              allow_underscores: false,
              allow_trailing_dot: false,
              allow_protocol_relative_urls: false
            })) {
              throw new Error(`Invalid URL format in ${fieldPath}`);
            }
            if (value.length > 2048) { // Reasonable URL length limit
              throw new Error(`URL too long in ${fieldPath}`);
            }
            sanitized[key] = DOMPurify.sanitize(value, {
              ALLOWED_TAGS: [],
              ALLOWED_ATTR: [],
            });
          } else if (value !== null && value !== undefined) {
            throw new Error(`URL must be a string in ${fieldPath}`);
          } else {
            sanitized[key] = value;
          }
        } else if (key.toLowerCase().includes('phone')) {
          // Enhanced phone validation
          if (typeof value === 'string') {
            // Allow international phone formats
            if (!validator.isMobilePhone(value, 'any', { strictMode: false })) {
              throw new Error(`Invalid phone format in ${fieldPath}`);
            }
            sanitized[key] = DOMPurify.sanitize(value, {
              ALLOWED_TAGS: [],
              ALLOWED_ATTR: [],
            });
          } else if (value !== null && value !== undefined) {
            throw new Error(`Phone must be a string in ${fieldPath}`);
          } else {
            sanitized[key] = value;
          }
        } else if (typeof value === 'string') {
          // Enhanced sanitization for regular string fields
          let sanitizedValue = DOMPurify.sanitize(value, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: [],
            ALLOW_DATA_ATTR: false,
            SANITIZE_DOM: true,
            KEEP_CONTENT: false,
          });
          
          // Additional validation for sanitized content
          if (sanitizedValue !== value) {
            // Log when content was modified by sanitization
            console.warn(`Content sanitized in ${fieldPath}:`, {
              original: value.substring(0, 100),
              sanitized: sanitizedValue.substring(0, 100),
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              path: req.path,
            });
          }
          
          // Check for length limits based on field type
          if (key.toLowerCase().includes('name') && sanitizedValue.length > 100) {
            throw new Error(`Name too long in ${fieldPath}`);
          } else if (key.toLowerCase().includes('description') && sanitizedValue.length > 5000) {
            throw new Error(`Description too long in ${fieldPath}`);
          } else if (key.toLowerCase().includes('title') && sanitizedValue.length > 200) {
            throw new Error(`Title too long in ${fieldPath}`);
          } else if (sanitizedValue.length > 10000) {
            throw new Error(`Content too long in ${fieldPath}`);
          }
          
          sanitized[key] = sanitizedValue;
        } else {
          // Recursively sanitize nested objects
          sanitized[key] = sanitizeObject(value, fieldPath);
        }
      }
      
      return sanitized;
    }
    
    return obj;
  };
  
  try {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body, 'body');
    }
    
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query, 'query');
    }
    
    // Note: We don't sanitize req.params as they should be validated by route handlers
    // and contain only URL segments
    
    next();
  } catch (error) {
    console.warn('Input sanitization failed:', error, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
    
    return res.status(400).json({
      error: 'Invalid input',
      message: error instanceof Error ? error.message : 'Input validation failed',
    });
  }
};

/**
 * Validate ID parameters
 */
export const validateId = [
  param('id')
    .isUUID()
    .withMessage('ID must be a valid UUID'),
];

/**
 * Validate slug parameters
 */
export const validateSlug = [
  param('slug')
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens')
    .isLength({ min: 2, max: 50 })
    .withMessage('Slug must be 2-50 characters long'),
];

/**
 * Validate pagination query parameters
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
    
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'name', 'title'])
    .withMessage('Sort field must be one of: createdAt, updatedAt, name, title'),
    
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc'),
];

/**
 * Validate search query parameters
 */
export const validateSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must be less than 100 characters')
    .customSanitizer(sanitizeString),
];

/**
 * Rate limiting validation for sensitive operations
 */
export const validateSensitiveOperation = [
  body('confirmPassword')
    .optional()
    .custom((value, { req }) => {
      if (req.body.password && value !== req.body.password) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),
];

export {
  sanitizeString,
  sanitizeMarkdown
}; 