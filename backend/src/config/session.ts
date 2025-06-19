/**
 * Session Configuration
 * 
 * This module handles session middleware configuration with enhanced security
 */

import session from 'express-session';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Session timeout in milliseconds (2 hours for production, 24 hours for dev)
const SESSION_TIMEOUT = process.env.NODE_ENV === 'production' 
  ? 2 * 60 * 60 * 1000  // 2 hours in production
  : 24 * 60 * 60 * 1000; // 24 hours in development

// Session configuration
export const sessionConfig = session({
  secret: process.env.SESSION_SECRET || 'changeme',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: SESSION_TIMEOUT,
    sameSite: 'lax' as const, // CSRF protection
  },
  name: 'conducky.sid', // Don't use default session name
});

// Session security middleware
export function sessionSecurity(req: Request, res: Response, next: NextFunction) {
  // Skip for non-authenticated routes
  if (!req.session || !req.user) {
    return next();
  }

  const now = Date.now();
  const session = req.session as any;

  // Initialize session timestamp on first login
  if (!session.lastActivity) {
    session.lastActivity = now;
    session.createdAt = now;
    return next();
  }

  // Check for session timeout (2 hours of inactivity)
  const inactivityTimeout = 2 * 60 * 60 * 1000; // 2 hours
  if (now - session.lastActivity > inactivityTimeout) {
    logger.security('Session expired due to inactivity', {
      userId: (req.user as any)?.id,
      lastActivity: new Date(session.lastActivity).toISOString(),
      ip: req.ip
    });
    
    req.session.destroy((err) => {
      if (err) {
        logger.error('Failed to destroy expired session', { error: err.message });
      }
    });
    
    return res.status(401).json({ error: 'Session expired due to inactivity' });
  }

  // Check for absolute session timeout (8 hours max)
  const absoluteTimeout = 8 * 60 * 60 * 1000; // 8 hours
  if (now - session.createdAt > absoluteTimeout) {
    logger.security('Session expired due to absolute timeout', {
      userId: (req.user as any)?.id,
      createdAt: new Date(session.createdAt).toISOString(),
      ip: req.ip
    });
    
    req.session.destroy((err) => {
      if (err) {
        logger.error('Failed to destroy expired session', { error: err.message });
      }
    });
    
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  // Update last activity
  session.lastActivity = now;

  // Regenerate session ID periodically (every hour) to prevent fixation
  const regenerationInterval = 60 * 60 * 1000; // 1 hour
  if (!session.lastRegeneration || (now - session.lastRegeneration > regenerationInterval)) {
    req.session.regenerate((err) => {
      if (err) {
        logger.error('Failed to regenerate session', { error: err.message });
        return next();
      }
      
      session.lastRegeneration = now;
      session.lastActivity = now;
      logger.debug('Session ID regenerated', { 
        userId: (req.user as any)?.id,
        ip: req.ip 
      });
      next();
    });
  } else {
    next();
  }
}

// Session options for different environments
export const getSessionConfig = (environment: string = process.env.NODE_ENV || 'development') => {
  const baseConfig = {
    secret: process.env.SESSION_SECRET || 'changeme',
    resave: false,
    saveUninitialized: false,
    name: 'conducky.sid',
  };

  switch (environment) {
    case 'production':
      return session({
        ...baseConfig,
        cookie: {
          secure: true, // HTTPS only
          httpOnly: true,
          maxAge: 2 * 60 * 60 * 1000, // 2 hours in production
          sameSite: 'lax' as const,
        },
      });
    
    case 'test':
      return session({
        ...baseConfig,
        cookie: {
          secure: false,
          httpOnly: true,
          maxAge: 60 * 60 * 1000, // 1 hour for tests
          sameSite: 'lax' as const,
        },
      });
    
    default: // development
      return session({
        ...baseConfig,
        cookie: {
          secure: false,
          httpOnly: true,
          maxAge: SESSION_TIMEOUT,
          sameSite: 'lax' as const,
        },
      });
  }
}; 