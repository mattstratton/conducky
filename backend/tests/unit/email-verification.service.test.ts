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
      const raw = await svc.issueToken(u.id, u.email);
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
      await svc.issueToken(a.id, a.email);
      await svc.issueToken(b.id, b.email);
      await svc.issueToken(a.id, a.email);
      expect(store.emailVerificationTokens.filter((t: any) => t.userId === a.id)).toHaveLength(1);
      expect(store.emailVerificationTokens.filter((t: any) => t.userId === b.id)).toHaveLength(1);
    });

    it('stores pendingEmail when given', async () => {
      const u = addUser();
      await svc.issueToken(u.id, u.email, 'new@example.com');
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

    it('still returns true when the audit write fails after a successful send', async () => {
      (logAudit as jest.Mock).mockRejectedValueOnce(new Error('audit down'));
      const u = addUser();
      expect(await svc.sendVerification(u)).toBe(true);
      expect(send).toHaveBeenCalledTimes(1);
      expect(findUser(u.id).verificationSentAt).toBeInstanceOf(Date);
    });

    it('issues no token and sends nothing when the mailer is not configured', async () => {
      configured.mockResolvedValue(false);
      const u = addUser();
      expect(await svc.sendVerification(u)).toBe(false);
      expect(store.emailVerificationTokens).toHaveLength(0);
      expect(send).not.toHaveBeenCalled();
      expect(findUser(u.id).verificationSentAt).toBeNull();
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
      const raw = await svc.issueToken(u.id, u.email);
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
      const raw = await svc.issueToken(u.id, u.email);
      await svc.verifyToken(raw);
      expect(await svc.verifyToken(raw)).toEqual({ status: 'already_verified' });
    });

    it('a used token bound to an address the verified user no longer has is invalid', async () => {
      const u = addUser();
      const raw = await svc.issueToken(u.id, u.email);
      await svc.verifyToken(raw);
      store.users = store.users.map((x: any) => (x.id === u.id ? { ...x, email: 'moved@example.com' } : x));
      expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
    });

    it('lost claim: verified user with matching address -> already_verified', async () => {
      const u = addUser({ emailVerifiedAt: new Date() });
      const raw = await svc.issueToken(u.id, u.email);
      jest.spyOn(prisma.emailVerificationToken, 'updateMany').mockResolvedValueOnce({ count: 0 });
      expect(await svc.verifyToken(raw)).toEqual({ status: 'already_verified' });
    });

    it('lost claim: answers from a fresh read, not the pre-claim snapshot', async () => {
      const u = addUser();
      const raw = await svc.issueToken(u.id, u.email);
      jest.spyOn(prisma.emailVerificationToken, 'updateMany').mockImplementationOnce(async () => {
        // the winner commits while we wait on its row lock
        store.users = store.users.map((x: any) => (x.id === u.id ? { ...x, emailVerifiedAt: new Date() } : x));
        return { count: 0 };
      });
      expect(await svc.verifyToken(raw)).toEqual({ status: 'already_verified' });
    });

    it('lost claim: unverified user -> invalid', async () => {
      const u = addUser();
      const raw = await svc.issueToken(u.id, u.email);
      jest.spyOn(prisma.emailVerificationToken, 'updateMany').mockResolvedValueOnce({ count: 0 });
      expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
    });

    it('lost claim: verified user with a different address -> invalid', async () => {
      const u = addUser({ email: 'stale@example.com' });
      const raw = await svc.issueToken(u.id, u.email);
      const snapshot = { ...findUser(u.id) };
      store.users = store.users.map((x: any) =>
        x.id === u.id ? { ...x, email: 'victim@example.com', emailVerifiedAt: new Date() } : x
      );
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(snapshot);
      jest.spyOn(prisma.emailVerificationToken, 'updateMany').mockResolvedValueOnce({ count: 0 });
      expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
    });

    it('the database-level condition holds: address changed after the pre-check -> invalid, nothing verified', async () => {
      const u = addUser({ email: 'stale@example.com' });
      const raw = await svc.issueToken(u.id, u.email);
      const snapshot = { ...findUser(u.id) }; // what the pre-check sees
      store.users = store.users.map((x: any) => (x.id === u.id ? { ...x, email: 'victim@example.com' } : x));
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(snapshot);
      expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
      expect(findUser(u.id).emailVerifiedAt).toBeNull();
    });

    it('expired token is invalid with no state change', async () => {
      const u = addUser();
      const raw = await svc.issueToken(u.id, u.email);
      store.emailVerificationTokens[0].expiresAt = new Date(Date.now() - 1000);
      expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
      expect(findUser(u.id).emailVerifiedAt).toBeNull();
      expect(store.emailVerificationTokens[0].usedAt).toBeNull();
    });

    it('garbled and empty tokens are invalid', async () => {
      const u = addUser();
      await svc.issueToken(u.id, u.email);
      expect(await svc.verifyToken('garbage')).toEqual({ status: 'invalid' });
      expect(await svc.verifyToken('')).toEqual({ status: 'invalid' });
      expect(findUser(u.id).emailVerifiedAt).toBeNull();
    });

    describe('email change tokens (pendingEmail)', () => {
      const NEW = 'new@example.com';
      let notice: jest.SpyInstance;
      beforeEach(() => {
        notice = jest.spyOn(emailService, 'sendEmailChangedNotice').mockResolvedValue({ success: true } as any);
      });
      const setup = async (over: Record<string, unknown> = {}) => {
        const u = addUser({ emailVerifiedAt: new Date(), ...over });
        const raw = await svc.issueToken(u.id, NEW, ` ${NEW.toUpperCase()} `);
        return { u, raw };
      };

      it('normalizes pendingEmail when storing it', async () => {
        await setup();
        expect(store.emailVerificationTokens[0].pendingEmail).toBe(NEW);
      });

      it('applies the change, drops other unused tokens, notifies the old address, audits', async () => {
        const { u, raw } = await setup();
        const oldEmail = u.email;
        store.emailVerificationTokens.push({ id: 'o', userId: u.id, tokenHash: 'x', email: oldEmail, pendingEmail: null, usedAt: null });
        expect(await svc.verifyToken(raw)).toEqual({ status: 'email_changed', userId: u.id });
        expect(findUser(u.id).email).toBe(NEW);
        expect(findUser(u.id).emailVerifiedAt).toBeInstanceOf(Date);
        expect(store.emailVerificationTokens.filter((t: any) => !t.usedAt)).toHaveLength(0);
        expect(notice).toHaveBeenCalledWith(oldEmail, 'Test', 'n***@example.com');
        expect(logAudit).toHaveBeenCalledWith({ action: 'email_change_applied', targetType: 'User', targetId: u.id, userId: u.id });
      });

      it('double click -> already_verified, no second notice', async () => {
        const { raw } = await setup();
        await svc.verifyToken(raw);
        expect(await svc.verifyToken(raw)).toEqual({ status: 'already_verified' });
        expect(notice).toHaveBeenCalledTimes(1);
      });

      it('no notice when mail is not configured', async () => {
        const { raw } = await setup();
        configured.mockResolvedValue(false);
        expect((await svc.verifyToken(raw)).status).toBe('email_changed');
        expect(notice).not.toHaveBeenCalled();
      });

      it('a throwing notice does not fail the committed change', async () => {
        const { u, raw } = await setup();
        notice.mockRejectedValue(new Error('smtp'));
        expect((await svc.verifyToken(raw)).status).toBe('email_changed');
        expect(findUser(u.id).email).toBe(NEW);
      });

      it('a token whose address is not the pending one fails closed', async () => {
        const u = addUser();
        const raw = await svc.issueToken(u.id, u.email, NEW);
        expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
        expect(findUser(u.id).email).toBe(u.email);
        expect(store.emailVerificationTokens[0].usedAt).toBeNull();
      });

      it('another account owns the pending address -> invalid, address unchanged, no notice', async () => {
        const { u, raw } = await setup();
        addUser({ email: NEW });
        expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
        expect(findUser(u.id).email).toBe(u.email);
        expect(notice).not.toHaveBeenCalled();
      });

      it('conditional update guard: email changed under the transaction -> invalid, nothing changed', async () => {
        const { u, raw } = await setup();
        const snapshot = { ...findUser(u.id) };
        store.users = store.users.map((x: any) => (x.id === u.id ? { ...x, email: 'moved@example.com' } : x));
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(snapshot);
        expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
        expect(findUser(u.id).email).toBe('moved@example.com');
        expect(findUser(u.id).emailVerifiedAt).toBe(snapshot.emailVerifiedAt);
        expect(notice).not.toHaveBeenCalled();
      });

      it('P2002 on the update -> invalid, not rethrown', async () => {
        const { u, raw } = await setup();
        prisma.user.updateMany.mockImplementationOnce(() => {
          throw Object.assign(new Error('unique'), { code: 'P2002' });
        });
        expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
        expect(findUser(u.id).email).toBe(u.email);
        expect(notice).not.toHaveBeenCalled();
      });

      it('other update errors still propagate', async () => {
        const { raw } = await setup();
        prisma.user.updateMany.mockImplementationOnce(() => {
          throw new Error('db down');
        });
        await expect(svc.verifyToken(raw)).rejects.toThrow('db down');
      });

      it('an unused change token for the address the user already has is stale -> invalid', async () => {
        const { u, raw } = await setup();
        store.users = store.users.map((x: any) => (x.id === u.id ? { ...x, email: NEW } : x));
        expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
        expect(notice).not.toHaveBeenCalled();
      });

      it('expired change token is invalid', async () => {
        const { u, raw } = await setup();
        store.emailVerificationTokens[0].expiresAt = new Date(Date.now() - 1000);
        expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
        expect(findUser(u.id).email).toBe(u.email);
      });
    });

    it('used and expired token is invalid, not already_verified', async () => {
      const u = addUser({ emailVerifiedAt: new Date() });
      const raw = await svc.issueToken(u.id, u.email);
      Object.assign(store.emailVerificationTokens[0], { usedAt: new Date(), expiresAt: new Date(Date.now() - 1000) });
      expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
    });

    it('a failing user update inside the transaction propagates the error', async () => {
      const u = addUser();
      const raw = await svc.issueToken(u.id, u.email);
      prisma.user.updateMany.mockImplementationOnce(() => {
        throw new Error('db down');
      });
      await expect(svc.verifyToken(raw)).rejects.toThrow('db down');
    });

    it('stores the lowercased destination on the token', async () => {
      const u = addUser();
      await svc.issueToken(u.id, ' Mixed@Example.COM ');
      expect(store.emailVerificationTokens[0].email).toBe('mixed@example.com');
    });

    it.each([[null], ['other@example.com']])(
      'token whose email is %p (not the current address) is invalid with no state change',
      async (bound) => {
        const u = addUser();
        const raw = await svc.issueToken(u.id, u.email);
        store.emailVerificationTokens[0].email = bound;
        expect(await svc.verifyToken(raw)).toEqual({ status: 'invalid' });
        expect(findUser(u.id).emailVerifiedAt).toBeNull();
        expect(store.emailVerificationTokens[0].usedAt).toBeNull();
      }
    );

    it('compares the bound address case-insensitively', async () => {
      const u = addUser({ email: 'Mixed@Example.com' });
      const raw = await svc.issueToken(u.id, 'MIXED@example.com');
      expect((await svc.verifyToken(raw)).status).toBe('verified');
    });

    it('a token mailed to a stale address cannot verify after the address changed (same-address race)', async () => {
      const u = addUser({ email: 'a@example.com' });
      const stale = { ...findUser(u.id) }; // snapshot taken before the correction
      store.users = store.users.map((x: any) => (x.id === u.id ? { ...x, email: 'victim@example.com' } : x));
      await svc.sendVerification(stale as any);
      expect(send.mock.calls[0][0]).toBe('a@example.com');
      expect(await svc.verifyToken(lastRawToken())).toEqual({ status: 'invalid' });
      expect(findUser(u.id).emailVerifiedAt).toBeNull();
    });

    it('used token for a user who is not verified is invalid', async () => {
      const u = addUser();
      const raw = await svc.issueToken(u.id, u.email);
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

    it('never sent: releasable once account creation is past the grace window', async () => {
      const u = addUser({ verificationSentAt: null, createdAt: new Date(Date.now() - 2 * HOUR) });
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

    it('does not delete when a resend lands after the grace check but before the delete', async () => {
      const u = addUser({ verificationSentAt: new Date(Date.now() - 2 * HOUR) });
      const real = prisma.user.deleteMany.getMockImplementation();
      prisma.user.deleteMany.mockImplementationOnce((args: any) => {
        findUser(u.id).verificationSentAt = new Date(Date.now() - 10 * MIN);
        return real(args);
      });
      expect(await svc.releaseUnverifiedAddress(u.email)).toBe(false);
      expect(findUser(u.id)).toBeDefined();
      expect(logAudit).not.toHaveBeenCalled();
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

    it('deletes the verification tokens before the user row (same lock order as verify and correct)', async () => {
      const u = addUser({ verificationSentAt: new Date() });
      await svc.issueToken(u.id, u.email);
      expect(await svc.deleteGatedUnverifiedAccount(u.id)).toBe(true);
      expect(store.emailVerificationTokens.filter((t: any) => t.userId === u.id)).toHaveLength(0);
      const tokenOrder = prisma.emailVerificationToken.deleteMany.mock.invocationCallOrder;
      const userOrder = prisma.user.deleteMany.mock.invocationCallOrder;
      expect(tokenOrder.length).toBeGreaterThan(0);
      expect(Math.max(...tokenOrder.slice(-1))).toBeLessThan(userOrder[0]);
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

    describe('with lastMailBefore', () => {
      const cutoff = new Date(Date.now() - HOUR);

      // Child-row rollback is not modelled by the in-memory $transaction; the real-DB check covers it.
      it('returns false and keeps the user when the last mail is newer than the cutoff', async () => {
        const u = addUser({ verificationSentAt: new Date(Date.now() - 10 * MIN) });
        expect(await svc.deleteGatedUnverifiedAccount(u.id, { lastMailBefore: cutoff })).toBe(false);
        expect(findUser(u.id)).toBeDefined();
      });

      it('deletes when the last mail is older than the cutoff', async () => {
        const u = addUser({ verificationSentAt: new Date(Date.now() - 2 * HOUR) });
        expect(await svc.deleteGatedUnverifiedAccount(u.id, { lastMailBefore: cutoff })).toBe(true);
        expect(findUser(u.id)).toBeUndefined();
      });

      it('falls back to createdAt when no mail was ever sent', async () => {
        const old = addUser({ createdAt: new Date(Date.now() - 2 * HOUR) });
        const fresh = addUser({ createdAt: new Date(Date.now() - 10 * MIN) });
        expect(await svc.deleteGatedUnverifiedAccount(fresh.id, { lastMailBefore: cutoff })).toBe(false);
        expect(await svc.deleteGatedUnverifiedAccount(old.id, { lastMailBefore: cutoff })).toBe(true);
      });
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

describe('EmailVerificationService.correctEmail', () => {
  const bcrypt = require('bcrypt');
  let prisma: any;
  let svc: EmailVerificationService;
  let send: jest.SpyInstance;
  const find = (id: string) => store.users.find((u: any) => u.id === id);

  beforeEach(async () => {
    store.emailVerificationTokens.length = 0;
    store.users.length = 0;
    store.users.push({
      id: 'cx-1',
      email: 'a@example.com',
      name: 'A',
      passwordHash: await bcrypt.hash('pw-123456', 4),
      emailVerificationRequired: true,
      emailVerifiedAt: null,
      verificationSentAt: null,
    });
    store.emailVerificationTokens.push({
      id: 'old', userId: 'cx-1', tokenHash: hashToken('old'), email: 'a@example.com', pendingEmail: null, usedAt: null,
      expiresAt: new Date(Date.now() + HOUR),
    });
    prisma = new PrismaClient();
    svc = new EmailVerificationService(prisma);
    jest.spyOn(emailService, 'isConfigured').mockResolvedValue(true);
    send = jest.spyOn(emailService, 'sendVerificationEmail').mockResolvedValue({ success: true } as any);
  });
  afterEach(() => jest.restoreAllMocks());

  test('changes email, revokes the old token and issues a new one', async () => {
    const r = await svc.correctEmail({ email: 'A@example.com', password: 'pw-123456', newEmail: 'B@example.com' });
    expect(r).toEqual({ status: 'ok', email: 'b@example.com', verificationEmailSent: true });
    expect(find('cx-1').email).toBe('b@example.com');
    expect(store.emailVerificationTokens.find((t: any) => t.id === 'old')).toBeUndefined();
    expect(store.emailVerificationTokens).toHaveLength(1);
  });

  test('new-address branch: inside the cooldown -> cooldown, nothing changed, revoked or sent', async () => {
    find('cx-1').verificationSentAt = new Date(Date.now() - RESEND_COOLDOWN_MS / 2);
    const r = await svc.correctEmail({ email: 'a@example.com', password: 'pw-123456', newEmail: 'b@example.com' });
    expect(r).toEqual({ status: 'cooldown' });
    expect(find('cx-1').email).toBe('a@example.com');
    expect(store.emailVerificationTokens.map((t: any) => t.id)).toEqual(['old']);
    expect(send).not.toHaveBeenCalled();
  });

  test('new-address branch: after the cooldown, or with no mail ever sent, it changes the address', async () => {
    find('cx-1').verificationSentAt = new Date(Date.now() - RESEND_COOLDOWN_MS - 1000);
    expect((await svc.correctEmail({ email: 'a@example.com', password: 'pw-123456', newEmail: 'b@example.com' })).status).toBe('ok');
    find('cx-1').verificationSentAt = null;
    expect((await svc.correctEmail({ email: 'b@example.com', password: 'pw-123456', newEmail: 'c@example.com' })).status).toBe('ok');
  });

  test('a concurrent verification (gating re-check inside the transaction) leaves the email unchanged', async () => {
    (emailService.isConfigured as jest.Mock).mockImplementation(async () => {
      find('cx-1').emailVerifiedAt = new Date();
      return true;
    });
    const r = await svc.correctEmail({ email: 'a@example.com', password: 'pw-123456', newEmail: 'b@example.com' });
    expect(r.status).toBe('not_eligible');
    expect(find('cx-1').email).toBe('a@example.com');
    expect(send).not.toHaveBeenCalled();
  });

  test('old token is revoked by the transaction even when the later issuance fails', async () => {
    jest.spyOn(svc, 'sendVerification').mockResolvedValue(false);
    const r = await svc.correctEmail({ email: 'a@example.com', password: 'pw-123456', newEmail: 'b@example.com' });
    expect(r.status).toBe('ok');
    expect(store.emailVerificationTokens.find((t: any) => t.id === 'old')).toBeUndefined();
    expect(await svc.verifyToken('old')).toEqual({ status: 'invalid' });
  });

  test('gating is re-checked on emailVerificationRequired too (flipped mid-request)', async () => {
    (emailService.isConfigured as jest.Mock).mockImplementation(async () => {
      find('cx-1').emailVerificationRequired = false;
      return true;
    });
    const r = await svc.correctEmail({ email: 'a@example.com', password: 'pw-123456', newEmail: 'b@example.com' });
    expect(r.status).toBe('not_eligible');
    expect(find('cx-1').email).toBe('a@example.com');
  });

  test('same-address branch: inside the cooldown -> cooldown (not a fake "could not send"), nothing sent', async () => {
    find('cx-1').verificationSentAt = new Date(Date.now() - RESEND_COOLDOWN_MS / 2);
    const r = await svc.correctEmail({ email: 'a@example.com', password: 'pw-123456', newEmail: 'A@example.com' });
    expect(r).toEqual({ status: 'cooldown' });
    expect(send).not.toHaveBeenCalled();
  });

  test('same-address resend binds its token to the address it mails', async () => {
    const r = await svc.correctEmail({ email: 'a@example.com', password: 'pw-123456', newEmail: 'A@example.com' });
    expect(r).toEqual({ status: 'ok', email: 'a@example.com', verificationEmailSent: true });
    expect(send.mock.calls[0][0]).toBe('a@example.com');
    expect(store.emailVerificationTokens.map((t: any) => t.email)).toEqual(['a@example.com']);
  });

  test('a unique violation on the update maps to taken', async () => {
    jest.spyOn(prisma.user, 'updateMany').mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }));
    const r = await svc.correctEmail({ email: 'a@example.com', password: 'pw-123456', newEmail: 'b@example.com' });
    expect(r.status).toBe('taken');
  });

  test('a throwing audit does not turn a committed change into an error', async () => {
    (logAudit as jest.Mock).mockRejectedValueOnce(new Error('audit down'));
    const r = await svc.correctEmail({ email: 'a@example.com', password: 'pw-123456', newEmail: 'b@example.com' });
    expect(r.status).toBe('ok');
    expect(find('cx-1').email).toBe('b@example.com');
  });
});

describe('user.updateMany mock', () => {
  test('throws on unsupported filters', () => {
    const prisma: any = new PrismaClient();
    expect(() => prisma.user.updateMany({ where: { name: 'x' }, data: {} })).toThrow(/unsupported filter/);
  });
});
