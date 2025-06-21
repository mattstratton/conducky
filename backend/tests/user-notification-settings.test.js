const request = require('supertest');
const app = require('../index');

describe('User Notification Settings API', () => {
  const userId = '1'; // Use mock user ID for consistency with other tests

  it('should return default notification settings for a new user', async () => {
    const res = await request(app)
      .get('/api/user/notification-settings')
      .set('x-test-user-id', userId);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(userId);
    expect(res.body.reportSubmittedInApp).toBe(true);
    expect(res.body.reportSubmittedEmail).toBe(false);
  });

  it('should update notification settings', async () => {
    const res = await request(app)
      .put('/api/user/notification-settings')
      .set('x-test-user-id', userId)
      .send({ reportSubmittedEmail: true });
    expect(res.status).toBe(200);
    expect(res.body.reportSubmittedEmail).toBe(true);
  });
});
