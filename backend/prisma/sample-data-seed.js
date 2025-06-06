const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  // Ensure roles exist
  const roles = ['Reporter', 'Responder', 'Admin', 'SuperAdmin'];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Sample events
  const events = [
    { name: 'Ponyville', slug: 'ponyville' },
    { name: 'DuckCon', slug: 'duckcon' },
    { name: 'TechFest', slug: 'techfest' },
  ];
  const eventRecords = {};
  for (const ev of events) {
    eventRecords[ev.slug] = await prisma.event.upsert({
      where: { slug: ev.slug },
      update: {},
      create: { name: ev.name, slug: ev.slug },
    });
  }

  // Sample users
  const userList = [
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' },
    { name: 'Charlie', email: 'charlie@example.com' },
    { name: 'Diana', email: 'diana@example.com' },
    { name: 'Eve', email: 'eve@example.com' },
    { name: 'Frank', email: 'frank@example.com' },
    { name: 'Grace', email: 'grace@example.com' },
    { name: 'Heidi', email: 'heidi@example.com' },
    { name: 'Ivan', email: 'ivan@example.com' },
    { name: 'Judy', email: 'judy@example.com' },
    { name: 'Mallory', email: 'mallory@example.com' },
    { name: 'Oscar', email: 'oscar@example.com' },
  ];
  const passwordHash = await bcrypt.hash('password', 10);
  const userRecords = {};
  for (const u of userList) {
    userRecords[u.name] = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
      },
    });
  }

  // Role assignments per event
  const roleMap = {};
  for (const name of roles) {
    roleMap[name] = await prisma.role.findUnique({ where: { name } });
  }

  // Ponyville
  await prisma.userEventRole.upsert({
    where: { userId_eventId_roleId: { userId: userRecords['Alice'].id, eventId: eventRecords['ponyville'].id, roleId: roleMap['Admin'].id } },
    update: {},
    create: { userId: userRecords['Alice'].id, eventId: eventRecords['ponyville'].id, roleId: roleMap['Admin'].id },
  });
  await prisma.userEventRole.upsert({
    where: { userId_eventId_roleId: { userId: userRecords['Bob'].id, eventId: eventRecords['ponyville'].id, roleId: roleMap['Responder'].id } },
    update: {},
    create: { userId: userRecords['Bob'].id, eventId: eventRecords['ponyville'].id, roleId: roleMap['Responder'].id },
  });
  await prisma.userEventRole.upsert({
    where: { userId_eventId_roleId: { userId: userRecords['Charlie'].id, eventId: eventRecords['ponyville'].id, roleId: roleMap['Responder'].id } },
    update: {},
    create: { userId: userRecords['Charlie'].id, eventId: eventRecords['ponyville'].id, roleId: roleMap['Responder'].id },
  });
  for (const name of ['Diana', 'Eve', 'Frank', 'Grace', 'Heidi']) {
    await prisma.userEventRole.upsert({
      where: { userId_eventId_roleId: { userId: userRecords[name].id, eventId: eventRecords['ponyville'].id, roleId: roleMap['Reporter'].id } },
      update: {},
      create: { userId: userRecords[name].id, eventId: eventRecords['ponyville'].id, roleId: roleMap['Reporter'].id },
    });
  }

  // Add 50+ additional users for Ponyville
  for (let i = 1; i <= 50; i++) {
    const name = `User${i}`;
    const email = `user${i}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        passwordHash,
      },
    });
    await prisma.userEventRole.upsert({
      where: { userId_eventId_roleId: { userId: user.id, eventId: eventRecords['ponyville'].id, roleId: roleMap['Reporter'].id } },
      update: {},
      create: { userId: user.id, eventId: eventRecords['ponyville'].id, roleId: roleMap['Reporter'].id },
    });
  }

  // DuckCon
  await prisma.userEventRole.upsert({
    where: { userId_eventId_roleId: { userId: userRecords['Ivan'].id, eventId: eventRecords['duckcon'].id, roleId: roleMap['Admin'].id } },
    update: {},
    create: { userId: userRecords['Ivan'].id, eventId: eventRecords['duckcon'].id, roleId: roleMap['Admin'].id },
  });
  await prisma.userEventRole.upsert({
    where: { userId_eventId_roleId: { userId: userRecords['Judy'].id, eventId: eventRecords['duckcon'].id, roleId: roleMap['Responder'].id } },
    update: {},
    create: { userId: userRecords['Judy'].id, eventId: eventRecords['duckcon'].id, roleId: roleMap['Responder'].id },
  });
  await prisma.userEventRole.upsert({
    where: { userId_eventId_roleId: { userId: userRecords['Mallory'].id, eventId: eventRecords['duckcon'].id, roleId: roleMap['Responder'].id } },
    update: {},
    create: { userId: userRecords['Mallory'].id, eventId: eventRecords['duckcon'].id, roleId: roleMap['Responder'].id },
  });
  for (const name of ['Oscar', 'Alice', 'Bob', 'Charlie']) {
    await prisma.userEventRole.upsert({
      where: { userId_eventId_roleId: { userId: userRecords[name].id, eventId: eventRecords['duckcon'].id, roleId: roleMap['Reporter'].id } },
      update: {},
      create: { userId: userRecords[name].id, eventId: eventRecords['duckcon'].id, roleId: roleMap['Reporter'].id },
    });
  }

  // TechFest
  await prisma.userEventRole.upsert({
    where: { userId_eventId_roleId: { userId: userRecords['Eve'].id, eventId: eventRecords['techfest'].id, roleId: roleMap['Admin'].id } },
    update: {},
    create: { userId: userRecords['Eve'].id, eventId: eventRecords['techfest'].id, roleId: roleMap['Admin'].id },
  });
  await prisma.userEventRole.upsert({
    where: { userId_eventId_roleId: { userId: userRecords['Frank'].id, eventId: eventRecords['techfest'].id, roleId: roleMap['Responder'].id } },
    update: {},
    create: { userId: userRecords['Frank'].id, eventId: eventRecords['techfest'].id, roleId: roleMap['Responder'].id },
  });
  await prisma.userEventRole.upsert({
    where: { userId_eventId_roleId: { userId: userRecords['Grace'].id, eventId: eventRecords['techfest'].id, roleId: roleMap['Responder'].id } },
    update: {},
    create: { userId: userRecords['Grace'].id, eventId: eventRecords['techfest'].id, roleId: roleMap['Responder'].id },
  });
  for (const name of ['Heidi', 'Ivan', 'Judy', 'Mallory']) {
    await prisma.userEventRole.upsert({
      where: { userId_eventId_roleId: { userId: userRecords[name].id, eventId: eventRecords['techfest'].id, roleId: roleMap['Reporter'].id } },
      update: {},
      create: { userId: userRecords[name].id, eventId: eventRecords['techfest'].id, roleId: roleMap['Reporter'].id },
    });
  }

  console.log('Sample events, users, and roles seeded.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 