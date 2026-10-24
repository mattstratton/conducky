import { emailService } from '../../src/utils/email';
import logger from '../../src/config/logger';
import { UNVERIFIED_PURGE_MS } from '../../src/services/email-verification.service';
import {
  purgeUnverifiedAccounts,
  startUnverifiedPurge,
} from '../../src/services/unverified-purge.service';

jest.mock('../../src/utils/audit', () => ({ logAudit: jest.fn() }));
import { logAudit } from '../../src/utils/audit';

const NOW = new Date('2026-10-24T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

describe('purgeUnverifiedAccounts', () => {
  let prisma: any;
  let service: { deleteGatedUnverifiedAccount: jest.Mock };
  let configured: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (logAudit as jest.Mock).mockResolvedValue({});
    prisma = { user: { findMany: jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]) } };
    service = { deleteGatedUnverifiedAccount: jest.fn().mockResolvedValue(true) };
    configured = jest.spyOn(emailService, 'isConfigured').mockResolvedValue(true);
    jest.spyOn(logger(), 'error').mockImplementation((() => logger()) as any);
  });
  afterEach(() => jest.restoreAllMocks());

  const run = () => purgeUnverifiedAccounts(prisma, NOW, service as any);

  it('selects exactly gated, unverified, mail-sent accounts older than the purge window', async () => {
    await run();
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        emailVerificationRequired: true,
        emailVerifiedAt: null,
        verificationSentAt: { lt: new Date(NOW.getTime() - UNVERIFIED_PURGE_MS) },
      },
      select: { id: true },
    });
    expect(UNVERIFIED_PURGE_MS).toBe(7 * DAY);
  });

  it('deletes candidates through the service and counts them', async () => {
    expect(await run()).toBe(2);
    expect(service.deleteGatedUnverifiedAccount).toHaveBeenCalledWith('a');
    expect(service.deleteGatedUnverifiedAccount).toHaveBeenCalledWith('b');
  });

  it('skips and does not count or audit a false result', async () => {
    service.deleteGatedUnverifiedAccount.mockResolvedValueOnce(false);
    expect(await run()).toBe(1);
    expect(logAudit).toHaveBeenCalledTimes(1);
    expect(logAudit).toHaveBeenCalledWith({
      userId: null,
      action: 'unverified_account_purged',
      targetType: 'User',
      targetId: 'b',
    });
  });

  it('keeps purging when the audit write fails', async () => {
    (logAudit as jest.Mock).mockRejectedValue(new Error('audit down'));
    expect(await run()).toBe(2);
    expect(service.deleteGatedUnverifiedAccount).toHaveBeenCalledTimes(2);
  });

  it('continues after one account throws', async () => {
    service.deleteGatedUnverifiedAccount.mockRejectedValueOnce(new Error('boom'));
    expect(await run()).toBe(1);
    expect(service.deleteGatedUnverifiedAccount).toHaveBeenCalledTimes(2);
    expect(logAudit).toHaveBeenCalledTimes(1);
  });

  it('does nothing when email is not configured', async () => {
    configured.mockResolvedValue(false);
    expect(await run()).toBe(0);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});

describe('startUnverifiedPurge', () => {
  const original = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = original;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns null under NODE_ENV=test', () => {
    expect(startUnverifiedPurge({} as any)).toBeNull();
  });

  it('runs once at start and every 24 hours, surviving rejections', async () => {
    process.env.NODE_ENV = 'development';
    jest.useFakeTimers();
    const findMany = jest.fn().mockRejectedValue(new Error('db down'));
    jest.spyOn(emailService, 'isConfigured').mockResolvedValue(true);
    jest.spyOn(logger(), 'error').mockImplementation((() => logger()) as any);

    const timer = startUnverifiedPurge({ user: { findMany } } as any);
    expect(timer).not.toBeNull();
    await jest.advanceTimersByTimeAsync(0);
    expect(findMany).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(DAY);
    expect(findMany).toHaveBeenCalledTimes(2);
    clearInterval(timer!);
  });
});
