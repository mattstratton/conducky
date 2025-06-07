const request = require('supertest');
const app = require('../../index');

jest.mock('../../utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue({}),
}));

describe('GET /audit-test', () => {
  it('should return 200 and a success message', async () => {
    const res = await request(app).get('/audit-test');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Audit event logged!');
  });
}); 