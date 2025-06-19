// Global teardown for Jest tests
// This runs after all test suites complete

module.exports = async () => {
  console.log('🧹 Running global test teardown...');
  
  if (global.cleanupPrismaConnections) {
    try {
      await global.cleanupPrismaConnections();
    } catch (error) {
      console.warn('Warning: Error during global cleanup:', error.message);
    }
  }
  
  console.log('✅ Global teardown complete');
}; 