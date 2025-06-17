/**
 * Logging Middleware
 * 
 * This module contains logging-related middleware functions
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Global request logger middleware
 * Logs all incoming requests with method and URL
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  console.log('[GLOBAL] Incoming request:', req.method, req.url);
  next();
}

/**
 * Enhanced request logger with timing and response status
 */
export function enhancedRequestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const originalSend = res.send;
  
  // Override res.send to capture response details
  res.send = function(body: any) {
    const duration = Date.now() - start;
    console.log(`[REQUEST] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    return originalSend.call(this, body);
  };
  
  next();
}

/**
 * Error logging middleware
 */
export function errorLogger(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[ERROR]', {
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });
  next(err);
}

/**
 * Development-only detailed request logger
 */
export function devRequestLogger(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEV] Request Details:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
      timestamp: new Date().toISOString(),
    });
  }
  next();
} 