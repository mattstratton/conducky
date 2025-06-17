const { logAudit } = require('../../src/utils/audit');
const { inMemoryStore } = require('@prisma/client');

beforeEach(() => {
  // Reset the inMemoryStore for test isolation
  inMemoryStore.events.length = 1;
  inMemoryStore.roles.length = 3;
  inMemoryStore.users.length = 1;
  inMemoryStore.userEventRoles.length = 1;
  inMemoryStore.reports.length = 1;
  inMemoryStore.auditLogs.length = 0;
});

describe('logAudit', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call prisma.auditLog.create with correct data', async () => {
    // Patch: Mock logAudit to simulate auditLog.create
    const params = {
      eventId: 'event1',
      userId: 'user1',
      action: 'test_action',
      targetType: 'Test',
      targetId: 'target1',
    };
    // Simulate auditLog.create by pushing to inMemoryStore.auditLogs
    const originalLength = inMemoryStore.auditLogs.length;
    const result = await logAudit(params);
    expect(inMemoryStore.auditLogs.length).toBe(originalLength + 1);
    expect(result).toHaveProperty('eventId', 'event1');
    expect(result).toHaveProperty('action', 'test_action');
  });

  it('should throw if required fields are missing', async () => {
    await expect(logAudit({})).rejects.toThrow('Missing required fields');
  });

  it('should propagate Prisma errors', async () => {
    // Patch: Simulate error by temporarily replacing auditLog.create
    const originalPush = inMemoryStore.auditLogs.push;
    inMemoryStore.auditLogs.push = () => { throw new Error('Prisma error'); };
    await expect(
      logAudit({ eventId: 'e', action: 'a', targetType: 't', targetId: 'id' })
    ).rejects.toThrow('Prisma error');
    inMemoryStore.auditLogs.push = originalPush;
  });
}); 