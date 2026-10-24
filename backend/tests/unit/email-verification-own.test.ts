import { PrismaClient, inMemoryStore } from '@prisma/client';
import { emailService } from '../../src/utils/email';
import { EmailVerificationService, RESEND_COOLDOWN_MS } from '../../src/services/email-verification.service';

jest.mock('../../src/utils/audit', () => ({ logAudit: jest.fn() }));

const store = inMemoryStore as any;

describe('EmailVerificationService.sendOwnVerification', () => {
  let svc: EmailVerificationService;
  let configured: jest.SpyInstance;
  let send: jest.SpyInstance;
  const add = (over: Record<string, unknown> = {}) => {
    const u = { id: 'own-1', email: 'own@example.com', name: 'Own', passwordHash: 'x', emailVerificationRequired: false, emailVerifiedAt: null, verificationSentAt: null, ...over };
    store.users.push(u);
    return u;
  };

  beforeEach(() => {
    store.users.length = 0;
    store.emailVerificationTokens.length = 0;
    svc = new EmailVerificationService(new PrismaClient() as any);
    configured = jest.spyOn(emailService, 'isConfigured').mockResolvedValue(true);
    send = jest.spyOn(emailService, 'sendVerificationEmail').mockResolvedValue({ success: true } as any);
  });
  afterEach(() => jest.restoreAllMocks());

  it('sends to the current address and binds the token to it', async () => {
    add();
    expect(await svc.sendOwnVerification('own-1')).toEqual({ status: 'ok', emailSent: true, email: 'own@example.com' });
    expect(send.mock.calls[0][0]).toBe('own@example.com');
    expect(store.emailVerificationTokens[0]).toMatchObject({ email: 'own@example.com', pendingEmail: null });
  });

  it('reports emailSent false when the mail fails', async () => {
    add();
    send.mockResolvedValue({ success: false });
    expect(await svc.sendOwnVerification('own-1')).toEqual({ status: 'ok', emailSent: false, email: 'own@example.com' });
  });

  it('already_verified wins and sends nothing', async () => {
    add({ emailVerifiedAt: new Date() });
    expect(await svc.sendOwnVerification('own-1')).toEqual({ status: 'already_verified' });
    expect(send).not.toHaveBeenCalled();
  });

  it('not_eligible without a password or without configured email', async () => {
    add({ passwordHash: null });
    expect(await svc.sendOwnVerification('own-1')).toEqual({ status: 'not_eligible' });
    store.users.length = 0;
    add();
    configured.mockResolvedValue(false);
    expect(await svc.sendOwnVerification('own-1')).toEqual({ status: 'not_eligible' });
    expect(send).not.toHaveBeenCalled();
  });

  it('not_eligible for an unknown user', async () => {
    expect(await svc.sendOwnVerification('nope')).toEqual({ status: 'not_eligible' });
  });

  it('cooldown inside the window, sends after it', async () => {
    const u = add({ verificationSentAt: new Date() });
    expect(await svc.sendOwnVerification('own-1')).toEqual({ status: 'cooldown' });
    expect(send).not.toHaveBeenCalled();
    u.verificationSentAt = new Date(Date.now() - RESEND_COOLDOWN_MS - 1000);
    expect(await svc.sendOwnVerification('own-1')).toEqual({ status: 'ok', emailSent: true, email: 'own@example.com' });
  });

  it('pending_change when a live change token exists: nothing revoked, nothing sent', async () => {
    add();
    store.emailVerificationTokens.push({
      id: 't1', userId: 'own-1', tokenHash: 'h', email: 'new@example.com', pendingEmail: 'new@example.com',
      usedAt: null, expiresAt: new Date(Date.now() + 60000),
    });
    expect(await svc.sendOwnVerification('own-1')).toEqual({ status: 'pending_change' });
    expect(send).not.toHaveBeenCalled();
    expect(store.emailVerificationTokens).toHaveLength(1);
  });

  it('an expired change token does not block', async () => {
    add();
    store.emailVerificationTokens.push({
      id: 't1', userId: 'own-1', tokenHash: 'h', email: 'new@example.com', pendingEmail: 'new@example.com',
      usedAt: null, expiresAt: new Date(Date.now() - 60000),
    });
    expect(await svc.sendOwnVerification('own-1')).toEqual({ status: 'ok', emailSent: true, email: 'own@example.com' });
  });
});
