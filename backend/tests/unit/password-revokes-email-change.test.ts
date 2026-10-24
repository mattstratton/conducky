import { PrismaClient, inMemoryStore } from '@prisma/client';
import bcrypt from 'bcrypt';
import logger from '../../src/config/logger';
import { emailService } from '../../src/utils/email';
import { UserService } from '../../src/services/user.service';
import { AuthService } from '../../src/services/auth.service';
import { EmailVerificationService } from '../../src/services/email-verification.service';

jest.mock('../../src/utils/audit', () => ({ logAudit: jest.fn() }));

const store = inMemoryStore as any;
const STRONG = 'Str0ng!Passw0rd#9';

describe('a pending email change does not survive a password change or reset', () => {
  let prisma: any;
  let verification: EmailVerificationService;
  let raw: string;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    store.users.length = 0;
    store.emailVerificationTokens.length = 0;
    store.passwordResetTokens.length = 0;
    store.users.push({
      id: 'pw-1', email: 'pw@example.com', name: 'Pw', passwordHash: await bcrypt.hash('OldPassw0rd!x', 4),
      emailVerificationRequired: true, emailVerifiedAt: new Date(),
    });
    prisma = new PrismaClient();
    verification = new EmailVerificationService(prisma);
    jest.spyOn(emailService, 'isConfigured').mockResolvedValue(true);
    jest.spyOn(emailService, 'sendVerificationEmail').mockResolvedValue({ success: true } as any);
    await verification.sendVerification({ id: 'pw-1', email: 'pw@example.com', name: 'Pw' }, 'attacker@example.com');
    raw = (emailService.sendVerificationEmail as jest.Mock).mock.calls[0][2];
    errorSpy = jest.spyOn(logger(), 'error').mockImplementation((() => logger()) as any);
  });
  afterEach(() => jest.restoreAllMocks());

  const pendingLinkIsDead = async () => {
    expect(store.emailVerificationTokens).toHaveLength(0);
    expect(await verification.verifyToken(raw)).toEqual({ status: 'invalid' });
    expect(store.users[0].email).toBe('pw@example.com');
  };

  it('changePassword revokes it', async () => {
    const r = await new UserService(prisma).changePassword('pw-1', { currentPassword: 'OldPassw0rd!x', newPassword: STRONG });
    expect(r.success).toBe(true);
    await pendingLinkIsDead();
  });

  it('changePassword still succeeds, and logs the message only, if the revoke throws', async () => {
    prisma.emailVerificationToken.deleteMany.mockImplementationOnce(() => { throw new Error('db hiccup'); });
    const r = await new UserService(prisma).changePassword('pw-1', { currentPassword: 'OldPassw0rd!x', newPassword: STRONG });
    expect(r.success).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith(expect.any(String), { userId: 'pw-1', error: 'db hiccup' });
  });

  const addReset = () =>
    store.passwordResetTokens.push({
      id: 'rt', token: 'reset-token', userId: 'pw-1', used: false, expiresAt: new Date(Date.now() + 3600e3), createdAt: new Date(),
    });

  it('a completed password reset revokes it', async () => {
    addReset();
    const r = await new AuthService(prisma).resetPassword({ token: 'reset-token', password: STRONG });
    expect(r.success).toBe(true);
    await pendingLinkIsDead();
  });

  it('a password reset still succeeds, and logs the message only, if the revoke throws', async () => {
    addReset();
    prisma.emailVerificationToken.deleteMany.mockImplementationOnce(() => { throw new Error('db hiccup'); });
    const r = await new AuthService(prisma).resetPassword({ token: 'reset-token', password: STRONG });
    expect(r.success).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith(expect.any(String), { userId: 'pw-1', error: 'db hiccup' });
  });
});

describe('updateProfile with an unchanged address', () => {
  it('does not write email (so it cannot undo a change applied meanwhile)', async () => {
    store.users.length = 0;
    store.users.push({ id: 'up-1', email: 'Legacy@Example.com', name: 'U' });
    const prisma: any = new PrismaClient();
    jest.spyOn(emailService, 'isConfigured').mockResolvedValue(true);
    const r = await new UserService(prisma).updateProfile('up-1', { name: 'V', email: 'legacy@example.com' });
    expect(r.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ name: 'V' });
    jest.restoreAllMocks();
  });
});
