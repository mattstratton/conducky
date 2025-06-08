// backend/__mocks__/@prisma/client.js

// Shared persistent in-memory store for all tests
const inMemoryStore = {
  events: [{ id: '1', name: 'Event1', slug: 'event1' }],
  roles: [
    { id: '1', name: 'SuperAdmin' },
    { id: '2', name: 'Admin' },
    { id: '3', name: 'Responder' },
  ],
  users: [{ id: '1', email: 'admin@example.com', name: 'Admin' }],
  userEventRoles: [
    {
      userId: '1',
      eventId: '1',
      roleId: '1',
      role: { name: 'SuperAdmin' },
      user: { id: '1', email: 'admin@example.com', name: 'Admin' },
    },
  ],
  reports: [{ id: 'r1', eventId: '1', state: 'submitted' }],
  auditLogs: [],
};

class PrismaClient {
  constructor() {
    this.event = {
      findUnique: jest.fn(({ where }) => inMemoryStore.events.find(e => e.id === where.id || e.slug === where.slug) || null),
      create: jest.fn(({ data }) => {
        if (inMemoryStore.events.some(e => e.slug === data.slug)) {
          const err = new Error('Unique constraint failed');
          err.code = 'P2002';
          throw err;
        }
        const newEvent = { id: (inMemoryStore.events.length + 1).toString(), ...data };
        inMemoryStore.events.push(newEvent);
        return newEvent;
      }),
    };
    this.role = {
      findUnique: jest.fn(({ where }) => inMemoryStore.roles.find(r => r.name === where.name) || null),
      create: jest.fn(({ data }) => ({ id: (inMemoryStore.roles.length + 1).toString(), ...data })),
    };
    this.user = {
      findUnique: jest.fn(({ where }) => inMemoryStore.users.find(u => u.id === where.id || u.email === where.email) || null),
      count: jest.fn(() => inMemoryStore.users.length),
      create: jest.fn(({ data }) => {
        if (inMemoryStore.users.some(u => u.email === data.email)) {
          const err = new Error('Unique constraint failed');
          err.code = 'P2002';
          throw err;
        }
        const user = { ...data, id: String(inMemoryStore.users.length + 1) };
        inMemoryStore.users.push(user);
        return user;
      }),
      update: jest.fn(({ where, data }) => {
        const user = inMemoryStore.users.find(u => u.id === where.id);
        if (user) Object.assign(user, data);
        return user;
      }),
    };
    this.userEventRole = {
      findMany: jest.fn(({ where }) => {
        if (where && where.userId && where.eventId) {
          return inMemoryStore.userEventRoles.filter(uer => uer.userId === where.userId && uer.eventId === where.eventId);
        }
        if (where && where.userId) {
          return inMemoryStore.userEventRoles.filter(uer => uer.userId === where.userId);
        }
        if (where && where.eventId) {
          return inMemoryStore.userEventRoles.filter(uer => uer.eventId === where.eventId);
        }
        return inMemoryStore.userEventRoles;
      }),
      create: jest.fn(({ data }) => {
        const newUER = { ...data, role: inMemoryStore.roles.find(r => r.id === data.roleId), user: inMemoryStore.users.find(u => u.id === data.userId) };
        inMemoryStore.userEventRoles.push(newUER);
        return newUER;
      }),
      delete: jest.fn(({ where }) => {
        const idx = inMemoryStore.userEventRoles.findIndex(uer => uer.userId === where.userId && uer.eventId === where.eventId && uer.roleId === where.roleId);
        if (idx !== -1) {
          return inMemoryStore.userEventRoles.splice(idx, 1)[0];
        }
        return null;
      }),
      deleteMany: jest.fn(({ where }) => {
        const before = inMemoryStore.userEventRoles.length;
        inMemoryStore.userEventRoles = inMemoryStore.userEventRoles.filter(uer => {
          if (where.userId && uer.userId !== where.userId) return true;
          if (where.eventId && uer.eventId !== where.eventId) return true;
          if (where.roleId && uer.roleId !== where.roleId) return true;
          return false;
        });
        return { count: before - inMemoryStore.userEventRoles.length };
      }),
      upsert: jest.fn(async ({ where, update, create }) => {
        // Find by unique keys (simulate composite unique constraint)
        const idx = inMemoryStore.userEventRoles.findIndex(
          (uer) => uer.userId === where.userId && uer.eventId === where.eventId && uer.roleId === where.roleId
        );
        if (idx !== -1) {
          // Update existing
          inMemoryStore.userEventRoles[idx] = { ...inMemoryStore.userEventRoles[idx], ...update };
          return inMemoryStore.userEventRoles[idx];
        } else {
          // Create new
          const newRole = { ...create };
          inMemoryStore.userEventRoles.push(newRole);
          return newRole;
        }
      }),
    };
    this.report = {
      findUnique: jest.fn(({ where }) => inMemoryStore.reports.find(r => r.id === where.id) || null),
      update: jest.fn(({ where, data }) => {
        const report = inMemoryStore.reports.find(r => r.id === where.id);
        if (report) Object.assign(report, data);
        return { ...report, reporter: inMemoryStore.users[0] };
      }),
    };
    this.auditLog = {
      create: jest.fn(({ data }) => {
        const log = { id: String(inMemoryStore.auditLogs.length + 1), ...data };
        inMemoryStore.auditLogs.push(log);
        return log;
      }),
    };
  }
}

module.exports = { PrismaClient, inMemoryStore }; 