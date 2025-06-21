const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Essential roles seed - creates only the core roles needed for the system to function
 * This should be run automatically in production deployments
 */
async function seedRoles() {
  console.log('🔑 Seeding essential roles...');
  
  const roles = ['Reporter', 'Responder', 'Event Admin', 'SuperAdmin'];
  
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`✅ Role ensured: ${name}`);
  }

  console.log('🎯 Essential roles seeding complete!');
}

// Only run if called directly (not imported)
if (require.main === module) {
  seedRoles()
    .catch(e => {
      console.error('❌ Error seeding roles:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedRoles }; 