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

    // Make user an organization admin using unified RBAC
    const orgAdminRole = inMemoryStore.unifiedRoles.find(r => r.name === 'org_admin');
    if (orgAdminRole) {
      const orgAdminUserRole = {
        id: 'test-user-role-1',
        userId: testUser.id,
        roleId: orgAdminRole.id,
        scopeType: 'organization',
        scopeId: testOrganization.id,
        grantedAt: new Date(),
        role: { id: orgAdminRole.id, name: 'org_admin' },
        user: { id: testUser.id, email: testUser.email, name: testUser.name }
      };
      inMemoryStore.userRoles.push(orgAdminUserRole);
    }

    // Also add legacy membership for compatibility (optional)
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

    // Verify that the creator was automatically assigned as Event Admin via unified RBAC
    const eventAdminUnifiedRole = inMemoryStore.unifiedRoles.find(r => r.name === 'event_admin');
    const userRole = inMemoryStore.userRoles.find(ur => 
      ur.userId === testUser.id && 
      ur.scopeType === 'event' &&
      ur.scopeId === response.body.event.id && 
      ur.roleId === eventAdminUnifiedRole.id
    );

    expect(userRole).not.toBeNull();
    expect(userRole.userId).toBe(testUser.id);
    expect(userRole.scopeId).toBe(response.body.event.id);
    expect(userRole.scopeType).toBe('event');
    expect(userRole.roleId).toBe(eventAdminUnifiedRole.id);
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

  test('should automatically assign all current org admins as event admins when an event is created', async () => {
    // Arrange: add a second org admin to the same organization
    const secondAdmin = {
      id: 'second-admin-user',
      email: 'secondadmin@test.com',
      name: 'Second Admin User',
      passwordHash: 'hashedpassword'
    };
    inMemoryStore.users.push(secondAdmin);

    const orgAdminUnifiedRole = inMemoryStore.unifiedRoles.find(r => r.name === 'org_admin');
    expect(orgAdminUnifiedRole).toBeTruthy();
    inMemoryStore.userRoles.push({
      id: 'test-user-role-2',
      userId: secondAdmin.id,
      roleId: orgAdminUnifiedRole.id,
      scopeType: 'organization',
      scopeId: testOrganization.id,
      grantedAt: new Date(),
      role: { id: orgAdminUnifiedRole.id, name: 'org_admin' },
      user: { id: secondAdmin.id, email: secondAdmin.email, name: secondAdmin.name }
    });

    // Act: create a new event as the original org admin
    const response = await request(app)
      .post(`/api/organizations/${testOrganization.id}/events`)
      .set('x-test-user-id', testUser.id)
      .send({
        name: 'Multi Admin Event',
        slug: 'multi-admin-event'
      })
      .expect(201);

    const createdEventId = response.body?.event?.id;
    expect(createdEventId).toBeTruthy();

    // Assert: both org admins should have event_admin unified role for this event
    const eventAdminUnifiedRole = inMemoryStore.unifiedRoles.find(r => r.name === 'event_admin');
    expect(eventAdminUnifiedRole).toBeTruthy();

    const hasCreatorAssignment = !!inMemoryStore.userRoles.find(ur =>
      ur.userId === testUser.id && ur.scopeType === 'event' && ur.scopeId === createdEventId && ur.roleId === eventAdminUnifiedRole.id
    );
    const hasSecondAdminAssignment = !!inMemoryStore.userRoles.find(ur =>
      ur.userId === secondAdmin.id && ur.scopeType === 'event' && ur.scopeId === createdEventId && ur.roleId === eventAdminUnifiedRole.id
    );

    expect(hasCreatorAssignment).toBe(true);
    expect(hasSecondAdminAssignment).toBe(true);
  });
}); 