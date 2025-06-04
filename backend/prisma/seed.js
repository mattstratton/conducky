const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const roles = ['Reporter', 'Responder', 'Admin', 'SuperAdmin'];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const event = await prisma.event.upsert({
    where: { slug: 'test-event' },
    update: {},
    create: {
      name: 'Test Event',
      slug: 'test-event',
    },
  });

  // Create admin user for the event
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
  const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });
  await prisma.userEventRole.upsert({
    where: {
      userId_eventId_roleId: {
        userId: adminUser.id,
        eventId: event.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      eventId: event.id,
      roleId: adminRole.id,
    },
  });

  // Create global superuser
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
  const superRole = await prisma.role.findUnique({ where: { name: 'SuperAdmin' } });
  // Assign SuperAdmin role globally (eventId can be null or a special value if your logic supports it)
  // If eventId is required, you may need to assign to a dummy event or all events
  // Here, we'll assign to the test event for demo purposes
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

  console.log('Default roles seeded.');
  console.log('Test event seeded. Event ID:', event.id);
  console.log('Admin user seeded:', adminEmail, '/ password:', adminPassword);
  console.log('SuperAdmin user seeded:', superEmail, '/ password:', superPassword);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 