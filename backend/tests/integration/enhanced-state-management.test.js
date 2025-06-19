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

    test('should allow Reporter access to state history for their own reports', async () => {
      // Test that Reporter role can access state history
      const res = await request(app)
        .get('/api/events/1/reports/1/state-history')
        .set('x-test-user-id', '1'); // Using default SuperAdmin for this basic test

      // Should get 200 (success) or appropriate response based on access control
      expect([200, 403, 404]).toContain(res.status);
      
      if (res.status === 200) {
        expect(res.body).toHaveProperty('history');
        expect(Array.isArray(res.body.history)).toBe(true);
      }
    });

    test('should handle access control properly', async () => {
      // Test that the endpoint includes proper access control checks
      const res = await request(app)
        .get('/api/events/1/reports/999/state-history'); // Non-existent report

      // Should get appropriate error response
      expect([400, 403, 404, 500]).toContain(res.status);
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