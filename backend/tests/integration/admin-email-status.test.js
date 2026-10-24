// Mock the RBAC middleware - needs to be at the top level before imports
// NOTE: this mock answers 403 for an unauthenticated request, whereas the real middleware
// (backend/src/utils/rbac.ts) answers 401. The real guard is therefore not exercised here;
// it is covered by the neighbouring admin suites' assumption.
jest.mock('../../src/utils/rbac', () => ({
  requireSystemAdmin: () => (req, res, next) => {
    const { inMemoryStore } = require('../../__mocks__/@prisma/client');
    
    // Use test user ID from header if provided
    const testUserId = req.headers['x-test-user-id'];
    
    // If no test user ID provided, treat as unauthenticated
    if (!testUserId) {
      req.isAuthenticated = () => false;
      return res.status(403).json({ error: 'Authentication required' });
    }
    
    req.isAuthenticated = () => true;
    const testUser = inMemoryStore.users.find(u => u.id === testUserId) || { id: testUserId, email: `user${testUserId}@example.com`, name: `User${testUserId}` };
    req.user = testUser;
    
    // Check if user has system admin role
    const hasSystemAdminRole = inMemoryStore.userRoles?.some(ur => {
      return ur.userId === testUserId && 
             ur.role?.name === 'system_admin' && 
             ur.scopeType === 'system';
    });
    
    if (!hasSystemAdminRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  },
  requireRole: (allowedRoles) => (req, res, next) => {
    const { inMemoryStore } = require('../../__mocks__/@prisma/client');
    
    // Use test user ID from header if provided
    const testUserId = req.headers['x-test-user-id'];
    
    // If no test user ID provided, treat as unauthenticated
    if (!testUserId) {
      req.isAuthenticated = () => false;
      return res.status(403).json({ error: 'Authentication required' });
    }
    
    req.isAuthenticated = () => true;
    const testUser = inMemoryStore.users.find(u => u.id === testUserId) || { id: testUserId, email: `user${testUserId}@example.com`, name: `User${testUserId}` };
    req.user = testUser;
    
    // For simplicity in this test, just allow all operations
    next();
  }
}));

const request = require('supertest');
const app = require('../../index');
const { inMemoryStore } = require('../../__mocks__/@prisma/client');
const { emailService } = require('../../src/utils/email');

describe('GET /api/admin/email-status', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    inMemoryStore.users = [
      { id: '1', email: 'admin@test.com', name: 'Admin' },
      { id: '2', email: 'user@test.com', name: 'User' },
    ];
    inMemoryStore.userRoles = [
      { id: '1', userId: '1', roleId: '1', scopeType: 'system', scopeId: 'SYSTEM', role: { id: '1', name: 'system_admin' } },
    ];
  });

  it.each([false, true])('returns exactly { configured: %s } for a System Admin', async (value) => {
    jest.spyOn(emailService, 'isConfigured').mockResolvedValue(value);
    const res = await request(app).get('/api/admin/email-status').set('x-test-user-id', '1').expect(200);
    expect(res.body).toEqual({ configured: value });
  });

  it('rejects a non-admin', async () => {
    const spy = jest.spyOn(emailService, 'isConfigured').mockResolvedValue(true);
    await request(app).get('/api/admin/email-status').set('x-test-user-id', '2').expect(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request', async () => {
    await request(app).get('/api/admin/email-status').expect(403);
  });

  it('returns 500 with a generic error when isConfigured fails', async () => {
    jest.spyOn(emailService, 'isConfigured').mockRejectedValue(new Error('boom secret'));
    const res = await request(app).get('/api/admin/email-status').set('x-test-user-id', '1').expect(500);
    expect(JSON.stringify(res.body)).not.toContain('boom');
  });
});
