/**
 * CORS Configuration
 * 
 * This module handles Cross-Origin Resource Sharing configuration
 */

import cors from 'cors';

// CORS configuration
export const corsConfig = cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-test-disable-auth', 'x-test-user-id'],
});

// Environment-specific CORS configurations
export const getCorsConfig = (environment: string = process.env.NODE_ENV || 'development') => {
  const baseConfig = {
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  };

  switch (environment) {
    case 'production':
      return cors({
        ...baseConfig,
        origin: process.env.CORS_ORIGIN || false, // Strict origin checking in production
        allowedHeaders: ['Content-Type', 'Authorization'],
      });
    
    case 'test':
      return cors({
        ...baseConfig,
        origin: true, // Allow all origins in tests
        allowedHeaders: ['Content-Type', 'Authorization', 'x-test-disable-auth', 'x-test-user-id'],
      });
    
    default: // development
      return cors({
        ...baseConfig,
        origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
        allowedHeaders: ['Content-Type', 'Authorization', 'x-test-disable-auth', 'x-test-user-id'],
      });
  }
}; 