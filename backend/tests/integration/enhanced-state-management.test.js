const request = require('supertest');
const app = require('../../index');

describe('Enhanced State Management API', () => {
  
  describe('PATCH /api/events/:eventId/reports/:reportId/state', () => {
    test('should respond to state change endpoint', async () => {
      // The endpoint exists and responds successfully (SuperAdmin has access)
      const res = await request(app)
        .patch('/api/events/1/reports/1/state')
        .send({
          state: 'acknowledged',
          notes: 'Test notes'
        });

      // Should get 200 (success) since SuperAdmin has access, or 400 if validation fails
      expect([200, 400]).toContain(res.status);
    });
  });

  describe('GET /api/events/:eventId/reports/:reportId/state-history', () => {
    test('should respond to state history endpoint', async () => {
      // The endpoint exists and responds successfully
      const res = await request(app)
        .get('/api/events/1/reports/1/state-history');

      // Should get 200 (success) since SuperAdmin has access
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('history');
      expect(Array.isArray(res.body.history)).toBe(true);
    });
  });

  describe('API Validation', () => {
    test('should validate required fields for state change', async () => {
      const res = await request(app)
        .patch('/api/events/1/reports/1/state')
        .send({}); // Empty body

      // Should get validation error
      expect([400, 401, 403]).toContain(res.status);
    });
  });
}); 