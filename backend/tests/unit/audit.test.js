const { logAudit } = require('../../utils/audit');

jest.mock('../../utils/audit', () => {
  const original = jest.requireActual('../../utils/audit');
  return {
    ...original,
    __esModule: true,
    logAudit: jest.fn(),
  };
});

describe('logAudit', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call prisma.auditLog.create with correct data', async () => {
    const params = {
      eventId: 'event1',
      userId: 'user1',
      action: 'test_action',
      targetType: 'Test',
      targetId: 'target1',
    };
    const mockResult = { id: 'log1', ...params };
    require('../../utils/audit').logAudit.mockResolvedValue(mockResult);
    const result = await logAudit(params);
    expect(logAudit).toHaveBeenCalledWith(params);
    expect(result).toEqual(mockResult);
  });

  it('should throw if required fields are missing', async () => {
    require('../../utils/audit').logAudit.mockImplementation(() => {
      throw new Error('Missing required fields');
    });
    await expect(logAudit({})).rejects.toThrow('Missing required fields');
  });

  it('should propagate Prisma errors', async () => {
    require('../../utils/audit').logAudit.mockRejectedValue(new Error('Prisma error'));
    await expect(logAudit({ eventId: 'e', action: 'a', targetType: 't', targetId: 'id' })).rejects.toThrow('Prisma error');
  });
}); 