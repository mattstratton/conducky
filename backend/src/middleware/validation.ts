/**
 * Validation Middleware
 * 
 * This module contains request validation middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import { validatePassword, validateEmail, validateRequiredFields } from '../utils/validation';

/**
 * Middleware to validate required fields in request body
 */
export function validateRequired(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const validation = validateRequiredFields(req.body, fields);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing: validation.missingFields,
      });
    }
    return next();
  };
}

/**
 * Middleware to validate password strength
 */
export function validatePasswordStrength(req: Request, res: Response, next: NextFunction) {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }
  
  const validation = validatePassword(password);
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.error || 'Password does not meet requirements',
    });
  }
  
  return next();
}

/**
 * Middleware to validate email format
 */
export function validateEmailFormat(req: Request, res: Response, next: NextFunction) {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  return next();
}

/**
 * Middleware to validate registration data
 */
export function validateRegistration(req: Request, res: Response, next: NextFunction) {
  const requiredFields = ['email', 'password', 'name'];
  const validation = validateRequiredFields(req.body, requiredFields);
  
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Missing required fields',
      missing: validation.missingFields,
    });
  }
  
  // Validate email format
  if (!validateEmail(req.body.email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  // Validate password strength
  const passwordValidation = validatePassword(req.body.password);
  if (!passwordValidation.valid) {
    return res.status(400).json({
      error: passwordValidation.error || 'Password does not meet requirements',
    });
  }
  
  return next();
}

/**
 * Middleware to validate login data
 */
export function validateLogin(req: Request, res: Response, next: NextFunction) {
  const requiredFields = ['email', 'password'];
  const validation = validateRequiredFields(req.body, requiredFields);
  
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Missing required fields',
      missing: validation.missingFields,
    });
  }
  
  // Validate email format
  if (!validateEmail(req.body.email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  return next();
}

/**
 * Middleware to validate event creation data
 */
export function validateEventCreation(req: Request, res: Response, next: NextFunction) {
  const requiredFields = ['name', 'slug'];
  const validation = validateRequiredFields(req.body, requiredFields);
  
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Missing required fields',
      missing: validation.missingFields,
    });
  }
  
  // Validate slug format (alphanumeric and hyphens only)
  const slugPattern = /^[a-z0-9-]+$/;
  if (!slugPattern.test(req.body.slug)) {
    return res.status(400).json({
      error: 'Invalid slug format. Use only lowercase letters, numbers, and hyphens.',
    });
  }
  
  return next();
} 