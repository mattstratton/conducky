/**
 * Email change: request via PATCH /api/users/me/profile, apply via POST /api/auth/verify-email.
 */
const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../../index');
const { inMemoryStore } = require('@prisma/client');
const { logAudit } = require('../../src/utils/audit');
const { emailService, maskEmail } = require('../../src/utils/email');
const { EmailVerificationService, isGated: gatedPredicate, RESEND_COOLDOWN_MS } = require('../../src/services/email-verification.service');

jest.mock('../../src/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
}));

const HASH = bcrypt.hashSync('password123', 4);
const ID = 'chg-1';
const OLD = 'old@example.com';
const NEW = 'new@example.com';
let isConfigured, sendVerification, requestedNotice, changedNotice;

const me = () => inMemoryStore.users.find((u) => u.id === ID);
const patch = (body) => request(app).patch('/api/users/me/profile').set('x-test-user-id', ID).send(body);
const verify = (token) => request(app).post('/api/auth/verify-email').send({ token });
const lastRaw = () => sendVerification.mock.calls[sendVerification.mock.calls.length - 1][2];

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  inMemoryStore.users.length = 1;
  inMemoryStore.emailVerificationTokens = [];
  inMemoryStore.auditLogs.length = 0;
  inMemoryStore.users.push({
    id: ID, email: OLD, name: 'Changer', passwordHash: HASH,
    emailVerificationRequired: true, emailVerifiedAt: new Date(),
  });
  isConfigured = jest.spyOn(emailService, 'isConfigured').mockResolvedValue(true);
  sendVerification = jest.spyOn(emailService, 'sendVerificationEmail').mockResolvedValue({ success: true });
  requestedNotice = jest.spyOn(emailService, 'sendEmailChangeRequestedNotice').mockResolvedValue({ success: true });
  changedNotice = jest.spyOn(emailService, 'sendEmailChangedNotice').mockResolvedValue({ success: true });
});

describe('requesting an email change (mail configured)', () => {
  test('does not write the address; binds a token to the new one; mails new, notifies old with the masked address', async () => {
    const res = await patch({ name: 'Changer', email: 'New@Example.com' });
    expect(res.status).toBe(200);
    expect(res.body.emailChangePending).toBe(NEW);
    expect(res.body.verificationEmailSent).toBe(true);
    expect(res.body.user.email).toBe(OLD);
    expect(me().email).toBe(OLD);
    expect(JSON.stringify(res.body)).not.toContain(lastRaw());

    expect(inMemoryStore.emailVerificationTokens).toHaveLength(1);
    expect(inMemoryStore.emailVerificationTokens[0]).toMatchObject({ userId: ID, email: NEW, pendingEmail: NEW });

    expect(sendVerification).toHaveBeenCalledTimes(1);
    expect(sendVerification.mock.calls[0][0]).toBe(NEW);
    expect(sendVerification.mock.calls[0][3]).toEqual({ emailChange: true });

    expect(requestedNotice).toHaveBeenCalledTimes(1);
    const [to, , masked] = requestedNotice.mock.calls[0];
    expect(to).toBe(OLD);
    expect(masked).toBe(maskEmail(NEW));
    expect(masked).not.toContain(NEW);
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'email_change_requested', targetId: ID, userId: ID }));
    expect(JSON.stringify(logAudit.mock.calls)).not.toContain(lastRaw());
  });

  test('a throwing requested-notice does not fail the request', async () => {
    requestedNotice.mockRejectedValue(new Error('smtp down'));
    const res = await patch({ email: NEW });
    expect(res.status).toBe(200);
    expect(res.body.emailChangePending).toBe(NEW);
  });

  test('unchanged address and name-only update: no token, no mail', async () => {
    expect((await patch({ name: 'X', email: OLD.toUpperCase() })).status).toBe(200);
    expect((await patch({ name: 'Y' })).status).toBe(200);
    expect(inMemoryStore.emailVerificationTokens).toHaveLength(0);
    expect(sendVerification).not.toHaveBeenCalled();
    expect(requestedNotice).not.toHaveBeenCalled();
    expect(me().name).toBe('Y');
  });

  test('address owned by another account -> 409 at request time', async () => {
    inMemoryStore.users.push({ id: 'other', email: NEW, name: 'O' });
    const res = await patch({ email: 'NEW@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('This email address is already in use.');
    expect(sendVerification).not.toHaveBeenCalled();
  });
});

describe('requesting an email change (mail not configured)', () => {
  test('applies immediately, clears emailVerifiedAt, sends nothing', async () => {
    isConfigured.mockResolvedValue(false);
    const res = await patch({ email: NEW });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(NEW);
    expect(res.body.emailChangePending).toBeUndefined();
    expect(me().email).toBe(NEW);
    expect(me().emailVerifiedAt).toBeNull();
    // Not gated: an established account must never look like an abandoned signup.
    expect(me().emailVerificationRequired).toBe(false);
    expect(gatedPredicate(me())).toBe(false);
    expect(sendVerification).not.toHaveBeenCalled();
    expect(requestedNotice).not.toHaveBeenCalled();
  });

  test('revokes unused tokens: a change link mailed while mail worked cannot apply later', async () => {
    const first = await patch({ email: 'later@example.com' });
    expect(first.status).toBe(200);
    const raw = lastRaw();
    expect(inMemoryStore.emailVerificationTokens).toHaveLength(1);
    isConfigured.mockResolvedValue(false);
    const res = await patch({ email: NEW });
    expect(res.status).toBe(200);
    expect(me().email).toBe(NEW);
    expect(inMemoryStore.emailVerificationTokens).toHaveLength(0);
    const late = await verify(raw);
    expect(late.status).toBe(400);
    expect(me().email).toBe(NEW);
  });

  test('the account is not purgeable, not releasable to a registrant, and can still sign in once mail works again', async () => {
    isConfigured.mockResolvedValue(false);
    me().verificationSentAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await patch({ email: NEW });
    isConfigured.mockResolvedValue(true);
    // purgeUnverifiedAccounts selects emailVerificationRequired: true AND emailVerifiedAt: null
    expect(gatedPredicate(me())).toBe(false);
    const svc = new EmailVerificationService(new (require('@prisma/client').PrismaClient)());
    expect(await svc.releaseUnverifiedAddress(NEW)).toBe(false);
    expect(me()).toBeTruthy();
    const login = await request(app).post('/api/auth/login').send({ email: NEW, password: 'password123' });
    expect(login.status).toBe(200);
  });

  test('empty or whitespace-only address is rejected and changes nothing', async () => {
    for (const email of ['', '   ']) {
      const res = await patch({ email, name: 'Nope' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Please enter a valid email address.');
    }
    expect(me().email).toBe(OLD);
    expect(me().name).toBe('Changer');
    expect(inMemoryStore.emailVerificationTokens).toHaveLength(0);
    expect(sendVerification).not.toHaveBeenCalled();
    expect(requestedNotice).not.toHaveBeenCalled();
  });
});

describe('cooldown on repeated change requests', () => {
  const recent = () => new Date(Date.now() - RESEND_COOLDOWN_MS / 2);

  test('inside the cooldown: 429, nothing written, revoked or sent (name included)', async () => {
    await patch({ email: NEW });
    const tokensBefore = JSON.parse(JSON.stringify(inMemoryStore.emailVerificationTokens));
    sendVerification.mockClear();
    requestedNotice.mockClear();
    const res = await patch({ email: 'another@example.com', name: 'Renamed' });
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Please wait a minute before requesting another email change.');
    expect(me().name).toBe('Changer');
    expect(me().email).toBe(OLD);
    expect(JSON.parse(JSON.stringify(inMemoryStore.emailVerificationTokens))).toEqual(tokensBefore);
    expect(sendVerification).not.toHaveBeenCalled();
    expect(requestedNotice).not.toHaveBeenCalled();
  });

  test('name-only updates and the unchanged address are not subject to it', async () => {
    me().verificationSentAt = recent();
    expect((await patch({ name: 'Renamed', email: OLD })).status).toBe(200);
    expect(me().name).toBe('Renamed');
  });

  test('after the cooldown a request succeeds; a failed previous mail (null verificationSentAt) does not block', async () => {
    me().verificationSentAt = new Date(Date.now() - RESEND_COOLDOWN_MS - 1000);
    expect((await patch({ email: NEW })).status).toBe(200);
    me().verificationSentAt = null;
    expect((await patch({ email: 'third@example.com' })).status).toBe(200);
  });

  test('without mail (immediate write) there is no cooldown', async () => {
    isConfigured.mockResolvedValue(false);
    me().verificationSentAt = recent();
    expect((await patch({ email: NEW })).status).toBe(200);
    expect(me().email).toBe(NEW);
  });
});

describe('verifying an email change', () => {
  test('applies the change, notifies the OLD address, audits, drops other tokens, sign-in moves to the new address', async () => {
    await patch({ email: NEW });
    const raw = lastRaw();
    inMemoryStore.emailVerificationTokens.push({
      id: 'stale', userId: ID, tokenHash: 'stale-hash', email: OLD, pendingEmail: null,
      usedAt: null, expiresAt: new Date(Date.now() + 1000), createdAt: new Date(),
    });
    const res = await verify(raw);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('email_changed');
    expect(me().email).toBe(NEW);
    expect(me().emailVerifiedAt).toBeInstanceOf(Date);
    expect(inMemoryStore.emailVerificationTokens.filter((t) => !t.usedAt)).toHaveLength(0);
    expect(changedNotice).toHaveBeenCalledTimes(1);
    expect(changedNotice.mock.calls[0][0]).toBe(OLD);
    expect(changedNotice.mock.calls[0][2]).toBe(maskEmail(NEW));
    expect(logAudit).toHaveBeenCalledWith({ action: 'email_change_applied', targetType: 'User', targetId: ID, userId: ID });

    const ok = await request(app).post('/api/auth/login').send({ email: NEW, password: 'password123' });
    expect(ok.status).toBe(200);
    const old = await request(app).post('/api/auth/login').send({ email: OLD, password: 'password123' });
    expect(old.status).toBe(401);
  });

  test('a second click is already_verified, with no second notice or change', async () => {
    await patch({ email: NEW });
    const raw = lastRaw();
    await verify(raw);
    const again = await verify(raw);
    expect(again.status).toBe(200);
    expect(again.body.status).toBe('already_verified');
    expect(changedNotice).toHaveBeenCalledTimes(1);
    expect(me().email).toBe(NEW);
  });

  test('address taken between request and verify -> invalid, address unchanged', async () => {
    await patch({ email: NEW });
    const raw = lastRaw();
    inMemoryStore.users.push({ id: 'other', email: NEW, name: 'O' });
    const res = await verify(raw);
    expect(res.status).toBe(400);
    expect(me().email).toBe(OLD);
    expect(changedNotice).not.toHaveBeenCalled();
  });

  test('changing the address twice before verifying: only the newest link works', async () => {
    await patch({ email: 'first@example.com' });
    const first = lastRaw();
    me().verificationSentAt = new Date(Date.now() - 2 * RESEND_COOLDOWN_MS); // past the cooldown
    await patch({ email: NEW });
    const second = lastRaw();
    expect((await verify(first)).status).toBe(400);
    expect(me().email).toBe(OLD);
    expect((await verify(second)).body.status).toBe('email_changed');
    expect(me().email).toBe(NEW);
  });

  test('a throwing changed-notice does not undo the change', async () => {
    await patch({ email: NEW });
    changedNotice.mockRejectedValue(new Error('smtp down'));
    expect((await verify(lastRaw())).body.status).toBe('email_changed');
    expect(me().email).toBe(NEW);
  });
});
