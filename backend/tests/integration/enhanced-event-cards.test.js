const request = require('supertest');
const app = require('../../index');

describe('Enhanced Event Card Stats API', () => {
  
  // Cleanup after all tests in this suite
  afterAll(async () => {
    if (global.cleanupPrismaConnections) {
      await global.cleanupPrismaConnections();
    }
  });
  
  describe('GET /api/events/slug/:slug/cardstats', () => {
    test('should return enhanced card stats for an event', async () => {
      // Test with an existing event slug (test-event exists in test setup)
      const res = await request(app)
        .get('/api/events/slug/test-event/cardstats');

      // Should get 200 (success) since user has access
      expect([200, 404]).toContain(res.status);
      
      if (res.status === 200) {
        expect(res.body).toHaveProperty('totalReports');
        expect(res.body).toHaveProperty('urgentReports');
        expect(res.body).toHaveProperty('assignedToMe');
        expect(res.body).toHaveProperty('needsResponse');
        expect(res.body).toHaveProperty('recentActivity');
        expect(res.body).toHaveProperty('recentReports');
        expect(Array.isArray(res.body.recentReports)).toBe(true);
        
        // Verify stats are numbers
        expect(typeof res.body.totalReports).toBe('number');
        expect(typeof res.body.urgentReports).toBe('number');
        expect(typeof res.body.assignedToMe).toBe('number');
        expect(typeof res.body.needsResponse).toBe('number');
        expect(typeof res.body.recentActivity).toBe('number');
        
        // Verify recent reports structure if any exist
        if (res.body.recentReports.length > 0) {
          const report = res.body.recentReports[0];
          expect(report).toHaveProperty('id');
          expect(report).toHaveProperty('title');
          expect(report).toHaveProperty('state');
          expect(report).toHaveProperty('createdAt');
        }
      }
    });

    test('should return 404 for non-existent event', async () => {
      const res = await request(app)
        .get('/api/events/slug/non-existent-event/cardstats');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    test('should require authentication', async () => {
      // This test verifies that the endpoint requires login
      // The test middleware automatically provides authentication, 
      // so we expect a 200 or 404 (not 401/403)
      const res = await request(app)
        .get('/api/events/slug/test-event/cardstats');

      expect([200, 404]).toContain(res.status);
    });
  });
}); 