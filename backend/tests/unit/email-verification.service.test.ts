import { PrismaClient, inMemoryStore } from '@prisma/client';
import crypto from 'crypto';
import { emailService } from '../../src/utils/email';
import logger from '../../src/config/logger';
import {
  EmailVerificationService,
  hashToken,
  isGated,
  TOKEN_TTL_MS,
  RESEND_COOLDOWN_MS,
  TAKEOVER_GRACE_MS,
} from '../../src/services/email-verification.service';

jest.mock('../../src/utils/audit', () => ({ logAudit: jest.fn() }));
import { logAudit } from '../../src/utils/audit';

const store = inMemoryStore as any;
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

describe('EmailVerificationService', () => {
  let prisma: any;
  let svc: EmailVerificationService;
  let configured: jest.SpyInstance;
  let send: jest.SpyInstance;

  const addUser = (over: Record<string, unknown> = {}) => {
    const user = {
      id: `ev-${store.users.length + 1}`,
      email: `u${store.users.length + 1}@example.com`,
      name: 'Test',
      emailVerificationRequired: true,
      emailVerifiedAt: null,
      verificationSentAt: null,
      ...over,
    };
    store.users.push(user);
    return user;
  };
  const findUser = (id: string) => store.users.find((u: any) => u.id === id);
  const lastRawToken = () => send.mock.calls[send.mock.calls.length - 1][2] as string;

  beforeEach(() => {
    store.emailVerificationTokens.length = 0;
    store.users.length = 0;
    (logAudit as jest.Mock).mockClear();
    prisma = new PrismaClient();
    svc = new EmailVerificationService(prisma);
    configured = jest.spyOn(emailService, 'isConfigured').mockResolvedValue(true);
    send = jest
      .spyOn(emailService, 'sendVerificationEmail')
      .mockResolvedValue({ success: true } as any);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('hashToken / isGated', () => {
    it('hashToken is sha256 hex', () => {
      expect(hashToken('abc')).toBe(crypto.createHash('sha256').update('abc').digest('hex'));
    });

    it.each([
      [{ emailVerificationRequired: true, emailVerifiedAt: null }, true],
      [{ emailVerificationRequired: true }, true],
      [{ emailVerificationRequired: true, emailVerifiedAt: new Date() }, false],
      [{ emailVerificationRequired: false, emailVerifiedAt: null }, false],
      [{ emailVerificationRequired: null, emailVerifiedAt: null }, false],
      [{}, false],
    ])('isGated(%j) = %s', (u, expected) => {
      expect(isGated(u as any)).toBe(expected);
    });
  });

  describe('issueToken', () => {
    it('stores only the hash, expires in about 24h', async () => {
      const u = addUser();
      const raw = await svc.issueToken(u.id);
      expect(raw).toMatch(/^[0-9a-f]{64}$/);
      expect(store.emailVerificationTokens).toHaveLength(1);
      const row = store.emailVerificationTokens[0];
      expect(row.tokenHash).toBe(hashToken(raw));
      expect(JSON.stringify(row)).not.toContain(raw);
      expect(Math.abs(row.expiresAt.getTime() - (Date.now() + TOKEN_TTL_MS))).toBeLessThan(5000);
    });

    it('deletes earlier unused tokens for the user only', async () => {
      const a = addUser();
      const b = addUser();
      await svc.issueToken(a.id);
      await svc.issueToken(b.id);
      await svc.issueToken(a.id);
      expect(store.emailVerificationTokens.filter((t: any) => t.userId === a.id)).toHaveLength(1);
      expect(store.emailVerificationTokens.filter((t: any) => t.userId === b.id)).toHaveLength(1);
    });

    it('stores pendingEmail when given', async () => {
      const u = addUser();
      await svc.issueToken(u.id, 'new@example.com');
      expect(store.emailVerificationTokens[0].pendingEmail).toBe('new@example.com');
    });
  });

  describe('sendVerification', () => {
    it('sends to the user, sets verificationSentAt, audits, never logs the token', async () => {
      const u = addUser();
      expect(await svc.sendVerification(u)).toBe(true);
      expect(send.mock.calls[0][0]).toBe(u.email);
      expect(findUser(u.id).verificationSentAt).toBeInstanceOf(Date);
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'verification_email_sent', targetType: 'User', targetId: u.id, userId: u.id })
      );
      expect(JSON.stringify((logAudit as jest.Mock).mock.calls)).not.toContain(lastRawToken());
    });

    it('sends to pendingEmail as an email change', async () => {
      const u = addUser();
      await svc.sendVerification(u, 'new@example.com');
      expect(send.mock.calls[0][0]).toBe('new@example.com');
      expect(send.mock.calls[0][3]).toEqual({ emailChange: true });
    });

    it('returns false and leaves verificationSentAt on failure', async () => {
      send.mockResolvedValue({ success: false } as any);
      const u = addUser();
      expect(await svc.sendVerification(u)).toBe(false);
      expect(findUser(u.id).verificationSentAt).toBeNull();
      expect(logAudit).not.toHaveBeenCalled();
    });

    it('returns false when the mailer throws', async () => {
      send.mockRejectedValue(new Error('boom'));
      const u = addUser();
      expect(await svc.sendVerification(u)).toBe(false);
    });
  });

  describe('verifyToken', () => {
    it('verifies a valid token and audits', async () => {
      const u = addUser();
      const raw = await svc.issueToken(u.id);
      expect(await svc.verifyToken(raw)).toEqual({ status: 'verified', userId: u.id });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(findUser(u.id).emailVerifiedAt).toBeInstanceOf(Date);
      expect(store.emailVerificationTokens[0].usedAt).toBeInstanceOf(Date);
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'email_verified', targetType: 'User', targetId: u.id, userId: u.id })
      );
    });

    it('second call after success is already_verified (double-click safe)', async () => {
      const u = addUser();
      const raw = await svc.issueToken(u.id);
      await svc.verifyToken(raw);
      expect(await svc.verifyToken(raw)).toEqual({ status: 'already_verified' });
    });

    it('expired token is invalid with no state change', async () => {
      const u = addUser();
      const raw = await svc.issueToken(u.id);
      store.emailVerificationTokens[0].expiresAt = new Date(Date.now() - 1000);
      expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
      expect(findUser(u.id).emailVerifiedAt).toBeNull();
      expect(store.emailVerificationTokens[0].usedAt).toBeNull();
    });

    it('garbled and empty tokens are invalid', async () => {
      const u = addUser();
      await svc.issueToken(u.id);
      expect(await svc.verifyToken('garbage')).toEqual({ status: 'invalid' });
      expect(await svc.verifyToken('')).toEqual({ status: 'invalid' });
      expect(findUser(u.id).emailVerifiedAt).toBeNull();
    });

    it('token with pendingEmail fails closed with no state change', async () => {
      const u = addUser();
      const raw = await svc.issueToken(u.id, 'new@example.com');
      expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
      expect(findUser(u.id).emailVerifiedAt).toBeNull();
      expect(store.emailVerificationTokens[0].usedAt).toBeNull();
    });

    it('used and expired token is invalid, not already_verified', async () => {
      const u = addUser({ emailVerifiedAt: new Date() });
      const raw = await svc.issueToken(u.id);
      Object.assign(store.emailVerificationTokens[0], { usedAt: new Date(), expiresAt: new Date(Date.now() - 1000) });
      expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
    });

    it('a failing user update inside the transaction propagates the error', async () => {
      const u = addUser();
      const raw = await svc.issueToken(u.id);
      prisma.user.update.mockImplementationOnce(() => {
        throw new Error('db down');
      });
      await expect(svc.verifyToken(raw)).rejects.toThrow('db down');
    });

    it('used token for a user who is not verified is invalid', async () => {
      const u = addUser();
      const raw = await svc.issueToken(u.id);
      store.emailVerificationTokens[0].usedAt = new Date();
      expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
    });
  });

  describe('onSignup', () => {
    it('first user is stored verified and never gated', async () => {
      const u = addUser({ emailVerificationRequired: false });
      expect(await svc.onSignup(u as any, { isFirstUser: true })).toEqual({
        verificationRequired: false,
        emailSent: false,
      });
      expect(findUser(u.id).emailVerifiedAt).toBeInstanceOf(Date);
      expect(findUser(u.id).emailVerificationRequired).toBe(false);
      expect(send).not.toHaveBeenCalled();
    });

    it('unconfigured email leaves the account ungated', async () => {
      configured.mockResolvedValue(false);
      const u = addUser({ emailVerificationRequired: false });
      expect(await svc.onSignup(u as any, { isFirstUser: false })).toEqual({
        verificationRequired: false,
        emailSent: false,
      });
      expect(findUser(u.id).emailVerificationRequired).toBe(false);
      expect(send).not.toHaveBeenCalled();
    });

    it('configured gates the account and sends', async () => {
      const u = addUser({ emailVerificationRequired: false });
      expect(await svc.onSignup(u as any, { isFirstUser: false })).toEqual({
        verificationRequired: true,
        emailSent: true,
      });
      expect(findUser(u.id).emailVerificationRequired).toBe(true);
      expect(send).toHaveBeenCalledTimes(1);
    });

    it('stays gated with emailSent false when the send fails', async () => {
      send.mockResolvedValue({ success: false } as any);
      const u = addUser({ emailVerificationRequired: false });
      expect(await svc.onSignup(u as any, { isFirstUser: false })).toEqual({
        verificationRequired: true,
        emailSent: false,
      });
    });
  });

  describe('releaseUnverifiedAddress', () => {
    it('deletes a gated account whose last mail was 2 hours ago', async () => {
      const u = addUser({ verificationSentAt: new Date(Date.now() - 2 * HOUR) });
      expect(await svc.releaseUnverifiedAddress(u.email)).toBe(true);
      expect(findUser(u.id)).toBeUndefined();
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'unverified_account_replaced',
          targetType: 'User',
          targetId: u.id,
          userId: null,
        })
      );
    });

    it('never sent, created 2 hours ago: released', async () => {
      const u = addUser({ verificationSentAt: null, createdAt: new Date(Date.now() - 2 * HOUR) });
      expect(await svc.releaseUnverifiedAddress(u.email)).toBe(true);
      expect(findUser(u.id)).toBeUndefined();
    });

    it('never sent, created 10 minutes ago: not released', async () => {
      const u = addUser({ verificationSentAt: null, createdAt: new Date(Date.now() - 10 * MIN) });
      expect(await svc.releaseUnverifiedAddress(u.email)).toBe(false);
      expect(findUser(u.id)).toBeDefined();
    });

    it('never sent and no createdAt: releasable', async () => {
      const u = addUser({ verificationSentAt: null });
      expect(await svc.releaseUnverifiedAddress(u.email)).toBe(true);
    });

    it('lowercases and trims the address', async () => {
      const u = addUser({ email: 'case@example.com', verificationSentAt: new Date(Date.now() - 2 * HOUR) });
      expect(await svc.releaseUnverifiedAddress('  CASE@Example.com ')).toBe(true);
      expect(findUser(u.id)).toBeUndefined();
    });

    it('also clears reset tokens and other RESTRICT children', async () => {
      const u = addUser({ verificationSentAt: new Date(Date.now() - 2 * HOUR) });
      store.passwordResetTokens.push({ id: 'p1', userId: u.id, token: 't', expiresAt: new Date() });
      expect(await svc.releaseUnverifiedAddress(u.email)).toBe(true);
      expect(store.passwordResetTokens.filter((t: any) => t.userId === u.id)).toHaveLength(0);
    });

    it('returns false (no throw) when the delete hits a foreign key (P2003)', async () => {
      const u = addUser({ verificationSentAt: new Date(Date.now() - 2 * HOUR) });
      prisma.user.deleteMany.mockImplementationOnce(() => {
        throw Object.assign(new Error('fk'), { code: 'P2003' });
      });
      expect(await svc.releaseUnverifiedAddress(u.email)).toBe(false);
      expect(logAudit).not.toHaveBeenCalled();
    });

    it('uses a transaction and rethrows non-P2003 errors', async () => {
      const u = addUser({ verificationSentAt: new Date(Date.now() - 2 * HOUR) });
      expect(await svc.releaseUnverifiedAddress(u.email)).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const v = addUser({ verificationSentAt: new Date(Date.now() - 2 * HOUR) });
      prisma.user.deleteMany.mockImplementationOnce(() => {
        throw new Error('db down');
      });
      await expect(svc.releaseUnverifiedAddress(v.email)).rejects.toThrow('db down');
      expect(findUser(v.id)).toBeDefined();
    });

    it('returns false when the account got verified between check and delete', async () => {
      const u = addUser({ verificationSentAt: new Date(Date.now() - 2 * HOUR) });
      prisma.user.deleteMany.mockImplementationOnce(() => ({ count: 0 }));
      expect(await svc.releaseUnverifiedAddress(u.email)).toBe(false);
      expect(logAudit).not.toHaveBeenCalled();
    });

    it('leaves a gated account whose last mail was 10 minutes ago', async () => {
      const u = addUser({ verificationSentAt: new Date(Date.now() - 10 * MIN) });
      expect(await svc.releaseUnverifiedAddress(u.email)).toBe(false);
      expect(findUser(u.id)).toBeDefined();
      expect(TAKEOVER_GRACE_MS).toBe(HOUR);
    });

    it('leaves a verified account', async () => {
      const u = addUser({ emailVerifiedAt: new Date(), verificationSentAt: new Date(Date.now() - 2 * HOUR) });
      expect(await svc.releaseUnverifiedAddress(u.email)).toBe(false);
      expect(findUser(u.id)).toBeDefined();
    });

    it('leaves an ungated account', async () => {
      const u = addUser({ emailVerificationRequired: false });
      expect(await svc.releaseUnverifiedAddress(u.email)).toBe(false);
      expect(findUser(u.id)).toBeDefined();
    });

    it('leaves a stale gated account when email is not configured', async () => {
      configured.mockResolvedValue(false);
      const u = addUser({ verificationSentAt: new Date(Date.now() - 2 * HOUR) });
      expect(await svc.releaseUnverifiedAddress(u.email)).toBe(false);
      expect(findUser(u.id)).toBeDefined();
    });

    it('returns false for an unknown address', async () => {
      expect(await svc.releaseUnverifiedAddress('nobody@example.com')).toBe(false);
    });
  });

  describe('deleteGatedUnverifiedAccount', () => {
    it('deletes a gated unverified account and its reset tokens, without grace or config checks', async () => {
      configured.mockResolvedValue(false);
      const u = addUser({ verificationSentAt: new Date() });
      store.passwordResetTokens.push({ id: 'pd1', userId: u.id, token: 'tt', expiresAt: new Date() });
      expect(await svc.deleteGatedUnverifiedAccount(u.id)).toBe(true);
      expect(findUser(u.id)).toBeUndefined();
      expect(store.passwordResetTokens.filter((t: any) => t.userId === u.id)).toHaveLength(0);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('returns false for a verified account, an ungated account and an unknown id', async () => {
      const verified = addUser({ emailVerifiedAt: new Date() });
      const ungated = addUser({ emailVerificationRequired: false });
      expect(await svc.deleteGatedUnverifiedAccount(verified.id)).toBe(false);
      expect(await svc.deleteGatedUnverifiedAccount(ungated.id)).toBe(false);
      expect(await svc.deleteGatedUnverifiedAccount('nope')).toBe(false);
      expect(findUser(verified.id)).toBeDefined();
      expect(findUser(ungated.id)).toBeDefined();
    });

    it('rethrows non-P2003 errors', async () => {
      const u = addUser();
      prisma.user.deleteMany.mockImplementationOnce(() => {
        throw new Error('db down');
      });
      await expect(svc.deleteGatedUnverifiedAccount(u.id)).rejects.toThrow('db down');
    });
  });

  describe('resendFor', () => {
    const old = () => new Date(Date.now() - 2 * RESEND_COOLDOWN_MS);

    it('is a silent no-op for unknown, verified, ungated and unconfigured, and resolves identically', async () => {
      const verified = addUser({ emailVerifiedAt: new Date(), verificationSentAt: old() });
      const ungated = addUser({ emailVerificationRequired: false, verificationSentAt: old() });
      const results = [
        await svc.resendFor('nobody@example.com'),
        await svc.resendFor(verified.email),
        await svc.resendFor(ungated.email),
      ];
      configured.mockResolvedValue(false);
      const gated = addUser({ verificationSentAt: old() });
      results.push(await svc.resendFor(gated.email));
      expect(results).toEqual([undefined, undefined, undefined, undefined]);
      expect(send).not.toHaveBeenCalled();
      expect(store.emailVerificationTokens).toHaveLength(0);
    });

    it('sends once for a gated unverified account (address lowercased), then not inside the cooldown', async () => {
      const u = addUser({ email: 'mixed@example.com', verificationSentAt: old() });
      await svc.resendFor('MiXeD@Example.com');
      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][0]).toBe('mixed@example.com');
      await svc.resendFor('mixed@example.com');
      expect(send).toHaveBeenCalledTimes(1);
      expect(findUser(u.id).verificationSentAt.getTime()).toBeGreaterThan(Date.now() - 5000);
    });

    it('sends for a gated account that never got mail', async () => {
      const u = addUser({ verificationSentAt: null });
      await svc.resendFor(u.email);
      expect(send).toHaveBeenCalledTimes(1);
    });
  });
});

describe('prisma mock additions used by the verification service', () => {
  const client: any = new PrismaClient();

  it('user.deleteMany filters on id/gating fields (null matches missing) and throws on others', async () => {
    store.users.push({ id: 'm1', email: 'm1@x.y', emailVerificationRequired: true });
    store.users.push({ id: 'm2', email: 'm2@x.y', emailVerificationRequired: true, emailVerifiedAt: new Date() });
    expect(await client.user.deleteMany({ where: { id: 'm2', emailVerificationRequired: true, emailVerifiedAt: null } })).toEqual({ count: 0 });
    expect(await client.user.deleteMany({ where: { id: 'm1', emailVerificationRequired: true, emailVerifiedAt: null } })).toEqual({ count: 1 });
    expect(() => client.user.deleteMany({ where: { email: 'm2@x.y' } })).toThrow('unsupported filter');
    store.users = store.users.filter((u: any) => u.id !== 'm2');
  });

  it('socialAccount/notification deleteMany throw on unsupported filters', () => {
    expect(() => client.socialAccount.deleteMany({ where: { id: '1' } })).toThrow('unsupported filter');
    expect(() => client.notification.deleteMany({ where: { id: '1' } })).toThrow('unsupported filter');
  });
});

describe('EmailVerificationService.gateNewUser', () => {
  const user = { id: 'gate-1', email: 'g@example.com', name: 'G' } as any;
  let prisma: any;
  let svc: EmailVerificationService;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    store.users.length = 0;
    store.users.push({ ...user });
    prisma = new PrismaClient();
    svc = new EmailVerificationService(prisma);
    errorSpy = jest.spyOn(logger(), 'error').mockImplementation((() => logger()) as any);
  });
  afterEach(() => jest.restoreAllMocks());

  it('returns the onSignup result on success', async () => {
    jest.spyOn(svc, 'onSignup').mockResolvedValue({ verificationRequired: true, emailSent: true });
    expect(await svc.gateNewUser(user, { isFirstUser: false })).toEqual({ verificationRequired: true, emailSent: true });
    expect(store.users).toHaveLength(1);
  });

  it('onSignup throws, delete succeeds: user removed, null returned, original error logged', async () => {
    jest.spyOn(svc, 'onSignup').mockRejectedValue(new Error('write failed'));
    expect(await svc.gateNewUser(user, { isFirstUser: false })).toBeNull();
    expect(store.users).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledWith(expect.any(String), { userId: 'gate-1', error: 'write failed' });
  });

  it('onSignup AND delete throw: original error logged first, userId logged, null, no rejection', async () => {
    jest.spyOn(svc, 'onSignup').mockRejectedValue(new Error('write failed'));
    jest.spyOn(prisma.user, 'delete').mockRejectedValue(new Error('delete failed'));
    await expect(svc.gateNewUser(user, { isFirstUser: false })).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy.mock.calls[0][1]).toEqual({ userId: 'gate-1', error: 'write failed' });
    expect(errorSpy.mock.calls[1][1]).toEqual({ userId: 'gate-1', error: 'delete failed' });
  });
});
