const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { seedRoles } = require('./roles-seed');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting development seed data...');
  
  // First, ensure essential roles exist
  await seedRoles();

  // Create SuperAdmin user first (needed for organization creation)
  const superEmail = 'superadmin@test.com';
  const superPassword = 'superpass';
  const superPasswordHash = await bcrypt.hash(superPassword, 10);
  const superUser = await prisma.user.upsert({
    where: { email: superEmail },
    update: {},
    create: {
      email: superEmail,
      name: 'Super Admin',
      passwordHash: superPasswordHash,
    },
  });

  // Create test organization
  const testOrg = await prisma.organization.upsert({
    where: { slug: 'test-organization' },
    update: {},
    create: {
      name: 'Test Organization',
      slug: 'test-organization',
      description: 'A test organization for development and testing',
      website: 'https://test-org.example.com',
      createdById: superUser.id,
    },
  });

  // Create event linked to organization
  const event = await prisma.event.upsert({
    where: { slug: 'test-event' },
    update: {
      organizationId: testOrg.id, // Link existing event to organization
    },
    create: {
      name: 'Test Event',
      slug: 'test-event',
      organizationId: testOrg.id,
    },
  });

  // Create event admin user
  const adminEmail = 'admin@test.com';
  const adminPassword = 'adminpass';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Event Admin',
      passwordHash: adminPasswordHash,
    },
  });

  // Assign Event Admin role to user for the event
  const eventAdminRole = await prisma.role.findUnique({ where: { name: 'Event Admin' } });
  await prisma.userEventRole.upsert({
    where: {
      userId_eventId_roleId: {
        userId: adminUser.id,
        eventId: event.id,
        roleId: eventAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      eventId: event.id,
      roleId: eventAdminRole.id,
    },
  });

  // Make the event admin also an org admin (as per migration strategy)
  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: testOrg.id,
        userId: adminUser.id,
      },
    },
    update: {},
    create: {
      organizationId: testOrg.id,
      userId: adminUser.id,
      role: 'org_admin',
      createdById: superUser.id,
    },
  });

  // Assign SuperAdmin role to super user for the event (for testing purposes)
  const superRole = await prisma.role.findUnique({ where: { name: 'SuperAdmin' } });
  await prisma.userEventRole.upsert({
    where: {
      userId_eventId_roleId: {
        userId: superUser.id,
        eventId: event.id,
        roleId: superRole.id,
      },
    },
    update: {},
    create: {
      userId: superUser.id,
      eventId: event.id,
      roleId: superRole.id,
    },
  });

  // Create an org viewer user for testing
  const viewerEmail = 'viewer@test.com';
  const viewerPassword = 'viewerpass';
  const viewerPasswordHash = await bcrypt.hash(viewerPassword, 10);
  const viewerUser = await prisma.user.upsert({
    where: { email: viewerEmail },
    update: {},
    create: {
      email: viewerEmail,
      name: 'Org Viewer',
      passwordHash: viewerPasswordHash,
    },
  });

  // Assign org viewer role
  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: testOrg.id,
        userId: viewerUser.id,
      },
    },
    update: {},
    create: {
      organizationId: testOrg.id,
      userId: viewerUser.id,
      role: 'org_viewer',
      createdById: superUser.id,
    },
  });

  // Seed system setting for public event list
  await prisma.systemSetting.upsert({
    where: { key: 'showPublicEventList' },
    update: {},
    create: { key: 'showPublicEventList', value: 'false' },
  });

  console.log('✅ Test organization created:', testOrg.name, '(ID:', testOrg.id + ')');
  console.log('✅ Test event linked to organization. Event ID:', event.id);
  console.log('✅ SuperAdmin user seeded:', superEmail, '/ password:', superPassword);
  console.log('✅ Event Admin user seeded:', adminEmail, '/ password:', adminPassword, '(also org admin)');
  console.log('✅ Org Viewer user seeded:', viewerEmail, '/ password:', viewerPassword);
  console.log('✅ SystemSetting seeded: showPublicEventList = false');
  console.log('\n🎯 Development seed data complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 