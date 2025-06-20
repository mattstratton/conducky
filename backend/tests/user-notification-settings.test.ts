import request from 'supertest';
import app from '../index';
import { prisma } from '../src/config/database';

describe('User Notification Settings API', () => {
  let userId: string;

  beforeAll(async () => {
    // Create a test user
    const user = await prisma.user.create({
      data: { email: 'testuser@example.com', name: 'Test User', passwordHash: 'x' },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.userNotificationSettings.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('should return default notification settings for a new user', async () => {
    const res = await request(app)
      .get('/api/user/notification-settings')
      .set('x-user-id', userId);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(userId);
    expect(res.body.reportSubmittedInApp).toBe(true);
    expect(res.body.reportSubmittedEmail).toBe(false);
  });

  it('should update notification settings', async () => {
    const res = await request(app)
      .put('/api/user/notification-settings')
      .set('x-user-id', userId)
      .send({ reportSubmittedEmail: true });
    expect(res.status).toBe(200);
    expect(res.body.reportSubmittedEmail).toBe(true);
  });
});
