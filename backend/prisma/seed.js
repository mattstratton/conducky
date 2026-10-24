require('./dev-only')('seed.js');
const { createPrismaClient } = require('./db');
const bcrypt = require('bcrypt');
const { seedUnifiedRoles } = require('./unified-roles-seed');
const prisma = createPrismaClient();

/** Grant a unified role once; safe to run again. */
async function grantRole(userId, roleMap, roleName, scopeType, scopeId) {
  const roleId = roleMap[roleName].id;
  await prisma.userRole.upsert({
    where: { user_role_unique: { userId, roleId, scopeType, scopeId } },
    update: {},
    create: { userId, roleId, scopeType, scopeId, grantedAt: new Date() },
  });
}

/** Create the user with a hashed password if the email is new; safe to run again. */
async function upsertUser(email, name, password) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, passwordHash: await bcrypt.hash(password, 10), emailVerifiedAt: new Date() },
  });
}

async function main() {
  console.log('🌱 Starting development seed data...');

  // Essential roles first; everything below grants them
  await seedUnifiedRoles();
  const roleMap = Object.fromEntries(
    (await prisma.unifiedRole.findMany()).map(role => [role.name, role]),
  );

  // System Admin first (needed to create the organization)
  const superEmail = 'superadmin@test.com';
  const superPassword = 'superpass';
  const superUser = await upsertUser(superEmail, 'Super Admin', superPassword);
  await grantRole(superUser.id, roleMap, 'system_admin', 'system', 'SYSTEM');

  // Test organization
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

  // Event linked to the organization
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

  // Event admin, who is also an org admin (as on event creation)
  const adminEmail = 'admin@test.com';
  const adminPassword = 'adminpass';
  const adminUser = await upsertUser(adminEmail, 'Event Admin', adminPassword);
  await grantRole(adminUser.id, roleMap, 'event_admin', 'event', event.id);
  await grantRole(adminUser.id, roleMap, 'org_admin', 'organization', testOrg.id);

  // Org viewer
  const viewerEmail = 'viewer@test.com';
  const viewerPassword = 'viewerpass';
  const viewerUser = await upsertUser(viewerEmail, 'Org Viewer', viewerPassword);
  await grantRole(viewerUser.id, roleMap, 'org_viewer', 'organization', testOrg.id);

  // System setting for the public event list
  await prisma.systemSetting.upsert({
    where: { key: 'showPublicEventList' },
    update: {},
    create: { key: 'showPublicEventList', value: 'false' },
  });

  console.log(`✅ Test organization created: ${testOrg.name} (ID: ${testOrg.id})`);
  console.log('✅ Test event linked to organization. Event ID:', event.id);
  console.log('✅ System Admin user seeded:', superEmail, '/ password:', superPassword);
  console.log('✅ Event Admin user seeded:', adminEmail, '/ password:', adminPassword, '(also org admin)');
  console.log('✅ Org Viewer user seeded:', viewerEmail, '/ password:', viewerPassword);
  console.log('✅ SystemSetting seeded: showPublicEventList = false');
  console.log('\n🎯 Development seed data complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
