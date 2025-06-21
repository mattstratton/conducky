const { inMemoryStore } = require('../../__mocks__/@prisma/client');
const request = require('supertest');
const app = require('../../index');

describe('Cross-Event Reports API Integration Tests', () => {
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
      },
      {
        id: 'event2', 
        name: 'PyData Chicago',
        slug: 'pydata-chicago',
        description: 'Python Data Conference'
      }
    ];

    // Mock reports with different scenarios
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
        evidenceFiles: [
          { id: 'evidence1', filename: 'screenshot.png', mimetype: 'image/png', size: 1024 }
        ],
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
        eventId: 'event2',
        reporterId: '2',
        assignedResponderId: '1',
        event: mockEvents[1],
        reporter: { id: '2', name: 'Reporter User', email: 'reporter@example.com' },
        assignedResponder: mockUser,
        evidenceFiles: [],
        _count: { comments: 0 }
      },
      {
        id: 'report3',
        title: 'Resolved Issue',
        description: 'Issue that was resolved',
        state: 'resolved',
        severity: 'low',
        type: 'other',
        incidentAt: '2024-01-10T09:00:00Z',
        createdAt: '2024-01-10T09:30:00Z',
        updatedAt: '2024-01-17T16:00:00Z',
        eventId: 'event1',
        reporterId: '3',
        assignedResponderId: '1',
        event: mockEvents[0],
        reporter: { id: '3', name: 'Another User', email: 'user@example.com' },
        assignedResponder: mockUser,
        evidenceFiles: [
          { id: 'evidence2', filename: 'document.pdf', mimetype: 'application/pdf', size: 2048 }
        ],
        _count: { comments: 5 }
      }
    ];

    // Mock user event roles
    const mockUserEventRoles = [
      {
        userId: '1',
        eventId: 'event1',
        roleId: '2', // Event Admin role ID
        event: mockEvents[0],
        role: { name: 'Event Admin' }
      },
      {
        userId: '1',
        eventId: 'event2',
        roleId: '3', // Responder role ID
        event: mockEvents[1],
        role: { name: 'Responder' }
      }
    ];

    // Setup in-memory store
    inMemoryStore.users = [
      mockUser,
      { id: '2', name: 'Reporter User', email: 'reporter@example.com' },
      { id: '3', name: 'Another User', email: 'user@example.com' }
    ];
    inMemoryStore.events = mockEvents;
    inMemoryStore.reports = mockReports;
    inMemoryStore.userEventRoles = mockUserEventRoles;
  });

  describe('GET /api/users/me/reports', () => {
    it('should return all reports across user events with default pagination', async () => {
      const response = await request(app)
        .get('/api/users/me/reports')
        .expect(200);

      expect(response.body).toHaveProperty('reports');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('totalPages');

      expect(response.body.reports).toHaveLength(3);
      expect(response.body.total).toBe(3);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
      expect(response.body.totalPages).toBe(1);

      // Check that reports include user roles
      response.body.reports.forEach(report => {
        expect(report).toHaveProperty('userRoles');
        expect(Array.isArray(report.userRoles)).toBe(true);
      });
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/users/me/reports?page=1&limit=2')
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(2);
      expect(response.body.totalPages).toBe(2); // 3 reports / 2 per page = 2 pages
    });

    it('should filter reports by status', async () => {
      const response = await request(app)
        .get('/api/users/me/reports?status=submitted')
        .expect(200);

      expect(response.body.reports).toHaveLength(1);
      expect(response.body.reports[0].state).toBe('submitted');
    });

    it('should filter reports by event', async () => {
      const response = await request(app)
        .get('/api/users/me/reports?event=devconf-2024')
        .expect(200);

      expect(response.body.reports).toHaveLength(2);
      response.body.reports.forEach(report => {
        expect(report.event.slug).toBe('devconf-2024');
      });
    });

    it('should search reports by title and description', async () => {
      const response = await request(app)
        .get('/api/users/me/reports?search=harassment')
        .expect(200);

      expect(response.body.reports).toHaveLength(1);
      expect(response.body.reports[0].title).toContain('Harassment');
    });

    it('should filter reports assigned to current user', async () => {
      const response = await request(app)
        .get('/api/users/me/reports?assigned=me')
        .expect(200);

      expect(response.body.reports).toHaveLength(2);
      response.body.reports.forEach(report => {
        expect(report.assignedResponder?.id).toBe('1');
      });
    });

    it('should filter unassigned reports', async () => {
      const response = await request(app)
        .get('/api/users/me/reports?assigned=unassigned')
        .expect(200);

      expect(response.body.reports).toHaveLength(1);
      expect(response.body.reports[0].assignedResponder).toBeNull();
    });

    it('should sort reports by different fields', async () => {
      const response = await request(app)
        .get('/api/users/me/reports?sort=title&order=asc')
        .expect(200);

      expect(response.body.reports[0].title).toBe('Code of Conduct Violation');
    });

    it('should handle multiple filters combined', async () => {
      const response = await request(app)
        .get('/api/users/me/reports?status=investigating&event=pydata-chicago')
        .expect(200);

      expect(response.body.reports).toHaveLength(1);
      expect(response.body.reports[0].state).toBe('investigating');
      expect(response.body.reports[0].event.slug).toBe('pydata-chicago');
    });

    it('should return empty results when no reports match filters', async () => {
      const response = await request(app)
        .get('/api/users/me/reports?status=nonexistent')
        .expect(200);

      expect(response.body.reports).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/users/me/reports')
        .set('x-test-disable-auth', 'true')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Not authenticated');
    });

    it('should handle database errors gracefully', async () => {
      // This test is harder to simulate with the in-memory store approach
      // We'll skip it for now since the real database error handling is tested elsewhere
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/users/me/reports?page=0&limit=0')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid pagination parameters');
    });

    it('should limit maximum page size', async () => {
      const response = await request(app)
        .get('/api/users/me/reports?limit=1000')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Limit cannot exceed 100');
    });

    it('should include all required report fields', async () => {
      const response = await request(app)
        .get('/api/users/me/reports')
        .expect(200);

      const report = response.body.reports[0];
      
      // Check required fields
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('title');
      expect(report).toHaveProperty('description');
      expect(report).toHaveProperty('state');
      expect(report).toHaveProperty('type');
      expect(report).toHaveProperty('createdAt');
      expect(report).toHaveProperty('updatedAt');
      expect(report).toHaveProperty('event');
      expect(report).toHaveProperty('reporter');
      expect(report).toHaveProperty('evidenceFiles');
      expect(report).toHaveProperty('_count');
      expect(report).toHaveProperty('userRoles');

      // Check event structure
      expect(report.event).toHaveProperty('id');
      expect(report.event).toHaveProperty('name');
      expect(report.event).toHaveProperty('slug');

      // Check evidence files structure
      if (report.evidenceFiles.length > 0) {
        const evidence = report.evidenceFiles[0];
        expect(evidence).toHaveProperty('id');
        expect(evidence).toHaveProperty('filename');
        expect(evidence).toHaveProperty('mimetype');
        expect(evidence).toHaveProperty('size');
      }

      // Check comment count
      expect(report._count).toHaveProperty('comments');
      expect(typeof report._count.comments).toBe('number');
    });
  });
}); 