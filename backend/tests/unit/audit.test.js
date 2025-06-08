jest.mock('@prisma/client', () => {
  const mockCreate = jest.fn();
  return {
    PrismaClient: jest.fn(() => ({
      auditLog: { create: mockCreate },
    })),
    __mockCreate: mockCreate,
  };
});

const { logAudit } = require('../../utils/audit');
const { __mockCreate } = require('@prisma/client');

describe('logAudit', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call prisma.auditLog.create with correct data', async () => {
    __mockCreate.mockResolvedValue({ id: 'log1' });
    const params = {
      eventId: 'event1',
      userId: 'user1',
      action: 'test_action',
      targetType: 'Test',
      targetId: 'target1',
    };
    const result = await logAudit(params);
    expect(__mockCreate).toHaveBeenCalledWith({ data: params });
    expect(result).toEqual({ id: 'log1' });
  });

  it('should throw if required fields are missing', async () => {
    await expect(logAudit({})).rejects.toThrow('Missing required fields');
  });

  it('should propagate Prisma errors', async () => {
    __mockCreate.mockRejectedValue(new Error('Prisma error'));
    await expect(
      logAudit({ eventId: 'e', action: 'a', targetType: 't', targetId: 'id' })
    ).rejects.toThrow('Prisma error');
  });
}); 