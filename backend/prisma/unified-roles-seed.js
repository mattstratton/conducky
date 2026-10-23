const { createPrismaClient } = require('./db');
const prisma = createPrismaClient();

/**
 * Unified roles seed - creates the core UnifiedRole entries needed for the system to function
 * This should be run automatically in production deployments
 */
async function seedUnifiedRoles() {
  console.log('🔑 Seeding unified roles...');
  
  const roles = [
    { name: 'system_admin', scope: 'system', level: 100, description: 'System administrator with global access' },
    { name: 'org_admin', scope: 'organization', level: 50, description: 'Organization administrator' },
    { name: 'org_viewer', scope: 'organization', level: 10, description: 'Organization viewer' },
    { name: 'event_admin', scope: 'event', level: 40, description: 'Event administrator' },
    { name: 'responder', scope: 'event', level: 20, description: 'Incident responder' },
    { name: 'reporter', scope: 'event', level: 5, description: 'Incident reporter' }
  ];
  
  for (const role of roles) {
    await prisma.unifiedRole.upsert({
      where: { name: role.name },
      update: {
        scope: role.scope,
        level: role.level,
        description: role.description
      },
      create: role,
    });
    console.log(`✅ Unified role ensured: ${role.name} (${role.scope}, level ${role.level})`);
  }

  console.log('🎯 Unified roles seeding complete!');
}

// Only run if called directly (not imported)
if (require.main === module) {
  seedUnifiedRoles()
    .catch(e => {
      console.error('❌ Error seeding unified roles:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedUnifiedRoles }; 