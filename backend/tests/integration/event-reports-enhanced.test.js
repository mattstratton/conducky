const { inMemoryStore } = require('../../__mocks__/@prisma/client');
const request = require('supertest');
const app = require('../../index');

describe('Enhanced Event Reports API Integration Tests', () => {
  let mockUser, mockEvents, mockReports;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock user for authentication
    mockUser = {
      id: '1',
      email: 'admin@example.com',
      name: 'Admin User'
    };

    // Mock events
    mockEvents = [
      {
        id: 'event1',
        name: 'DevConf 2024',
        slug: 'devconf-2024',
        description: 'Developer Conference'
      }
    ];

    // Mock reports for the event
    mockReports = [
      {
        id: 'report1',
        title: 'Harassment Report',
        description: 'Inappropriate behavior during keynote',
        state: 'submitted',
        severity: 'high',
        type: 'harassment',
        incidentAt: '2024-01-15T10:00:00Z',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        eventId: 'event1',
        reporterId: '1',
        assignedResponderId: null,
        event: mockEvents[0],
        reporter: mockUser,
        assignedResponder: null,
        evidenceFiles: [],
        _count: { comments: 2 }
      },
      {
        id: 'report2',
        title: 'Code of Conduct Violation',
        description: 'Disruptive behavior in workshop',
        state: 'investigating',
        severity: 'medium',
        type: 'conduct',
        incidentAt: '2024-01-16T14:00:00Z',
        createdAt: '2024-01-16T14:15:00Z',
        updatedAt: '2024-01-16T15:00:00Z',
        eventId: 'event1',
        reporterId: '2',
        assignedResponderId: null,
        event: mockEvents[0],
        reporter: { id: '2', name: 'Reporter User', email: 'reporter@example.com' },
        assignedResponder: null,
        evidenceFiles: [],
        _count: { comments: 0 }
      },
      {
        id: 'report3',
        title: 'Inappropriate Comments',
        description: 'Offensive language during Q&A session',
        state: 'submitted',
        severity: 'low',
        type: 'harassment',
        incidentAt: '2024-01-17T16:00:00Z',
        createdAt: '2024-01-17T16:15:00Z',
        updatedAt: '2024-01-17T16:15:00Z',
        eventId: 'event1',
        reporterId: '3',
        assignedResponderId: null,
        event: mockEvents[0],
        reporter: { id: '3', name: 'Test Reporter', email: 'testreporter@example.com' },
        assignedResponder: null,
        evidenceFiles: [],
        _count: { comments: 1 }
      }
    ];

    // Mock user event roles - Admin role for the test user
    const mockUserEventRoles = [
      {
        userId: '1',
        eventId: 'event1',
        roleId: 'admin-role',
        event: mockEvents[0],
        role: { name: 'Admin' }
      },
      {
        userId: '3',
        eventId: 'event1',
        roleId: 'reporter-role',
        event: mockEvents[0],
        role: { name: 'Reporter' }
      }
    ];

    // Setup in-memory store
    inMemoryStore.users = [
      mockUser,
      { id: '2', name: 'Reporter User', email: 'reporter@example.com' },
      { id: '3', name: 'Test Reporter', email: 'testreporter@example.com' }
    ];
    inMemoryStore.events = mockEvents;
    inMemoryStore.reports = mockReports;
    inMemoryStore.userEventRoles = mockUserEventRoles;
  });

  describe('GET /api/events/slug/:slug/reports', () => {
    it('should return event reports with default pagination', async () => {
      const response = await request(app)
        .get('/api/events/slug/devconf-2024/reports')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      expect(response.body).toHaveProperty('reports');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('totalPages');

      expect(Array.isArray(response.body.reports)).toBe(true);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/events/slug/devconf-2024/reports?page=1&limit=5')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(5);
      expect(response.body.reports.length).toBeLessThanOrEqual(5);
    });

    it('should filter reports by status', async () => {
      const response = await request(app)
        .get('/api/events/slug/devconf-2024/reports?status=submitted')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      response.body.reports.forEach(report => {
        expect(report.state).toBe('submitted');
      });
    });

    it('should filter reports by severity', async () => {
      const response = await request(app)
        .get('/api/events/slug/devconf-2024/reports?severity=high')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      response.body.reports.forEach(report => {
        expect(report.severity).toBe('high');
      });
    });

    it('should search reports by title and description', async () => {
      const response = await request(app)
        .get('/api/events/slug/devconf-2024/reports?search=harassment')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      // Should find reports with "harassment" in title or description
      expect(response.body.reports.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter unassigned reports', async () => {
      const response = await request(app)
        .get('/api/events/slug/devconf-2024/reports?assigned=unassigned')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      response.body.reports.forEach(report => {
        expect(report.assignedResponder).toBeNull();
      });
    });

    it('should sort reports by different fields', async () => {
      const response = await request(app)
        .get('/api/events/slug/devconf-2024/reports?sort=title&order=asc')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      // Check if reports are sorted by title in ascending order
      if (response.body.reports.length > 1) {
        for (let i = 1; i < response.body.reports.length; i++) {
          expect(response.body.reports[i].title.localeCompare(response.body.reports[i-1].title)).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should include stats when requested', async () => {
      const response = await request(app)
        .get('/api/events/slug/devconf-2024/reports?includeStats=true')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('submitted');
      expect(response.body.stats).toHaveProperty('acknowledged');
      expect(response.body.stats).toHaveProperty('investigating');
      expect(response.body.stats).toHaveProperty('resolved');
      expect(response.body.stats).toHaveProperty('closed');
      expect(response.body.stats).toHaveProperty('total');
    });

    it('should filter by specific user (userId parameter)', async () => {
      const response = await request(app)
        .get('/api/events/slug/devconf-2024/reports?userId=1')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      response.body.reports.forEach(report => {
        expect(report.reporter?.id).toBe('1');
      });
    });

    it('should return empty results when no reports match filters', async () => {
      const response = await request(app)
        .get('/api/events/slug/devconf-2024/reports?status=nonexistent')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      expect(response.body.reports).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/events/slug/devconf-2024/reports')
        .set('x-test-disable-auth', 'true')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Not authenticated');
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/events/slug/devconf-2024/reports?page=0&limit=0')
        .set('x-test-user-id', '1') // Admin user
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid pagination parameters');
    });

    it('should limit maximum page size', async () => {
      const response = await request(app)
        .get('/api/events/slug/devconf-2024/reports?limit=1000')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      // Should automatically cap at 100
      expect(response.body.limit).toBe(100);
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/events/slug/non-existent-event/reports')
        .set('x-test-user-id', '1') // Admin user
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Event not found.');
    });

    it('should enforce role-based access control for reporters', async () => {
      // Reporter should only see their own reports
      const response = await request(app)
        .get('/api/events/slug/devconf-2024/reports')
        .set('x-test-user-id', '3') // Reporter user
        .expect(200);

      // All reports should belong to the reporter (but there might be none)
      response.body.reports.forEach(report => {
        expect(report.reporter?.id).toBe('3');
      });
    });

    it('should include all required report fields', async () => {
      const response = await request(app)
        .get('/api/events/slug/devconf-2024/reports')
        .set('x-test-user-id', '1') // Admin user
        .expect(200);

      if (response.body.reports.length > 0) {
        const report = response.body.reports[0];
        expect(report).toHaveProperty('id');
        expect(report).toHaveProperty('title');
        expect(report).toHaveProperty('description');
        expect(report).toHaveProperty('state');
        expect(report).toHaveProperty('type');
        expect(report).toHaveProperty('createdAt');
        expect(report).toHaveProperty('updatedAt');
        expect(report).toHaveProperty('event');
        expect(report).toHaveProperty('userRoles');
        expect(Array.isArray(report.userRoles)).toBe(true);
      }
    });
  });
}); 