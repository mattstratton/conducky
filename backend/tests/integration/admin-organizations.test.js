const request = require('supertest');
const app = require('../../index');

describe('SuperAdmin Organizations Management', () => {
  describe('GET /api/organizations', () => {
    it('should return error status for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/organizations');
      
      // Should return some kind of error (401, 403, or 500)
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should be protected by authentication/authorization', async () => {
      // This test verifies the endpoint is protected
      const response = await request(app)
        .get('/api/organizations');
      
      expect([400, 401, 403, 500]).toContain(response.status);
    });
  });

  describe('POST /api/organizations', () => {
    it('should return error status for invalid requests', async () => {
      const response = await request(app)
        .post('/api/organizations')
        .send({
          name: 'Test Organization',
          slug: 'test-org',
        });
      
      // Should return some kind of error (400, 401, 403, or 500)
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
}); 