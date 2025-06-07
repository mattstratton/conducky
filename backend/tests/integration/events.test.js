const request = require('supertest');
const app = require('../../index');

jest.mock('@prisma/client', () => {
  let events = [];
  let roles = [{ id: '1', name: 'SuperAdmin' }, { id: '2', name: 'Admin' }];
  let users = [{ id: '1', email: 'admin@example.com', name: 'Admin' }];
  let userEventRoles = [];
  return {
    PrismaClient: jest.fn(() => ({
      event: {
        findUnique: jest.fn(({ where }) => events.find(e => e.slug === where.slug || e.id === where.id) || null),
        create: jest.fn(({ data }) => {
          const event = { ...data, id: String(events.length + 1) };
          events.push(event);
          return event;
        }),
      },
      role: {
        findUnique: jest.fn(({ where }) => roles.find(r => r.name === where.name) || null),
        create: jest.fn(({ data }) => {
          const role = { ...data, id: String(roles.length + 1) };
          roles.push(role);
          return role;
        }),
      },
      user: {
        findUnique: jest.fn(({ where }) => users.find(u => u.id === where.id || u.email === where.email) || null),
      },
      userEventRole: {
        upsert: jest.fn(({ where, create }) => {
          const found = userEventRoles.find(uer => uer.userId === where.userId_eventId_roleId.userId && uer.eventId === where.userId_eventId_roleId.eventId && uer.roleId === where.userId_eventId_roleId.roleId);
          if (found) return found;
          const newRole = { ...create };
          userEventRoles.push(newRole);
          return newRole;
        }),
        findMany: jest.fn(({ where }) => userEventRoles.filter(uer => uer.userId === where.userId)),
      },
    })),
  };
});

// Helper to mock SuperAdmin authentication
function superAdminSession(req) {
  req.isAuthenticated = () => true;
  req.user = { id: '1', email: 'admin@example.com', name: 'Admin' };
}

describe('Event endpoints', () => {
  afterEach(() => jest.clearAllMocks());

  describe('POST /events', () => {
    it('should create an event as SuperAdmin', async () => {
      // Mock SuperAdmin
      superAdminSession(request(app));
      const res = await request(app)
        .post('/events')
        .send({ name: 'Test Event', slug: 'test-event' });
      expect([200, 201]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('event');
      expect(res.body.event).toHaveProperty('slug', 'test-event');
    });
    it('should fail if missing fields', async () => {
      superAdminSession(request(app));
      const res = await request(app).post('/events').send({ name: '' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
    it('should fail if slug is invalid', async () => {
      superAdminSession(request(app));
      const res = await request(app).post('/events').send({ name: 'Event', slug: 'Invalid Slug!' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
    it('should fail if slug already exists', async () => {
      superAdminSession(request(app));
      await request(app).post('/events').send({ name: 'Event1', slug: 'dupe' });
      const res = await request(app).post('/events').send({ name: 'Event2', slug: 'dupe' });
      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty('error', 'Slug already exists.');
    });
    // Not SuperAdmin case would require more advanced session mocking
  });

  describe('POST /events/:eventId/roles', () => {
    it('should assign a role to a user', async () => {
      superAdminSession(request(app));
      // Assume event and user exist
      const eventRes = await request(app).post('/events').send({ name: 'Role Event', slug: 'role-event' });
      const eventId = eventRes.body.event.id;
      const res = await request(app)
        .post(`/events/${eventId}/roles`)
        .send({ userId: '1', roleName: 'Admin' });
      expect([200, 201]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('message', 'Role assigned.');
    });
    it('should fail if missing fields', async () => {
      superAdminSession(request(app));
      const eventRes = await request(app).post('/events').send({ name: 'Role Event2', slug: 'role-event2' });
      const eventId = eventRes.body.event.id;
      const res = await request(app).post(`/events/${eventId}/roles`).send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
    it('should fail if user does not exist', async () => {
      superAdminSession(request(app));
      const eventRes = await request(app).post('/events').send({ name: 'Role Event3', slug: 'role-event3' });
      const eventId = eventRes.body.event.id;
      const res = await request(app)
        .post(`/events/${eventId}/roles`)
        .send({ userId: '999', roleName: 'Admin' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'User does not exist.');
    });
    it('should fail if role does not exist', async () => {
      superAdminSession(request(app));
      const eventRes = await request(app).post('/events').send({ name: 'Role Event4', slug: 'role-event4' });
      const eventId = eventRes.body.event.id;
      const res = await request(app)
        .post(`/events/${eventId}/roles`)
        .send({ userId: '1', roleName: 'NotARole' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Role does not exist.');
    });
    // Not Admin/SuperAdmin case would require more advanced session mocking
  });
}); 