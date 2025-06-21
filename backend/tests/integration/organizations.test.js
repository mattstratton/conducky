const request = require('supertest');
const app = require('../../index');

describe('Organizations API', () => {
  describe('Organizations endpoints', () => {
    it('should have organization routes mounted', async () => {
      // Just test that the routes exist and don't return 404
      // This is a basic smoke test since the full organization feature
      // needs more integration work
      const res = await request(app)
        .get('/api/organizations')
        .set('x-test-user-id', '1');

      // Should not be 404 (route exists)
      expect(res.status).not.toBe(404);
    });

    it('should have user organizations endpoint', async () => {
      const res = await request(app)
        .get('/api/organizations/me')
        .set('x-test-user-id', '1');

      // Should not be 404 (route exists)
      expect(res.status).not.toBe(404);
    });
  });
}); 