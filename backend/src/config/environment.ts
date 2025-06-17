/**
 * Environment Configuration
 * 
 * This module handles environment variable validation and configuration
 */

// Environment variable validation
export interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  SESSION_SECRET: string;
  CORS_ORIGIN: string;
  DATABASE_URL: string | undefined;
  EMAIL_PROVIDER: string | undefined;
  SMTP_HOST: string | undefined;
  SMTP_PORT: number | undefined;
  SMTP_USER: string | undefined;
  SMTP_PASS: string | undefined;
  SMTP_SECURE: boolean;
  SENDGRID_API_KEY: string | undefined;
}

// Default environment values
const defaultValues: Partial<EnvironmentConfig> = {
  NODE_ENV: 'development',
  PORT: 4000,
  SESSION_SECRET: 'changeme',
  CORS_ORIGIN: 'http://localhost:3001',
  EMAIL_PROVIDER: 'console',
  SMTP_PORT: 587,
  SMTP_SECURE: false,
};

// Parse and validate environment variables
export function getEnvironmentConfig(): EnvironmentConfig {
  const config: EnvironmentConfig = {
    NODE_ENV: process.env.NODE_ENV || defaultValues.NODE_ENV!,
    PORT: parseInt(process.env.PORT || defaultValues.PORT!.toString()),
    SESSION_SECRET: process.env.SESSION_SECRET || defaultValues.SESSION_SECRET!,
    CORS_ORIGIN: process.env.CORS_ORIGIN || defaultValues.CORS_ORIGIN!,
    DATABASE_URL: process.env.DATABASE_URL,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || defaultValues.EMAIL_PROVIDER,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : defaultValues.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_SECURE: process.env.SMTP_SECURE === 'true',
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  };

  return config;
}

// Validate required environment variables
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = getEnvironmentConfig();

  // Check for production-specific requirements
  if (config.NODE_ENV === 'production') {
    if (config.SESSION_SECRET === 'changeme') {
      errors.push('SESSION_SECRET must be set to a secure value in production');
    }
    
    if (!config.DATABASE_URL) {
      errors.push('DATABASE_URL is required in production');
    }
  }

  // Validate email configuration if provider is set
  if (config.EMAIL_PROVIDER === 'smtp') {
    if (!config.SMTP_HOST) {
      errors.push('SMTP_HOST is required when EMAIL_PROVIDER is smtp');
    }
  }

  if (config.EMAIL_PROVIDER === 'sendgrid') {
    if (!config.SENDGRID_API_KEY) {
      errors.push('SENDGRID_API_KEY is required when EMAIL_PROVIDER is sendgrid');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export the current environment configuration
export const environmentConfig = getEnvironmentConfig(); 