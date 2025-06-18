/**
 * Session Configuration
 * 
 * This module handles session middleware configuration
 */

import session from 'express-session';

// Session configuration
export const sessionConfig = session({
  secret: process.env.SESSION_SECRET || 'changeme',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

// Session options for different environments
export const getSessionConfig = (environment: string = process.env.NODE_ENV || 'development') => {
  const baseConfig = {
    secret: process.env.SESSION_SECRET || 'changeme',
    resave: false,
    saveUninitialized: false,
  };

  switch (environment) {
    case 'production':
      return session({
        ...baseConfig,
        cookie: {
          secure: true, // HTTPS only
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          sameSite: 'lax' as const, // Railway requires lax
        },
      });
    
    case 'test':
      return session({
        ...baseConfig,
        cookie: {
          secure: false,
          httpOnly: true,
          maxAge: 60 * 60 * 1000, // 1 hour for tests
        },
      });
    
    default: // development
      return session({
        ...baseConfig,
        cookie: {
          secure: false,
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
      });
  }
}; 