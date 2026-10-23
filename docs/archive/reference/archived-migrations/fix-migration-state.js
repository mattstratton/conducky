const { execSync } = require('child_process');

console.log('🔧 Fixing failed migration state...');

try {
  // Resolve the failed migration
  console.log('📝 Marking failed migration as resolved...');
  execSync('npx prisma migrate resolve --applied 20250623155858_remove_legacy_rbac_tables', { 
    stdio: 'inherit',
    cwd: __dirname + '/..'
  });
  
  console.log('✅ Migration state resolved!');
  
  // Now deploy any pending migrations
  console.log('🚀 Deploying migrations...');
  execSync('npx prisma migrate deploy', { 
    stdio: 'inherit',
    cwd: __dirname + '/..'
  });
  
  console.log('🎉 All migrations applied successfully!');
  
} catch (error) {
  console.error('❌ Error fixing migration state:', error.message);
  process.exit(1);
} 