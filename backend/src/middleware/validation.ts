/**
 * Validation Middleware
 * 
 * This module contains request validation middleware functions
 */

import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
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
 * General input sanitization middleware
 * Sanitizes all string inputs in request body, query, and params
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip certain fields that should not be sanitized
        if (['password', 'token', 'hash'].includes(key.toLowerCase())) {
          sanitized[key] = value;
        } else {
          sanitized[key] = sanitizeObject(value);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);
  
  next();
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