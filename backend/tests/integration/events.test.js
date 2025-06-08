const request = require('supertest');
const app = require('../../index');
const { inMemoryStore } = require('@prisma/client');

// Patch RBAC middleware for tests
jest.mock('../../utils/rbac', () => ({
  requireSuperAdmin: () => (req, res, next) => {
    req.isAuthenticated = () => true;
    req.user = { id: '1', email: 'admin@example.com', name: 'Admin' };
    next();
  },
  requireRole: () => (req, res, next) => {
    req.isAuthenticated = () => true;
    req.user = { id: '1', email: 'admin@example.com', name: 'Admin' };
    next();
  },
}));

beforeEach(() => {
  // Reset the inMemoryStore for test isolation
  inMemoryStore.events.length = 1;
  inMemoryStore.roles.length = 3;
  inMemoryStore.users.length = 1;
  inMemoryStore.userEventRoles.length = 1;
  inMemoryStore.reports.length = 1;
  inMemoryStore.auditLogs.length = 0;
});

describe('Event endpoints', () => {
  afterEach(() => jest.clearAllMocks());

  describe('POST /events', () => {
    it('should create an event as SuperAdmin', async () => {
      const res = await request(app)
        .post('/events')
        .send({ name: 'Test Event', slug: 'test-event' });
      expect([200, 201]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('event');
      expect(res.body.event).toHaveProperty('slug', 'test-event');
    });
    it('should fail if missing fields', async () => {
      const res = await request(app).post('/events').send({ name: '' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
    it('should fail if slug is invalid', async () => {
      const res = await request(app).post('/events').send({ name: 'Event', slug: 'Invalid Slug!' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
    it('should fail if slug already exists', async () => {
      await request(app).post('/events').send({ name: 'Event1', slug: 'dupe' });
      const res = await request(app).post('/events').send({ name: 'Event2', slug: 'dupe' });
      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty('error', 'Slug already exists.');
    });
  });

  describe('POST /events/:eventId/roles', () => {
    it('should assign a role to a user', async () => {
      const eventRes = await request(app).post('/events').send({ name: 'Role Event', slug: 'role-event' });
      const eventId = eventRes.body.event.id;
      const res = await request(app)
        .post(`/events/${eventId}/roles`)
        .send({ userId: '1', roleName: 'Admin' });
      expect([200, 201]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('message', 'Role assigned.');
    });
    it('should fail if missing fields', async () => {
      const eventRes = await request(app).post('/events').send({ name: 'Role Event2', slug: 'role-event2' });
      const eventId = eventRes.body.event.id;
      const res = await request(app).post(`/events/${eventId}/roles`).send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
    it('should fail if user does not exist', async () => {
      const eventRes = await request(app).post('/events').send({ name: 'Role Event3', slug: 'role-event3' });
      const eventId = eventRes.body.event.id;
      const res = await request(app)
        .post(`/events/${eventId}/roles`)
        .send({ userId: '999', roleName: 'Admin' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'User does not exist.');
    });
    it('should fail if role does not exist', async () => {
      const eventRes = await request(app).post('/events').send({ name: 'Role Event4', slug: 'role-event4' });
      const eventId = eventRes.body.event.id;
      const res = await request(app)
        .post(`/events/${eventId}/roles`)
        .send({ userId: '1', roleName: 'NotARole' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Role does not exist.');
    });
  });

  describe('GET /events/:eventId', () => {
    it('should return event details (success)', async () => {
      const res = await request(app).get('/events/1');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('event');
      expect(res.body.event).toHaveProperty('id', '1');
    });
    it('should return 404 if event not found', async () => {
      const res = await request(app).get('/events/999');
      expect(res.statusCode).toBe(404);
    });
    // Forbidden case is handled by RBAC middleware mock (always allows)
  });

  describe('DELETE /events/:eventId/roles', () => {
    it('should remove a role from a user (success)', async () => {
      const res = await request(app)
        .delete('/events/1/roles')
        .send({ userId: '1', roleName: 'SuperAdmin' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Role removed.');
    });
    it('should fail if missing fields', async () => {
      const res = await request(app).delete('/events/1/roles').send({});
      expect(res.statusCode).toBe(400);
    });
    it('should fail if user or role not found', async () => {
      const res = await request(app)
        .delete('/events/1/roles')
        .send({ userId: '999', roleName: 'NotARole' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /events/:eventId/users', () => {
    it('should list users and their roles for an event (success)', async () => {
      const res = await request(app).get('/events/1/users');
      expect([200, 201]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('users');
      expect(Array.isArray(res.body.users)).toBe(true);
    });
    // Not authenticated and forbidden cases are handled by RBAC mock
  });

  describe('PATCH /events/:eventId/reports/:reportId/state', () => {
    it('should update report state (success)', async () => {
      const res = await request(app)
        .patch('/events/1/reports/r1/state')
        .send({ state: 'acknowledged' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('report');
      expect(res.body.report).toHaveProperty('state', 'acknowledged');
    });
    it('should fail if invalid state', async () => {
      const res = await request(app)
        .patch('/events/1/reports/r1/state')
        .send({ state: 'not-a-state' });
      expect(res.statusCode).toBe(400);
    });
    it('should fail if report not found', async () => {
      const res = await request(app)
        .patch('/events/1/reports/doesnotexist/state')
        .send({ state: 'acknowledged' });
      expect(res.statusCode).toBe(404);
    });
  });
}); 