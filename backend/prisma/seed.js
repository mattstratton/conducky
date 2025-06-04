const { PrismaClient } = require('@prisma/client');
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

  console.log('Default roles seeded.');
  console.log('Test event seeded. Event ID:', event.id);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 