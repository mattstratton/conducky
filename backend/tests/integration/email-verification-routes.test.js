/**
 * Integration tests for verify-email, resend-verification and correct-email.
 */
const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../../index');
const { inMemoryStore } = require('@prisma/client');
const { logAudit } = require('../../src/utils/audit');
const { emailService } = require('../../src/utils/email');
const { hashToken } = require('../../src/services/email-verification.service');

jest.mock('../../src/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
}));

const PASSWORD = 'password123';
const flush = () => new Promise((r) => setImmediate(r));
const HOUR = 60 * 60 * 1000;
let passwordHash;
let sendSpy;

const addUser = (over) => {
  const u = {
    id: 'gated-1',
    email: 'foo@example.com',
    name: 'Foo',
    passwordHash,
    emailVerificationRequired: true,
    emailVerifiedAt: null,
    verificationSentAt: new Date(Date.now() - 2 * HOUR),
    createdAt: new Date(Date.now() - 3 * HOUR),
    ...over,
  };
  inMemoryStore.users.push(u);
  return u;
};
const find = (id) => inMemoryStore.users.find((u) => u.id === id);
const addToken = (raw, userId, over) =>
  inMemoryStore.emailVerificationTokens.push({
    id: `t-${raw}`,
    userId,
    tokenHash: hashToken(raw),
    pendingEmail: null,
    usedAt: null,
    expiresAt: new Date(Date.now() + HOUR),
    createdAt: new Date(),
    ...over,
  });

beforeAll(async () => {
  passwordHash = await bcrypt.hash(PASSWORD, 4);
});

beforeEach(() => {
  inMemoryStore.users.length = 1;
  inMemoryStore.emailVerificationTokens = [];
  inMemoryStore.auditLogs.length = 0;
  jest.clearAllMocks();
  jest.spyOn(emailService, 'isConfigured').mockResolvedValue(true);
  sendSpy = jest.spyOn(emailService, 'sendVerificationEmail').mockResolvedValue({ success: true });
});

afterEach(() => jest.restoreAllMocks());

describe('POST /api/auth/verify-email', () => {
  test('good token verifies, a second click is already_verified', async () => {
    addUser();
    addToken('goodtoken', 'gated-1');
    const res = await request(app).post('/api/auth/verify-email').send({ token: 'goodtoken' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'verified' });
    expect(find('gated-1').emailVerifiedAt).toBeTruthy();

    const again = await request(app).post('/api/auth/verify-email').send({ token: 'goodtoken' });
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ status: 'already_verified' });
  });

  test.each([[{ token: 'garbage' }], [{}], [{ token: 12345 }], [{ token: { $ne: 1 } }]])(
    'bad input %j -> 400, no state change',
    async (body) => {
      addUser();
      const res = await request(app).post('/api/auth/verify-email').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
      expect(find('gated-1').emailVerifiedAt).toBeNull();
    }
  );
});

describe('POST /api/auth/resend-verification', () => {
  test('gated account gets one mail; unknown address gets identical body and no mail', async () => {
    addUser();
    const ok = await request(app).post('/api/auth/resend-verification').send({ email: 'Foo@Example.com' });
    await flush();
    expect(ok.status).toBe(200);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy.mock.calls[0][0]).toBe('foo@example.com');

    sendSpy.mockClear();
    const unknown = await request(app).post('/api/auth/resend-verification').send({ email: 'nobody@example.com' });
    await flush();
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(ok.body);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  test('cooldown and malformed input give the same 200 body', async () => {
    addUser({ verificationSentAt: new Date() });
    const a = await request(app).post('/api/auth/resend-verification').send({ email: 'foo@example.com' });
    const b = await request(app).post('/api/auth/resend-verification').send({});
    await flush();
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(b.body).toEqual(a.body);
    expect(sendSpy).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/correct-email', () => {
  const send = (body) => request(app).post('/api/auth/correct-email').send({ password: PASSWORD, ...body });

  test('case-variant addresses resolve the same account; mail goes to the new address; no token leaks', async () => {
    addUser();
    const res = await send({ email: 'FOO@example.com', newEmail: 'New@Example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: 'new@example.com', verificationEmailSent: true });
    expect(find('gated-1').email).toBe('new@example.com');
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy.mock.calls[0][0]).toBe('new@example.com');
    const raw = sendSpy.mock.calls[0][2];
    expect(JSON.stringify(res.body)).not.toContain(raw);
    expect(JSON.stringify(logAudit.mock.calls)).not.toContain(raw);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'verification_email_corrected', userId: 'gated-1' })
    );

    const mixed = await send({ email: 'New@EXAMPLE.com', newEmail: 'third@example.com' });
    expect(mixed.status).toBe(200);
    expect(find('gated-1').email).toBe('third@example.com');
  });

  test('wrong password and unknown account give the identical 401', async () => {
    addUser();
    addUser({ id: 'stale-1', email: 'x@example.com' });
    const wrong = await send({ email: 'foo@example.com', password: 'nope-nope', newEmail: 'x@example.com' });
    const unknown = await send({ email: 'ghost@example.com', newEmail: 'x@example.com' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual({ error: 'Invalid email or password.' });
    expect(unknown.body).toEqual(wrong.body);
    expect(find('gated-1').email).toBe('foo@example.com');
    expect(find('stale-1')).toBeTruthy();
    expect(sendSpy).not.toHaveBeenCalled();
    expect(inMemoryStore.emailVerificationTokens).toHaveLength(0);
  });

  test('verified or ungated account, or unconfigured email -> 400', async () => {
    addUser({ emailVerifiedAt: new Date() });
    expect((await send({ email: 'foo@example.com', newEmail: 'x@example.com' })).status).toBe(400);
    find('gated-1').emailVerifiedAt = null;
    find('gated-1').emailVerificationRequired = false;
    expect((await send({ email: 'foo@example.com', newEmail: 'x@example.com' })).status).toBe(400);
    find('gated-1').emailVerificationRequired = true;
    emailService.isConfigured.mockResolvedValue(false);
    expect((await send({ email: 'foo@example.com', newEmail: 'x@example.com' })).status).toBe(400);
    expect(find('gated-1').email).toBe('foo@example.com');
  });

  test('invalid newEmail -> 400 and nothing deleted, even if a stale gated holder exists', async () => {
    addUser();
    addUser({ id: 'stale-1', email: 'stale@example.com' });
    const before = inMemoryStore.users.length;
    for (const newEmail of ['not-an-email', '', undefined]) {
      const res = await send({ email: 'foo@example.com', newEmail });
      expect(res.status).toBe(400);
    }
    expect(inMemoryStore.users.length).toBe(before);
    expect(find('gated-1').email).toBe('foo@example.com');
  });

  test('target held by a verified account -> 409, nothing changed', async () => {
    addUser();
    addUser({ id: 'ver-1', email: 'taken@example.com', emailVerifiedAt: new Date() });
    const res = await send({ email: 'foo@example.com', newEmail: 'taken@example.com' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Email already registered.' });
    expect(find('ver-1')).toBeTruthy();
    expect(find('gated-1').email).toBe('foo@example.com');
    expect(sendSpy).not.toHaveBeenCalled();
  });

  test('target held by a fresh gated account -> 409', async () => {
    addUser();
    addUser({
      id: 'fresh-1',
      email: 'fresh@example.com',
      verificationSentAt: new Date(Date.now() - 10 * 60 * 1000),
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
    });
    const res = await send({ email: 'foo@example.com', newEmail: 'fresh@example.com' });
    expect(res.status).toBe(409);
    expect(find('fresh-1')).toBeTruthy();
    expect(find('gated-1').email).toBe('foo@example.com');
  });

  test('target held by a stale gated account -> released and the change succeeds', async () => {
    addUser();
    addUser({ id: 'stale-1', email: 'stale@example.com' });
    const res = await send({ email: 'foo@example.com', newEmail: 'stale@example.com' });
    expect(res.status).toBe(200);
    expect(find('stale-1')).toBeUndefined();
    expect(find('gated-1').email).toBe('stale@example.com');
  });

  test('newEmail equal to current behaves like a resend', async () => {
    addUser();
    const res = await send({ email: 'foo@example.com', newEmail: 'FOO@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: 'foo@example.com', verificationEmailSent: true });
    expect(find('gated-1').email).toBe('foo@example.com');
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy.mock.calls[0][0]).toBe('foo@example.com');
  });

  test('the old token stops working after a correction', async () => {
    addUser();
    addToken('oldtoken', 'gated-1');
    expect((await send({ email: 'foo@example.com', newEmail: 'new@example.com' })).status).toBe(200);
    const res = await request(app).post('/api/auth/verify-email').send({ token: 'oldtoken' });
    expect(res.status).toBe(400);
    expect(find('gated-1').emailVerifiedAt).toBeNull();
  });

  test('verified mid-request (race) -> 400 and the email does not change', async () => {
    addUser();
    emailService.isConfigured.mockImplementation(async () => {
      find('gated-1').emailVerifiedAt = new Date();
      return true;
    });
    const res = await send({ email: 'foo@example.com', newEmail: 'new@example.com' });
    expect(res.status).toBe(400);
    expect(find('gated-1').email).toBe('foo@example.com');
    expect(sendSpy).not.toHaveBeenCalled();
  });

  test('array and object bodies are rejected without crashing', async () => {
    addUser();
    expect((await request(app).post('/api/auth/correct-email').send([1, 2])).status).toBe(400);
    expect(
      (await request(app).post('/api/auth/correct-email').send({ email: { a: 1 }, password: [], newEmail: {} })).status
    ).toBe(400);
    const r1 = await request(app).post('/api/auth/resend-verification').send([1, 2]);
    const r2 = await request(app).post('/api/auth/resend-verification').send({ email: { $ne: 1 } });
    await flush();
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r2.body).toEqual(r1.body);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  test('a throwing audit still returns the success response', async () => {
    addUser();
    logAudit.mockRejectedValueOnce(new Error('audit down'));
    const res = await send({ email: 'foo@example.com', newEmail: 'new@example.com' });
    expect(res.status).toBe(200);
    expect(find('gated-1').email).toBe('new@example.com');
  });
});
