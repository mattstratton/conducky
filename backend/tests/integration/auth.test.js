const request = require('supertest');
const app = require('../../index');
const { inMemoryStore } = require('@prisma/client');

beforeEach(() => {
  // Reset the inMemoryStore for test isolation
  inMemoryStore.events.length = 1;
  inMemoryStore.roles.length = 3;
  inMemoryStore.users.length = 1;
  inMemoryStore.userEventRoles.length = 1;
  inMemoryStore.reports.length = 1;
  inMemoryStore.auditLogs.length = 0;
});

describe('Auth endpoints', () => {
  afterEach(() => jest.clearAllMocks());

  describe('POST /register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/register')
        .send({ email: 'test@example.com', password: 'password', name: 'Test User' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Registration successful!');
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
    });
    it('should fail if missing fields', async () => {
      const res = await request(app).post('/register').send({ email: '' });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
    it('should fail if email already registered', async () => {
      await request(app).post('/register').send({ email: 'dupe@example.com', password: 'pw', name: 'Dupe' });
      const res = await request(app).post('/register').send({ email: 'dupe@example.com', password: 'pw', name: 'Dupe' });
      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty('error', 'Email already registered.');
    });
  });

  describe('POST /login', () => {
    it('should fail for non-existent user', async () => {
      const res = await request(app).post('/login').send({ email: 'nouser@example.com', password: 'pw' });
      expect(res.statusCode).toBe(401);
    });
    // Note: Success and wrong password cases would require more advanced mocking of passport/bcrypt
  });

  describe('POST /logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app).post('/logout');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Logged out!');
    });
  });
}); 