const { OrganizationAnalyticsService } = require('../../dist/src/services/organization-analytics.service');

describe('OrganizationAnalyticsService (unit)', () => {
  test('getOrganizationAnalytics computes metrics and distributions', async () => {
    const prisma = {
      incident: {
        count: jest
          .fn()
          // totalReports
          .mockResolvedValueOnce(3)
          // pendingReports
          .mockResolvedValueOnce(2)
          // escalatedReports
          .mockResolvedValueOnce(1),
        findMany: jest
          .fn()
          // resolvedIncidents (createdAt/resolvedAt)
          .mockResolvedValueOnce([
            { createdAt: new Date('2025-01-01T00:00:00Z'), resolvedAt: new Date('2025-01-02T00:00:00Z') }, // 24h
            { createdAt: new Date('2025-01-01T00:00:00Z'), resolvedAt: new Date('2025-01-01T12:00:00Z') }, // 12h
          ])
          // incidentsForTrends (createdAt/resolvedAt)
          .mockResolvedValueOnce([
            { createdAt: new Date('2025-01-01T10:00:00Z'), resolvedAt: null },
            { createdAt: new Date('2025-01-15T10:00:00Z'), resolvedAt: new Date('2025-02-03T10:00:00Z') },
            { createdAt: new Date('2025-02-01T10:00:00Z'), resolvedAt: null },
          ])
          // recent (include event/assigned)
          .mockResolvedValueOnce([
            { id: 'i1', title: 't1', state: 'submitted', severity: 'low', createdAt: new Date('2025-02-01T10:00:00Z'), event: { name: 'Event A' }, assignedResponder: null },
          ]),
        groupBy: jest
          .fn()
          // byStatus
          .mockResolvedValueOnce([
            { state: 'submitted', _count: { state: 2 } },
            { state: 'resolved', _count: { state: 1 } },
          ])
          // bySeverity
          .mockResolvedValueOnce([
            { severity: 'low', _count: { severity: 2 } },
            { severity: 'critical', _count: { severity: 1 } },
          ])
          // byEvent
          .mockResolvedValueOnce([
            { eventId: 'e1', _count: { eventId: 2 } },
            { eventId: 'e2', _count: { eventId: 1 } },
          ]),
      },
      event: {
        findMany: jest.fn().mockResolvedValueOnce([
          { id: 'e1', name: 'Event One', slug: 'event-one' },
          { id: 'e2', name: 'Event Two', slug: 'event-two' },
        ]),
      },
    };

    const service = new OrganizationAnalyticsService(prisma);
    const result = await service.getOrganizationAnalytics({ organizationId: 'org-123', timeRange: 'all' });

    expect(result.metrics.totalReports).toBe(3);
    expect(result.metrics.pendingReports).toBe(2);
    // avg (24h + 12h)/2 = 18.0 -> 18.0
    expect(result.metrics.avgResolutionTime).toBe(18);
    expect(result.metrics.escalatedReports).toBe(1);
    expect(result.byStatus.find(s => s.status === 'submitted').count).toBe(2);
    expect(result.bySeverity.find(s => s.severity === 'critical').count).toBe(1);
    expect(result.byEvent.find(e => e.eventSlug === 'event-one').count).toBe(2);
    expect(result.monthlyTrends.length).toBeGreaterThan(0);
    expect(result.recentReports.length).toBe(1);
  });

  test('getOrganizationEventsSummary returns counts and team sizes', async () => {
    const prisma = {
      event: {
        findMany: jest.fn().mockResolvedValueOnce([
          { id: 'e1', name: 'Event One', slug: 'event-one', isActive: true },
          { id: 'e2', name: 'Event Two', slug: 'event-two', isActive: false },
        ]),
      },
      incident: {
        groupBy: jest.fn().mockResolvedValueOnce([
          { eventId: 'e1', _count: { eventId: 5 } },
          { eventId: 'e2', _count: { eventId: 2 } },
        ]),
      },
      userRole: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'ur1' }, { id: 'ur2' }])
          .mockResolvedValueOnce([{ id: 'ur3' }]),
      },
    };

    const service = new OrganizationAnalyticsService(prisma);
    const summary = await service.getOrganizationEventsSummary('org-123');
    expect(summary.totalEvents).toBe(2);
    expect(summary.activeEvents).toBe(1);
    const e1 = summary.events.find(e => e.slug === 'event-one');
    expect(e1.reportCount).toBe(5);
    expect(e1.teamSize).toBe(2);
  });

  test('exportOrganizationIncidentsCsv returns CSV content and headers', async () => {
    const prisma = {
      incident: {
        findMany: jest.fn().mockResolvedValueOnce([
          {
            id: 'i1',
            title: 'Title One',
            state: 'submitted',
            severity: 'low',
            description: 'Desc',
            createdAt: new Date('2025-01-01T00:00:00Z'),
            event: { slug: 'event-one', name: 'Event One' },
            reporter: { name: 'Alice' },
            assignedResponder: null,
          },
        ]),
      },
    };
    const service = new OrganizationAnalyticsService(prisma);
    const out = await service.exportOrganizationIncidentsCsv({ organizationId: 'org-1', timeRange: 'all' }, 'http://localhost:4000');
    expect(out.contentType).toBe('text/csv; charset=utf-8');
    expect(out.filename).toMatch(/^org_reports_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(out.body).toContain('ID,Title,Status,Severity,Event,Reporter,Assigned,Created,Description,URL');
    expect(out.body).toContain('Title One');
  });
});


