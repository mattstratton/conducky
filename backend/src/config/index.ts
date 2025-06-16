/**
 * Configuration Module Exports
 * 
 * This file aggregates all configuration modules for clean imports
 */

// Import configurations for aggregation
import { databaseConfig } from './database';
import { environmentConfig } from './environment';

// Export configuration modules
export { databaseConfig, prisma } from './database';
export { sessionConfig, getSessionConfig } from './session';
export { corsConfig, getCorsConfig } from './cors';
export { environmentConfig, getEnvironmentConfig, validateEnvironment } from './environment';

// Aggregated configuration object
export const config = {
  database: databaseConfig,
  environment: environmentConfig,
}; 