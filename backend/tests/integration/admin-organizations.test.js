const request = require('supertest');
const app = require('../../index');

describe('SuperAdmin Organizations Management', () => {
  describe('GET /api/organizations', () => {
    it('should return error status for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/organizations')
        .set('x-test-disable-auth', 'true'); // Disable authentication for this test
      
      // Should return 401 for unauthenticated requests
      expect(response.status).toBe(401);
    });

    it('should be protected by authentication/authorization', async () => {
      // Test with a non-SuperAdmin user
      const response = await request(app)
        .get('/api/organizations')
        .set('x-test-user-id', '999'); // Non-existent user (not SuperAdmin)
      
      // Should return 403 for non-SuperAdmin users
      expect(response.status).toBe(403);
    });

    it('should allow SuperAdmin access', async () => {
      // Test with SuperAdmin user (default user id '1' is SuperAdmin)
      const response = await request(app)
        .get('/api/organizations');
      
      // Should return 200 for SuperAdmin
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/organizations', () => {
    it('should return error status for unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/organizations')
        .set('x-test-disable-auth', 'true') // Disable authentication for this test
        .send({
          name: 'Test Organization',
          slug: 'test-org',
        });
      
      // Should return 401 for unauthenticated requests
      expect(response.status).toBe(401);
    });

    it('should return error status for non-SuperAdmin users', async () => {
      const response = await request(app)
        .post('/api/organizations')
        .set('x-test-user-id', '999') // Non-existent user (not SuperAdmin)
        .send({
          name: 'Test Organization',
          slug: 'test-org',
        });
      
      // Should return 403 for non-SuperAdmin users
      expect(response.status).toBe(403);
    });

    it('should allow SuperAdmin to create organizations', async () => {
      const response = await request(app)
        .post('/api/organizations')
        .send({
          name: 'Test Organization',
          slug: 'test-org-new',
          description: 'A test organization'
        });
      
      // Should return 201 for SuperAdmin with valid data
      expect(response.status).toBe(201);
      expect(response.body.organization).toBeDefined();
      expect(response.body.organization.name).toBe('Test Organization');
    });
  });
}); 