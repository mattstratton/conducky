const request = require('supertest');
const app = require('../../index');

describe('Organization Analytics API', () => {
  let adminId;
  let orgId;
  let eventId;

  beforeAll(async () => {
    // Use seeded System Admin user in test environment
    adminId = '1';

    // Create organization (requires System Admin)
    await request(app)
      .post('/api/organizations')
      .set('x-test-user-id', adminId)
      .send({ name: 'Test Org Analytics', slug: 'test-org-analytics' })
      .expect(201)
      .then(res => { orgId = res.body.organization.id; });

    // Create event in org as org_admin (promote admin to org_admin implicitly on create)
    await request(app)
      .post(`/api/organizations/${orgId}/events`)
      .set('x-test-user-id', adminId)
      .send({ name: 'Analytics Event', slug: 'analytics-event' })
      .expect(201)
      .then(res => { eventId = res.body.event.id; });

    // Create a couple of incidents for data
    await request(app)
      .post(`/api/events/slug/analytics-event/incidents`)
      .set('x-test-user-id', adminId)
      .send({ title: 'Incident Alpha Title', description: 'Description for incident alpha with enough length.' })
      .expect(201);

    await request(app)
      .post(`/api/events/slug/analytics-event/incidents`)
      .set('x-test-user-id', adminId)
      .send({ title: 'Incident Bravo Title', description: 'Description for incident bravo with enough length.' })
      .expect(201);
  });

  test('GET /api/organizations/:organizationId/reports/analytics returns analytics', async () => {
    const res = await request(app)
      .get(`/api/organizations/${orgId}/reports/analytics?timeRange=all`)
      .set('x-test-user-id', adminId)
      .expect(200);

    expect(res.body).toHaveProperty('metrics');
    expect(typeof res.body.metrics.totalReports).toBe('number');
    expect(res.body).toHaveProperty('byStatus');
    expect(Array.isArray(res.body.byStatus)).toBe(true);
    expect(res.body).toHaveProperty('monthlyTrends');
  });

  test('GET events summary returns summary', async () => {
    const res = await request(app)
      .get(`/api/organizations/${orgId}/events/summary`)
      .set('x-test-user-id', adminId)
      .expect(200);
    expect(res.body).toHaveProperty('totalEvents');
    expect(Array.isArray(res.body.events)).toBe(true);
  });

  test('Export CSV works', async () => {
    const res = await request(app)
      .get(`/api/organizations/${orgId}/reports/export?format=csv&timeRange=all`)
      .set('x-test-user-id', adminId)
      .expect(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="org_reports_\d{4}-\d{2}-\d{2}\.csv"/);
  });

  test('Export PDF-text works', async () => {
    const res = await request(app)
      .get(`/api/organizations/${orgId}/reports/export?format=pdf&timeRange=all`)
      .set('x-test-user-id', adminId)
      .expect(200);
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="org_reports_\d{4}-\d{2}-\d{2}\.txt"/);
  });
});


