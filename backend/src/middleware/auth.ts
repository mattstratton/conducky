/**
 * Authentication Middleware
 * 
 * This module contains authentication-related middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { logAudit } from '../utils/audit';
import logger from '../config/logger';

/**
 * User type for authenticated requests
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  [key: string]: any;
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: any, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  logger().warn('Authentication required', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method
  });
  
  return res.status(401).json({ error: 'Authentication required' });
}

/**
 * Test-only authentication middleware for testing environment
 */
export function testAuthMiddleware(req: any, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV !== 'test') {
    return next();
  }

  // Allow disabling authentication for specific tests
  const disableAuth = req.headers['x-test-disable-auth'];
  if (disableAuth === 'true') {
    req.isAuthenticated = () => false;
    req.user = null;
    return next();
  }
  
  // Allow setting specific user via header
  const testUserId = req.headers['x-test-user-id'] as string;
  if (testUserId) {
    req.isAuthenticated = () => true;
    req.user = {
      id: testUserId,
      email: `${testUserId}@example.com`,
      name: `User${testUserId}`,
    };
  } else {
    // Default authenticated user
    req.isAuthenticated = () => true;
    req.user = { id: '1', email: 'admin@example.com', name: 'Admin' };
  }
  return next();
}

/**
 * Middleware to handle login with Passport
 */
export function loginMiddleware(req: Request, res: Response, next: NextFunction): void {
  return passport.authenticate('local', async (err: any, user: any, info: any) => {
    if (err) {
      return res.status(500).json({ error: 'Authentication error', details: err.message });
    }
    if (!user) {
      // Log failed login attempt
      const email = req.body.email;
      if (email) {
        try {
          await logAudit({
            action: 'login_failed',
            targetType: 'User',
            targetId: email, // Use email as targetId since we don't have userId for failed attempts
            userId: undefined // No userId for failed login
          });
        } catch (auditErr) {
          logger().error('Failed to log audit for failed login:', auditErr);
        }
      }
      return res.status(401).json({
        error: info?.message || 'Invalid credentials',
        ...(info?.code && { code: info.code })
      });
    }
    
    return req.logIn(user, async (loginErr: any) => {
      if (loginErr) {
        return res.status(500).json({ error: 'Login failed', details: loginErr.message });
      }
      
      // Log successful login
      try {
        await logAudit({
          action: 'login_successful',
          targetType: 'User',
          targetId: user.id,
          userId: user.id
        });
      } catch (auditErr) {
        logger().error('Failed to log audit for successful login:', auditErr);
      }
      
      return res.json({
        message: 'Logged in!',
        user: { id: user.id, email: user.email, name: user.name },
      });
    });
  })(req, res, next);
}

/**
 * Middleware to handle logout
 */
export function logoutMiddleware(req: Request, res: Response): void {
  req.logout((err: any) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed.' });
    }
    
    // Destroy the session to fully clear it
    req.session.destroy((sessionErr: any) => {
      if (sessionErr) {
        logger().error('Session destruction failed:', sessionErr);
        return res.status(500).json({ error: 'Logout failed.' });
      }
      
      // Clear the session cookie
      res.clearCookie('connect.sid'); // Default session cookie name
      return res.json({ message: 'Logged out!' });
    });
  });
} 