// CRITICAL: Load test environment variables FIRST, before any other modules
// This must happen before Prisma client is initialized in index.js
process.env.NODE_ENV = 'test';

// Clear any existing environment variables that might interfere
delete process.env.DATABASE_URL;

// Load test environment with override to ensure it takes precedence
require('dotenv').config({ path: '.env.test', override: true });

// Verify the environment is set correctly
console.log('🧪 Test Environment Loaded');
console.log('📝 NODE_ENV:', process.env.NODE_ENV);
console.log('🗄️ Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@')); // Hide password

// Ensure the test database URL is set
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('localhost:5432')) {
  throw new Error('Test environment not loaded correctly. DATABASE_URL should point to localhost:5432');
} 