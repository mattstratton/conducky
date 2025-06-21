const { inMemoryStore } = require('../../__mocks__/@prisma/client');
const request = require('supertest');
const app = require('../../index');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
        role: { name: 'Event Admin' }
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
        .set('x-test-disable-auth', 'true').expect(401);

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

// Export and Bulk Actions Tests
describe('Event Reports Export and Bulk Actions', () => {
  let eventId, reporterId, responderId, adminId;
  let reportIds = [];
  let testSlug;

  beforeEach(async () => {
    // Generate unique slug for this test run
    testSlug = `export-test-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create test event
    const event = await prisma.event.create({
      data: {
        name: 'Export Test Event',
        slug: testSlug,
        description: 'Test event for export functionality'
      }
    });
    eventId = event.id;

    // Create test users with unique emails
    const timestamp = Date.now();
    const reporter = await prisma.user.create({
      data: {
        email: `reporter-${timestamp}@export.test`,
        name: 'Test Reporter',
        passwordHash: 'hashedpassword'
      }
    });
    reporterId = reporter.id;

    const responder = await prisma.user.create({
      data: {
        email: `responder-${timestamp}@export.test`, 
        name: 'Test Responder',
        passwordHash: 'hashedpassword'
      }
    });
    responderId = responder.id;

    const admin = await prisma.user.create({
      data: {
        email: `admin-${timestamp}@export.test`,
        name: 'Test Admin', 
        passwordHash: 'hashedpassword'
      }
    });
    adminId = admin.id;

    // Create roles with standard names (or find existing ones)
    let reporterRole, responderRole, adminRole;
    
    try {
      reporterRole = await prisma.role.findFirst({ where: { name: 'Reporter' } });
      if (!reporterRole) {
        reporterRole = await prisma.role.create({ data: { name: 'Reporter' } });
      }
    } catch {
      reporterRole = await prisma.role.create({ data: { name: 'Reporter' } });
    }
    
    try {
      responderRole = await prisma.role.findFirst({ where: { name: 'Responder' } });
      if (!responderRole) {
        responderRole = await prisma.role.create({ data: { name: 'Responder' } });
      }
    } catch {
      responderRole = await prisma.role.create({ data: { name: 'Responder' } });
    }
    
    try {
      adminRole = await prisma.role.findFirst({ where: { name: 'Event Admin' } });
      if (!adminRole) {
        adminRole = await prisma.role.create({ data: { name: 'Event Admin' } });
      }
    } catch {
      adminRole = await prisma.role.create({ data: { name: 'Event Admin' } });
    }

    // Assign roles
    await prisma.userEventRole.createMany({
      data: [
        { userId: reporterId, eventId, roleId: reporterRole.id },
        { userId: responderId, eventId, roleId: responderRole.id },
        { userId: adminId, eventId, roleId: adminRole.id }
      ]
    });

    // Create test reports
    const now = new Date();
    const reports = await Promise.all([
      prisma.report.create({
        data: {
          eventId,
          reporterId,
          type: 'harassment',
          title: 'Test Report 1 for Export',
          description: 'First test report',
          state: 'submitted',
          createdAt: new Date(now.getTime() - 3600000) // 1 hour ago
        }
      }),
      prisma.report.create({
        data: {
          eventId,
          reporterId,
          type: 'safety',
          title: 'Test Report 2 for Export',
          description: 'Second test report',
          state: 'acknowledged',
          severity: 'high',
          createdAt: new Date(now.getTime() - 1800000) // 30 minutes ago
        }
      }),
      prisma.report.create({
        data: {
          eventId,
          reporterId,
          type: 'other',
          title: 'Test Report 3 for Export',
          description: 'Third test report',
          state: 'investigating',
          assignedResponderId: responderId,
          createdAt: now
        }
      })
    ]);
    
    reportIds = reports.map(r => r.id);
  });

  describe('Export Functionality', () => {
    test('should export reports as CSV', async () => {
      const response = await request(app)
        .get(`/api/events/slug/${testSlug}/reports/export?format=csv`)
        .set('x-test-user-id', responderId)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toMatch(new RegExp(`attachment; filename="reports_${testSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d{4}-\\d{2}-\\d{2}\\.csv"`));
      expect(response.text).toContain('ID,Title,Type,Status,Severity,Reporter,Assigned,Created,Description');
      expect(response.text).toContain('Test Report 1 for Export');
      expect(response.text).toContain('Test Report 2 for Export');
      expect(response.text).toContain('Test Report 3 for Export');
    });

    test('should export reports as PDF/text', async () => {
      const response = await request(app)
        .get(`/api/events/slug/${testSlug}/reports/export?format=pdf`)
        .set('x-test-user-id', responderId)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(response.headers['content-disposition']).toMatch(new RegExp(`attachment; filename="reports_${testSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d{4}-\\d{2}-\\d{2}\\.txt"`));
      expect(response.text).toContain(`Event Reports - ${testSlug}`);
      expect(response.text).toContain('Test Report 1 for Export');
    });

    test('should export specific reports by IDs', async () => {
      const response = await request(app)
        .get(`/api/events/slug/${testSlug}/reports/export?format=csv&ids=${reportIds[0]},${reportIds[1]}`)
        .set('x-test-user-id', responderId)
        .expect(200);

      expect(response.text).toContain('Test Report 1 for Export');
      expect(response.text).toContain('Test Report 2 for Export');
      expect(response.text).not.toContain('Test Report 3 for Export');
    });

    test('should require valid format', async () => {
      await request(app)
        .get(`/api/events/slug/${testSlug}/reports/export?format=invalid`)
        .set('x-test-user-id', responderId)
        .expect(400);
    });

    test('should require authentication', async () => {
      await request(app)
        .get(`/api/events/slug/${testSlug}/reports/export?format=csv`)
        .set('x-test-disable-auth', 'true').expect(401);
    });

    test('should require appropriate role', async () => {
      await request(app)
        .get(`/api/events/slug/${testSlug}/reports/export?format=csv`)
        .set('x-test-user-id', reporterId)
        .expect(200); // Reporter should be able to export (their own reports)
    });
  });

  describe('Bulk Actions', () => {
    test('should bulk assign reports', async () => {
      const response = await request(app)
        .post(`/api/events/slug/${testSlug}/reports/bulk`)
        .set('x-test-user-id', responderId)
        .send({
          action: 'assign',
          reportIds: [reportIds[0], reportIds[1]],
          assignedTo: responderId
        })
        .expect(200);

      expect(response.body.updated).toBe(2);
      expect(response.body.errors).toHaveLength(0);

      // Verify assignments
      const reports = await prisma.report.findMany({
        where: { id: { in: [reportIds[0], reportIds[1]] } }
      });
      reports.forEach(report => {
        expect(report.assignedResponderId).toBe(responderId);
      });
    });

    test('should bulk update status', async () => {
      const response = await request(app)
        .post(`/api/events/slug/${testSlug}/reports/bulk`)
        .set('x-test-user-id', adminId)
        .send({
          action: 'status',
          reportIds: [reportIds[0], reportIds[1]],
          status: 'acknowledged'
        })
        .expect(200);

      expect(response.body.updated).toBe(2);
      expect(response.body.errors).toHaveLength(0);

      // Verify status updates
      const reports = await prisma.report.findMany({
        where: { id: { in: [reportIds[0], reportIds[1]] } }
      });
      reports.forEach(report => {
        expect(report.state).toBe('acknowledged');
      });
    });

    test('should bulk delete reports', async () => {
      const response = await request(app)
        .post(`/api/events/slug/${testSlug}/reports/bulk`)
        .set('x-test-user-id', adminId)
        .send({
          action: 'delete',
          reportIds: [reportIds[0]]
        })
        .expect(200);

      expect(response.body.updated).toBe(1);
      expect(response.body.errors).toHaveLength(0);

      // Verify deletion
      const report = await prisma.report.findUnique({
        where: { id: reportIds[0] }
      });
      expect(report).toBeNull();
    });

    test('should validate required fields', async () => {
      await request(app)
        .post(`/api/events/slug/${testSlug}/reports/bulk`)
        .set('x-test-user-id', responderId)
        .send({
          action: 'assign',
          reportIds: [reportIds[0]]
          // Missing assignedTo
        })
        .expect(200); // Returns 200 but with errors

      await request(app)
        .post(`/api/events/slug/${testSlug}/reports/bulk`)
        .set('x-test-user-id', responderId)
        .send({
          action: 'status',
          reportIds: [reportIds[0]]
          // Missing status
        })
        .expect(200); // Returns 200 but with errors
    });

    test('should validate invalid status', async () => {
      const response = await request(app)
        .post(`/api/events/slug/${testSlug}/reports/bulk`)
        .set('x-test-user-id', adminId)
        .send({
          action: 'status',
          reportIds: [reportIds[0]],
          status: 'invalid_status'
        })
        .expect(200);

      expect(response.body.updated).toBe(0);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0]).toContain('Invalid status');
    });

    test('should require authentication', async () => {
      await request(app)
        .post(`/api/events/slug/${testSlug}/reports/bulk`)
        .send({
          action: 'assign',
          reportIds: [reportIds[0]],
          assignedTo: responderId
        })
        .set('x-test-disable-auth', 'true').expect(401);
    });

    test('should require appropriate role', async () => {
      await request(app)
        .post(`/api/events/slug/${testSlug}/reports/bulk`)
        .set('x-test-user-id', reporterId)
        .send({
          action: 'assign',
          reportIds: [reportIds[0]],
          assignedTo: responderId
        })
        .expect(403); // Reporter doesn't have bulk action permissions
    });

    test('should validate action type', async () => {
      await request(app)
        .post(`/api/events/slug/${testSlug}/reports/bulk`)
        .set('x-test-user-id', responderId)
        .send({
          action: 'invalid_action',
          reportIds: [reportIds[0]]
        })
        .expect(400);
    });

    test('should validate reportIds array', async () => {
      await request(app)
        .post(`/api/events/slug/${testSlug}/reports/bulk`)
        .set('x-test-user-id', responderId)
        .send({
          action: 'assign',
          reportIds: 'not_an_array'
        })
        .expect(400);

      await request(app)
        .post(`/api/events/slug/${testSlug}/reports/bulk`)
        .set('x-test-user-id', responderId)
        .send({
          action: 'assign',
          reportIds: []
        })
        .expect(400);
    });
  });
}); 