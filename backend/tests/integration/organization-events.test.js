const request = require('supertest');
const app = require('../../index');

describe('Organization Events API', () => {
  describe('Organization event endpoints', () => {
    it('should have organization event creation route', async () => {
      // Test that the route exists (will return 401 due to auth, not 404)
      const res = await request(app)
        .post('/api/organizations/test-org-id/events')
        .send({
          name: 'Test Event',
          slug: 'test-event'
        });

      // Should not be 404 (route exists)
      expect(res.status).not.toBe(404);
      // Should be 401 or 403 (authentication/authorization required)
      expect([401, 403]).toContain(res.status);
    });

    it('should have organization events list route', async () => {
      // Test that the route exists (will return 401 due to auth, not 404)
      const res = await request(app)
        .get('/api/organizations/test-org-id/events');

      // Should not be 404 (route exists)
      expect(res.status).not.toBe(404);
      // Should be 401 or 403 (authentication/authorization required)
      expect([401, 403]).toContain(res.status);
    });
  });
}); 