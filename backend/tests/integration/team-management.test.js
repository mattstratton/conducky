const { inMemoryStore } = require("../../__mocks__/@prisma/client");
const request = require("supertest");
const app = require("../../index");

// Mock the RBAC middleware like in the events test
jest.mock("../../src/utils/rbac", () => ({
  requireRole: (allowedRoles) => (req, res, next) => {
    req.isAuthenticated = () => true;
    
    const { inMemoryStore } = require("../../__mocks__/@prisma/client");
    
    // Use test user ID from header if provided, otherwise default to user 1
    const testUserId = req.headers['x-test-user-id'] || "1";
    const testUser = inMemoryStore.users.find(u => u.id === testUserId) || { id: testUserId, email: `user${testUserId}@example.com`, name: `User${testUserId}` };
    req.user = testUser;
    
    // Get eventId from params
    let eventId = req.params.eventId || req.params.slug;
    
    // If slug is provided, resolve to eventId
    if (req.params.slug && !eventId.match(/^\d+$/)) {
      const event = inMemoryStore.events.find(e => e.slug === req.params.slug);
      if (event) {
        eventId = event.id;
      }
    }
    
    // Check for SuperAdmin role globally
    const isSuperAdmin = inMemoryStore.userEventRoles.some(
      (uer) => uer.userId === req.user.id && uer.role.name === "SuperAdmin"
    );
    
    if (allowedRoles.includes("SuperAdmin") && isSuperAdmin) {
      return next();
    }
    
    // Check for allowed roles for this specific event
    const userRoles = inMemoryStore.userEventRoles.filter(
      (uer) => uer.userId === req.user.id && uer.eventId === eventId
    );
    
    const hasRole = userRoles.some((uer) =>
      allowedRoles.includes(uer.role.name)
    );
    
    if (!hasRole) {
      res.status(403).json({ error: "Forbidden: insufficient role" });
      return;
    }
    
    next();
  },
  requireSuperAdmin: () => (req, res, next) => {
    req.isAuthenticated = () => true;
    
    const { inMemoryStore } = require("../../__mocks__/@prisma/client");
    
    // Use test user ID from header if provided, otherwise default to user 1
    const testUserId = req.headers['x-test-user-id'] || "1";
    const testUser = inMemoryStore.users.find(u => u.id === testUserId) || { id: testUserId, email: `user${testUserId}@example.com`, name: `User${testUserId}` };
    req.user = testUser;
    
    // Check for SuperAdmin role globally
    const isSuperAdmin = inMemoryStore.userEventRoles.some(
      (uer) => uer.userId === req.user.id && uer.role.name === "SuperAdmin"
    );
    
    if (!isSuperAdmin) {
      res.status(403).json({ error: "Forbidden: Super Admins only" });
      return;
    }
    
    next();
  },
}));

beforeEach(() => {
  // Reset inMemoryStore to a clean state for each test
  inMemoryStore.events = [{ id: "1", name: "Event1", slug: "event1" }];
  inMemoryStore.roles = [
    { id: "1", name: "SuperAdmin" },
    { id: "2", name: "Admin" },
    { id: "3", name: "Responder" },
    { id: "4", name: "Reporter" },
  ];
  inMemoryStore.users = [
    { id: "1", email: "admin@example.com", name: "Admin", createdAt: new Date('2024-01-01') },
    { id: "2", email: "responder@example.com", name: "Responder", createdAt: new Date('2024-01-02') },
    { id: "3", email: "reporter@example.com", name: "Reporter", createdAt: new Date('2024-01-03') },
  ];
  inMemoryStore.userEventRoles = [
    {
      userId: "1",
      eventId: "1",
      roleId: "2",
      role: { name: "Admin" },
      user: { id: "1", email: "admin@example.com", name: "Admin", createdAt: new Date('2024-01-01') },
    },
    {
      userId: "2",
      eventId: "1",
      roleId: "3",
      role: { name: "Responder" },
      user: { id: "2", email: "responder@example.com", name: "Responder", createdAt: new Date('2024-01-02') },
    },
    {
      userId: "3",
      eventId: "1",
      roleId: "4",
      role: { name: "Reporter" },
      user: { id: "3", email: "reporter@example.com", name: "Reporter", createdAt: new Date('2024-01-03') },
    },
  ];
  inMemoryStore.reports = [];
  inMemoryStore.auditLogs = [];
  inMemoryStore.reportComments = [];
});

describe('Team Management Endpoints', () => {
  afterEach(() => jest.clearAllMocks());

  describe('GET /api/events/slug/:slug/users/:userId', () => {
    it('should get individual user profile (admin access)', async () => {
      const res = await request(app)
        .get('/api/events/slug/event1/users/2')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe('2');
      expect(res.body.user.email).toBe('responder@example.com');
      expect(res.body.roles).toContain('Responder');
      expect(res.body.joinDate).toBeDefined();
    });

    it('should allow responder to view user profiles', async () => {
      const res = await request(app)
        .get('/api/events/slug/event1/users/1')
        .set('x-test-user-id', '2') // Responder user
        .expect(200);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe('1');
      expect(res.body.roles).toBeDefined();
    });

    it('should deny access to reporters', async () => {
      await request(app)
        .get('/api/events/slug/event1/users/1')
        .set('x-test-user-id', '3') // Reporter user
        .expect(403);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .get('/api/events/slug/event1/users/999')
        .set('x-test-user-id', '1') // Admin user
        .expect(404);
    });

    it('should return 403 for non-existent event (security: no permissions)', async () => {
      await request(app)
        .get('/api/events/slug/nonexistent/users/1')
        .set('x-test-user-id', '1') // Admin user
        .expect(403);
    });
  });

  describe('GET /api/events/slug/:slug/users/:userId/activity', () => {
    it('should get user activity timeline (admin access)', async () => {
      const res = await request(app)
        .get('/api/events/slug/event1/users/1/activity')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      expect(res.body.activities).toBeDefined();
      expect(Array.isArray(res.body.activities)).toBe(true);
      expect(res.body.total).toBeDefined();
      expect(typeof res.body.total).toBe('number');
    });

    it('should support pagination parameters', async () => {
      const res = await request(app)
        .get('/api/events/slug/event1/users/1/activity?page=1&limit=5')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      expect(res.body.activities).toBeDefined();
      expect(res.body.activities.length).toBeLessThanOrEqual(5);
    });

    it('should deny access to reporters', async () => {
      await request(app)
        .get('/api/events/slug/event1/users/1/activity')
        .set('x-test-user-id', '3') // Reporter user
        .expect(403);
    });
  });

  describe('GET /api/events/slug/:slug/users/:userId/reports', () => {
    it('should get user reports (admin access)', async () => {
      const res = await request(app)
        .get('/api/events/slug/event1/users/1/reports')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      expect(res.body.reports).toBeDefined();
      expect(Array.isArray(res.body.reports)).toBe(true);
      expect(res.body.total).toBeDefined();
    });

    it('should filter by report type', async () => {
      const submittedRes = await request(app)
        .get('/api/events/slug/event1/users/1/reports?type=submitted')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      const assignedRes = await request(app)
        .get('/api/events/slug/event1/users/1/reports?type=assigned')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      expect(submittedRes.body.reports).toBeDefined();
      expect(assignedRes.body.reports).toBeDefined();
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/events/slug/event1/users/1/reports?page=1&limit=10')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      expect(res.body.reports.length).toBeLessThanOrEqual(10);
    });

    it('should deny access to reporters', async () => {
      await request(app)
        .get('/api/events/slug/event1/users/1/reports')
        .set('x-test-user-id', '3') // Reporter user
        .expect(403);
    });
  });
}); 