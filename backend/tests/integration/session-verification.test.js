/**
 * Task 13: GET /api/session verification fields and POST /api/users/me/verification-email.
 * The test auth middleware builds a bare req.user, so the passport-style row fields come in via x-test-user-fields.
 */
const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../../index');
const { inMemoryStore } = require('@prisma/client');
const { emailService } = require('../../src/utils/email');
const { EmailVerificationService, RESEND_COOLDOWN_MS } = require('../../src/services/email-verification.service');

jest.mock('../../src/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
}));

const HASH = bcrypt.hashSync('password123', 4);
const ID = 'nudge-1';
const EMAIL = `${ID}@example.com`;
let isConfigured, sendMail;

const row = (over = {}) => ({
  id: ID, email: EMAIL, name: 'Nudge', passwordHash: HASH,
  emailVerificationRequired: false, emailVerifiedAt: null, verificationSentAt: null, ...over,
});
const addUser = (over) => { inMemoryStore.users.push(row(over)); return inMemoryStore.users[inMemoryStore.users.length - 1]; };
const as = (req, fields) => req.set('x-test-user-id', ID).set('x-test-user-fields', JSON.stringify(fields ?? {}));
const session = (fields) => as(request(app).get('/api/session'), fields);
const post = (fields) => as(request(app).post('/api/users/me/verification-email'), fields);
const rawToken = () => sendMail.mock.calls[sendMail.mock.calls.length - 1][2];

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  inMemoryStore.users.length = 1;
  inMemoryStore.emailVerificationTokens = [];
  isConfigured = jest.spyOn(emailService, 'isConfigured').mockResolvedValue(true);
  sendMail = jest.spyOn(emailService, 'sendVerificationEmail').mockResolvedValue({ success: true });
});

describe('GET /api/session verification fields', () => {
  test('unverified password user, email configured: canVerifyEmail true', async () => {
    addUser();
    const res = await session({ passwordHash: HASH, emailVerifiedAt: null });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: ID, email: EMAIL, emailVerified: false, canVerifyEmail: true });
    expect(JSON.stringify(res.body)).not.toContain(HASH);
  });

  test('verified user: emailVerified true, canVerifyEmail false, isConfigured not called', async () => {
    addUser();
    const res = await session({ passwordHash: HASH, emailVerifiedAt: new Date().toISOString() });
    expect(res.body.user).toMatchObject({ emailVerified: true, canVerifyEmail: false });
    expect(isConfigured).not.toHaveBeenCalled();
  });

  test('OAuth-only user (no password): canVerifyEmail false, isConfigured not called', async () => {
    addUser({ passwordHash: null });
    const res = await session({ passwordHash: null, emailVerifiedAt: null });
    expect(res.body.user).toMatchObject({ emailVerified: false, canVerifyEmail: false });
    expect(isConfigured).not.toHaveBeenCalled();
  });

  test('email not configured: canVerifyEmail false', async () => {
    addUser();
    isConfigured.mockResolvedValue(false);
    const res = await session({ passwordHash: HASH, emailVerifiedAt: null });
    expect(res.body.user).toMatchObject({ emailVerified: false, canVerifyEmail: false });
    expect(isConfigured).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/users/me/verification-email', () => {
  test('sends once, token bound to the current address, no token in the body', async () => {
    addUser();
    const res = await post();
    expect(res.status).toBe(200);
    expect(res.body.verificationEmailSent).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0]).toBe(EMAIL);
    expect(inMemoryStore.emailVerificationTokens).toHaveLength(1);
    expect(inMemoryStore.emailVerificationTokens[0]).toMatchObject({ userId: ID, email: EMAIL, pendingEmail: null });
    expect(res.body.email).toBe(EMAIL);
    expect(JSON.stringify(res.body)).not.toContain(rawToken());
  });

  describe('pending email change', () => {
    const pendingToken = (over = {}) => ({
      id: 'pt-1', userId: ID, tokenHash: 'h-pending', email: 'new@example.com', pendingEmail: 'new@example.com',
      usedAt: null, expiresAt: new Date(Date.now() + 3600000), ...over,
    });

    test('a live pending change token -> 409, nothing sent, the token is kept', async () => {
      addUser();
      inMemoryStore.emailVerificationTokens.push(pendingToken());
      const res = await post();
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('You have a pending email change. The link sent to your new address also verifies your account.');
      expect(sendMail).not.toHaveBeenCalled();
      expect(inMemoryStore.emailVerificationTokens.map((t) => t.id)).toEqual(['pt-1']);
    });

    test('an expired pending token does not block', async () => {
      addUser();
      inMemoryStore.emailVerificationTokens.push(pendingToken({ expiresAt: new Date(Date.now() - 1000) }));
      expect((await post()).status).toBe(200);
      expect(sendMail).toHaveBeenCalledTimes(1);
    });

    test('a plain (non-change) unused token does not block', async () => {
      addUser();
      inMemoryStore.emailVerificationTokens.push(pendingToken({ pendingEmail: null, email: EMAIL }));
      expect((await post()).status).toBe(200);
    });
  });

  test('second call inside the cooldown is 429 and sends nothing; after the cooldown it sends', async () => {
    const u = addUser();
    expect((await post()).status).toBe(200);
    const again = await post();
    expect(again.status).toBe(429);
    expect(again.body.error).toBe('Please wait a minute before requesting another verification email.');
    expect(sendMail).toHaveBeenCalledTimes(1);
    u.verificationSentAt = new Date(Date.now() - RESEND_COOLDOWN_MS - 1000);
    expect((await post()).status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  test('verified user: already_verified, nothing sent', async () => {
    addUser({ emailVerifiedAt: new Date() });
    const res = await post();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'already_verified' });
    expect(sendMail).not.toHaveBeenCalled();
  });

  test('no password: 400, nothing sent', async () => {
    addUser({ passwordHash: null });
    const res = await post();
    expect(res.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  test('email not configured: 400, nothing sent', async () => {
    addUser();
    isConfigured.mockResolvedValue(false);
    const res = await post();
    expect(res.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  test('mail failure: 200 with verificationEmailSent false', async () => {
    addUser();
    sendMail.mockResolvedValue({ success: false });
    const res = await post();
    expect(res.status).toBe(200);
    expect(res.body.verificationEmailSent).toBe(false);
  });

  test('unauthenticated is rejected', async () => {
    const res = await request(app).post('/api/users/me/verification-email').set('x-test-disable-auth', 'true');
    expect(res.status).toBe(401);
    expect(sendMail).not.toHaveBeenCalled();
  });

  test('the emailed token verifies the account (bound address matches)', async () => {
    addUser();
    await post();
    const svc = new EmailVerificationService(new (require('@prisma/client').PrismaClient)());
    expect(await svc.verifyToken(rawToken())).toEqual({ status: 'verified', userId: ID });
    expect(inMemoryStore.users.find((u) => u.id === ID).emailVerifiedAt).toBeTruthy();
  });
});
