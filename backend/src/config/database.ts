/**
 * Database Configuration
 * 
 * This module handles Prisma client initialization and database configuration
 */

import { PrismaClient } from '@prisma/client';

// Initialize Prisma client with configuration
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Database configuration object
export const databaseConfig = {
  client: prisma,
  
  // Connection test function
  async testConnection(): Promise<boolean> {
    try {
      await prisma.$connect();
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
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