/**
 * Database Configuration
 * 
 * This module handles Prisma client initialization and database configuration
 * with comprehensive query monitoring and performance tracking
 */

import { PrismaClient } from '../generated/prisma/client';
import { createAdapter } from './prisma-client';
import logger from '../config/logger';
import { databaseMonitor } from '../services/database-monitoring.service';

// Query performance monitoring thresholds
const SLOW_QUERY_THRESHOLD = 100; // milliseconds
const VERY_SLOW_QUERY_THRESHOLD = 500; // milliseconds

// Initialize Prisma client with comprehensive monitoring
export const prisma = new PrismaClient({
  adapter: createAdapter(),
  log: process.env.NODE_ENV === 'development' 
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' }
      ]
    : [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' }
      ],
});

// Query performance monitoring
if (process.env.NODE_ENV !== 'test') {  prisma.$on('query', (e) => {
    const duration = e.duration; // duration is already a number in milliseconds
    
    // Record query in monitoring service
    databaseMonitor.recordQuery(e.query, duration, e.params);
    
    // Log slow queries with context
    if (duration > VERY_SLOW_QUERY_THRESHOLD) {
      logger().warn('Very slow database query detected', {
        query: e.query.slice(0, 200) + (e.query.length > 200 ? '...' : ''),
        params: e.params,
        duration: `${duration}ms`,
        timestamp: e.timestamp,
        target: e.target,
        performance: 'very_slow'
      });
    } else if (duration > SLOW_QUERY_THRESHOLD) {
      logger().info('Slow database query detected', {
        query: e.query.slice(0, 100) + (e.query.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        timestamp: e.timestamp,
        performance: 'slow'
      });
    }
    
    // Log query metrics in development for analysis
    if (process.env.NODE_ENV === 'development') {
      logger().debug('Database query executed', {
        query: e.query.slice(0, 150) + (e.query.length > 150 ? '...' : ''),
        duration: `${duration}ms`,
        timestamp: e.timestamp,
        target: e.target
      });
    }
  });

  // Log database errors with context
  prisma.$on('error', (e) => {
    logger().error('Database error occurred', {
      message: e.message,
      timestamp: e.timestamp,
      target: e.target
    });
  });

  // Log database warnings
  prisma.$on('warn', (e) => {
    logger().warn('Database warning', {
      message: e.message,
      timestamp: e.timestamp,
      target: e.target
    });
  });
}

// Database configuration object
export const databaseConfig = {
  client: prisma,
  
  // Connection test function
  async testConnection(): Promise<boolean> {
    try {
      await prisma.$connect();
      return true;
    } catch (error) {
      logger().error('Database connection failed:', error);
      return false;
    }
  },

  // Graceful shutdown
  async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
};

// Export default prisma client for backward compatibility
export default prisma; 