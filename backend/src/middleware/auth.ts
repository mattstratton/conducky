/**
 * Authentication Middleware
 * 
 * This module contains authentication-related middleware functions
 */

import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { prisma } from '../config/database';

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
 * Configure Passport.js local strategy
 */
export function configurePassport() {
  // Passport local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email: string, password: string, done: any) => {
        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.passwordHash) {
            return done(null, false, { message: 'Incorrect email or password.' });
          }
          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) {
            return done(null, false, { message: 'Incorrect email or password.' });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );

  passport.serializeUser((user: any, done: any) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done: any) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: any, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
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
  return passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      return res.status(500).json({ error: 'Authentication error', details: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }
    
    return req.logIn(user, (loginErr: any) => {
      if (loginErr) {
        return res.status(500).json({ error: 'Login failed', details: loginErr.message });
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
    return res.json({ message: 'Logged out!' });
  });
} 