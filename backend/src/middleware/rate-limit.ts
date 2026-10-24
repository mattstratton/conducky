import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import logger from '../config/logger';

/**
 * Rate limiting configurations for different operations
 */

/**
 * Helper function to check if rate limiting should be skipped
 * Skip in test, development, or when NODE_ENV is not set
 */
const shouldSkipRateLimit = (req: Request): boolean => {
  const env = process.env.NODE_ENV;
  return env === 'test' || env === 'development' || !env;
};

/**
 * General API rate limiting
 * 100 requests per 15 minutes per IP
 * Skip rate limiting in test and development environments
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: shouldSkipRateLimit,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Authentication rate limiting
 * 5 attempts per 15 minutes per IP for login/register
 * Skip rate limiting in test and development environments
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Authentication rate limit exceeded',
      message: 'Too many authentication attempts from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Strict rate limiting for sensitive operations
 * 10 requests per hour per IP
 */
export const strictRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Rate limit exceeded for sensitive operation',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Strict rate limit exceeded',
      message: 'Too many requests for this sensitive operation, please try again later.',
      retryAfter: '1 hour'
    });
  }
});

/**
 * Password reset rate limiting
 * 3 attempts per hour per IP
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    error: 'Too many password reset attempts from this IP, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Password reset rate limit exceeded',
      message: 'Too many password reset attempts from this IP, please try again later.',
      retryAfter: '1 hour'
    });
  }
});

/**
 * Own verification email requests (the nudge banner)
 * 5 requests per 15 minutes per IP, a separate budget from login/register
 */
export const verificationEmailRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Verification email rate limit exceeded',
      message: 'Too many verification email requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * File upload rate limiting
 * 20 uploads per 15 minutes per IP
 */
export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 uploads per windowMs
  message: {
    error: 'Too many file uploads from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Upload rate limit exceeded',
      message: 'Too many file uploads from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Legacy alias for file upload rate limiting
 */
export const fileUploadRateLimit = uploadRateLimit;

/**
 * Report creation rate limiting
 * 10 reports per hour per IP
 */
export const reportCreationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 reports per hour
  message: {
    error: 'Too many reports created from this IP, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Report creation rate limit exceeded',
      message: 'Too many reports created from this IP, please try again later.',
      retryAfter: '1 hour'
    });
  }
});

/**
 * Comment creation rate limiting
 * 30 comments per hour per IP
 */
export const commentCreationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // limit each IP to 30 comments per hour
  message: {
    error: 'Too many comments created from this IP, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Comment creation rate limit exceeded',
      message: 'Too many comments created from this IP, please try again later.',
      retryAfter: '1 hour'
    });
  }
});

/**
 * Email check rate limiting
 * 5 checks per 15 minutes per IP to prevent user enumeration
 */
export const emailCheckRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 email checks per windowMs
  message: {
    error: 'Too many email checks from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Email check rate limit exceeded',
      message: 'Too many email check attempts from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});
