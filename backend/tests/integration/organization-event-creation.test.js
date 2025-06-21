const request = require('supertest');
const app = require('../../index');
const { inMemoryStore } = require('../../__mocks__/@prisma/client');

// Mock the database module to use our mock
jest.mock('../../src/config/database', () => ({
  prisma: new (require('../../__mocks__/@prisma/client').PrismaClient)()
}));

describe('Organization Event Creation Bug Fix', () => {
  let testUser, testOrganization, eventAdminRole, orgAdminMembership;

  beforeAll(async () => {
    // Reset the in-memory store
    inMemoryStore.users.length = 0;
    inMemoryStore.organizations.length = 0;
    inMemoryStore.organizationMemberships.length = 0;
    inMemoryStore.events.length = 0;
    inMemoryStore.userEventRoles.length = 0;

    // Create test user
    testUser = {
      id: 'test-org-admin-user',
      email: 'orgadmin@test.com',
      name: 'Org Admin Test User',
      passwordHash: 'hashedpassword'
    };
    inMemoryStore.users.push(testUser);

    // Create test organization
    testOrganization = {
      id: 'test-org-for-event-creation',
      name: 'Test Organization for Event Creation',
      slug: 'test-org-for-event-creation',
      description: 'Test organization for event creation bug fix',
      createdById: testUser.id
    };
    inMemoryStore.organizations.push(testOrganization);

    // Make user an organization admin
    orgAdminMembership = {
      id: 'test-membership-1',
      organizationId: testOrganization.id,
      userId: testUser.id,
      role: 'org_admin',
      createdById: testUser.id
    };
    inMemoryStore.organizationMemberships.push(orgAdminMembership);

    // Ensure Event Admin role exists
    eventAdminRole = inMemoryStore.roles.find(r => r.name === 'Event Admin');
    if (!eventAdminRole) {
      eventAdminRole = { id: '5', name: 'Event Admin' };
      inMemoryStore.roles.push(eventAdminRole);
    }
  });

  afterAll(async () => {
    // Clean up test data
    inMemoryStore.users.length = 0;
    inMemoryStore.organizations.length = 0;
    inMemoryStore.organizationMemberships.length = 0;
    inMemoryStore.events.length = 0;
    inMemoryStore.userEventRoles.length = 0;
  });

  test('should automatically assign creator as event admin when organization admin creates event', async () => {
    // Create event as organization admin
    const response = await request(app)
      .post(`/api/organizations/${testOrganization.id}/events`)
      .set('x-test-user-id', testUser.id)
      .send({
        name: 'Test Organization Event',
        slug: 'test-org-event',
        description: 'Test event created by organization admin',
        contactEmail: 'contact@test.com'
      })
      .expect(201);

    expect(response.body).toHaveProperty('event');
    expect(response.body.event.name).toBe('Test Organization Event');
    expect(response.body.event.slug).toBe('test-org-event');
    expect(response.body.event.organizationId).toBe(testOrganization.id);

    // Verify that the creator was automatically assigned as Event Admin
    const userEventRole = inMemoryStore.userEventRoles.find(uer => 
      uer.userId === testUser.id && 
      uer.eventId === response.body.event.id && 
      uer.roleId === eventAdminRole.id
    );

    expect(userEventRole).not.toBeNull();
    expect(userEventRole.userId).toBe(testUser.id);
    expect(userEventRole.eventId).toBe(response.body.event.id);
    expect(userEventRole.roleId).toBe(eventAdminRole.id);
  });

  test('should fail to create event if user is not organization admin', async () => {
    // Create another user who is not an org admin
    const nonAdminUser = {
      id: 'non-admin-user',
      email: 'nonadmin@test.com',
      name: 'Non Admin User',
      passwordHash: 'hashedpassword'
    };
    inMemoryStore.users.push(nonAdminUser);

    try {
      const response = await request(app)
        .post(`/api/organizations/${testOrganization.id}/events`)
        .set('x-test-user-id', nonAdminUser.id)
        .send({
          name: 'Should Fail Event',
          slug: 'should-fail-event',
          description: 'This should fail because user is not org admin'
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Organization admin access required');
    } finally {
      // Clean up
      const userIndex = inMemoryStore.users.findIndex(u => u.id === nonAdminUser.id);
      if (userIndex > -1) {
        inMemoryStore.users.splice(userIndex, 1);
      }
    }
  });
}); 