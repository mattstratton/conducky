const { inMemoryStore } = require('../../__mocks__/@prisma/client');
const request = require('supertest');
const app = require('../../index');

describe('Notification Endpoints', () => {
  const userId = '1';

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup test user in memory store
    inMemoryStore.users = [
      { id: '1', email: 'test@example.com', name: 'Test User' }
    ];
    
    // Clear notifications before each test
    inMemoryStore.notifications = [];
  });

  describe('GET /api/users/me/notifications', () => {
    beforeEach(() => {
      // Add test notifications
      inMemoryStore.notifications = [
        {
          id: 'n1',
          userId: userId,
          type: 'report_submitted',
          priority: 'high',
          title: 'New Report Submitted',
          message: 'A new report was submitted',
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
          updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          eventId: '1',
          reportId: 'r1'
        },
        {
          id: 'n2',
          userId: userId,
          type: 'report_assigned',
          priority: 'normal',
          title: 'Report Assigned',
          message: 'You have been assigned to a report',
          isRead: true,
          readAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
          createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
          updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          eventId: '1',
          reportId: 'r2'
        },
        {
          id: 'n3',
          userId: 'other-user',
          type: 'report_comment_added',
          priority: 'low',
          title: 'New Comment',
          message: 'A comment was added to your report',
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
          updatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          eventId: '1',
          reportId: 'r3'
        }
      ];
    });

    it('should return user notifications with pagination', async () => {
      const response = await request(app)
        .get('/api/users/me/notifications')
        .expect(200);

      expect(response.body).toHaveProperty('notifications');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('unreadCount');
      
      // Should only return notifications for the current user
      expect(response.body.notifications).toHaveLength(2);
      expect(response.body.notifications.every(n => n.userId === userId)).toBe(true);
      
      // Should be ordered by createdAt desc (newest first)
      expect(response.body.notifications[0].id).toBe('n1');
      expect(response.body.notifications[1].id).toBe('n2');
      
      // Should include unread count
      expect(response.body.unreadCount).toBe(1);
      
      // Should include pagination info
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1
      });
    });

    it('should filter by unread notifications', async () => {
      const response = await request(app)
        .get('/api/users/me/notifications?unreadOnly=true')
        .expect(200);

      expect(response.body.notifications).toHaveLength(1);
      expect(response.body.notifications[0].id).toBe('n1');
      expect(response.body.notifications[0].isRead).toBe(false);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/users/me/notifications')
        .set('x-test-disable-auth', 'true')
        .expect(401);
    });
  });

  describe('PATCH /api/notifications/:notificationId/read', () => {
    beforeEach(() => {
      inMemoryStore.notifications = [
        {
          id: 'n1',
          userId: userId,
          type: 'report_submitted',
          priority: 'high',
          title: 'New Report',
          message: 'A new report was submitted',
          isRead: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    });

    it('should mark notification as read', async () => {
      const response = await request(app)
        .patch('/api/notifications/n1/read')
        .expect(200);

      expect(response.body.message).toBe('Notification marked as read');
      
      // Check that notification was updated
      const notification = inMemoryStore.notifications.find(n => n.id === 'n1');
      expect(notification.isRead).toBe(true);
      expect(notification.readAt).toBeDefined();
    });

    it('should return 404 for non-existent notification', async () => {
      await request(app)
        .patch('/api/notifications/non-existent/read')
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .patch('/api/notifications/n1/read')
        .set('x-test-disable-auth', 'true')
        .expect(401);
    });
  });

  describe('GET /api/users/me/notifications/stats', () => {
    beforeEach(() => {
      inMemoryStore.notifications = [
        {
          id: 'n1',
          userId: userId,
          type: 'report_submitted',
          priority: 'high',
          title: 'High Priority Report',
          message: 'A high priority report was submitted',
          isRead: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'n2',
          userId: userId,
          type: 'report_assigned',
          priority: 'normal',
          title: 'Report Assigned',
          message: 'You have been assigned to a report',
          isRead: true,
          readAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    });

    it('should return notification statistics for user', async () => {
      const response = await request(app)
        .get('/api/users/me/notifications/stats')
        .expect(200);

      expect(response.body).toEqual({
        total: 2,
        unread: 1,
        byType: {
          report_submitted: 1,
          report_assigned: 1
        },
        byPriority: {
          high: 1,
          normal: 1
        }
      });
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/users/me/notifications/stats')
        .set('x-test-disable-auth', 'true')
        .expect(401);
    });
  });
});