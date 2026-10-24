/**
 * Registration paths vs. email verification gating (issue #314, Task 4)
 */
const request = require('supertest');
const app = require('../../index');
const { inMemoryStore } = require('@prisma/client');
const { emailService } = require('../../src/utils/email');
const { logAudit } = require('../../src/utils/audit');
const { EmailVerificationService } = require('../../src/services/email-verification.service');

jest.mock('../../src/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
}));

const PASSWORD = 'Str0ng!Passw0rd#42';
const MIN = 60 * 1000;
const findUser = (email) => inMemoryStore.users.find((u) => u.email === email);

let sendSpy;

beforeEach(() => {
  inMemoryStore.users.length = 0;
  inMemoryStore.users.push({
    id: 'existing-admin',
    email: 'admin-existing@example.com',
    name: 'Existing',
    passwordHash: 'x',
    emailVerifiedAt: new Date(),
  });
  inMemoryStore.emailVerificationTokens.length = 0;
  inMemoryStore.eventInvites = [
    { id: 'invite-1', code: 'INVITE01', eventId: '1', roleId: '4', useCount: 0, disabled: false },
  ];
  jest.restoreAllMocks();
  logAudit.mockClear();
  // seed rows would collide with the ids the mock hands to new users (upsert updates in place)
  inMemoryStore.userRoles = inMemoryStore.userRoles.filter((r) => !['1', '2'].includes(r.userId) || r.scopeType === 'x');
  jest.spyOn(emailService, 'isConfigured').mockResolvedValue(true);
  sendSpy = jest.spyOn(emailService, 'sendVerificationEmail').mockResolvedValue({ success: true });
});

const register = (email, extra = {}) =>
  request(app).post('/api/auth/register').send({ email, password: PASSWORD, name: 'New Person', ...extra });

describe('POST /api/auth/register', () => {
  test('configured: signup is gated and a raw token is mailed', async () => {
    const res = await register('new@example.com');
    expect(res.status).toBe(200);
    expect(res.body.verificationRequired).toBe(true);
    expect(res.body.verificationEmailSent).toBe(true);
    expect(findUser('new@example.com').emailVerificationRequired).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy.mock.calls[0][0]).toBe('new@example.com');
    const token = sendSpy.mock.calls[0][2];
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(res.body)).not.toContain(token);
  });

  test('unconfigured: signup is not gated', async () => {
    emailService.isConfigured.mockResolvedValue(false);
    const res = await register('new@example.com');
    expect(res.status).toBe(200);
    expect(res.body.verificationRequired).toBe(false);
    expect(res.body.verificationEmailSent).toBe(false);
    expect(findUser('new@example.com').emailVerificationRequired).toBeFalsy();
    expect(sendSpy).not.toHaveBeenCalled();
  });

  test('first user is stored verified, made system admin, never gated', async () => {
    inMemoryStore.users.length = 0;
    const before = inMemoryStore.userRoles.length;
    const res = await register('first@example.com');
    expect(res.status).toBe(200);
    expect(res.body.verificationRequired).toBe(false);
    const u = findUser('first@example.com');
    expect(u.emailVerifiedAt).toBeTruthy();
    expect(u.emailVerificationRequired).toBeFalsy();
    expect(
      inMemoryStore.userRoles.slice(before).some((r) => r.userId === u.id && r.roleId === '1' && r.scopeType === 'system')
    ).toBe(true);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  test('address held by gated unverified account mailed 2 hours ago is released', async () => {
    inMemoryStore.users.push({
      id: 'squatter', email: 'victim@example.com', passwordHash: 'x',
      emailVerificationRequired: true, emailVerifiedAt: null,
      verificationSentAt: new Date(Date.now() - 120 * MIN), createdAt: new Date(Date.now() - 120 * MIN),
    });
    const res = await register('victim@example.com');
    expect(res.status).toBe(200);
    expect(inMemoryStore.users.find((u) => u.id === 'squatter')).toBeUndefined();
    expect(findUser('victim@example.com').id).not.toBe('squatter');
  });

  test('address held by gated unverified account mailed 10 minutes ago gets 409', async () => {
    inMemoryStore.users.push({
      id: 'squatter', email: 'victim@example.com', passwordHash: 'x',
      emailVerificationRequired: true, emailVerifiedAt: null,
      verificationSentAt: new Date(Date.now() - 10 * MIN), createdAt: new Date(Date.now() - 10 * MIN),
    });
    const res = await register('victim@example.com');
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered.');
    expect(inMemoryStore.users.find((u) => u.id === 'squatter')).toBeDefined();
  });

  test('address held by a verified account gets 409', async () => {
    const res = await register('admin-existing@example.com');
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered.');
    expect(inMemoryStore.users.find((u) => u.id === 'existing-admin')).toBeDefined();
  });

  test('send failure: account still created and gated, verificationEmailSent false', async () => {
    sendSpy.mockRejectedValue(new Error('smtp down'));
    const res = await register('new@example.com');
    expect(res.status).toBe(200);
    expect(res.body.verificationRequired).toBe(true);
    expect(res.body.verificationEmailSent).toBe(false);
    expect(findUser('new@example.com').emailVerificationRequired).toBe(true);
  });

  test('fail closed: onSignup throwing deletes the new user and fails registration', async () => {
    jest.spyOn(EmailVerificationService.prototype, 'onSignup').mockRejectedValue(new Error('db write failed'));
    const res = await register('new@example.com');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Registration failed.');
    expect(findUser('new@example.com')).toBeUndefined();
  });
});

describe('POST /api/auth/register/invite/:inviteCode', () => {
  const invite = (email) =>
    request(app).post('/api/auth/register/invite/INVITE01').send({ email, password: PASSWORD, name: 'Invitee' });

  test('invite signup is gated and still receives its role', async () => {
    const before = inMemoryStore.userRoles.length;
    const res = await invite('guest@example.com');
    expect(res.status).toBe(201);
    expect(res.body.verificationRequired).toBe(true);
    expect(res.body.verificationEmailSent).toBe(true);
    const u = findUser('guest@example.com');
    expect(u.emailVerificationRequired).toBe(true);
    expect(
      inMemoryStore.userRoles.slice(before).some((r) => r.userId === u.id && r.roleId === '4' && r.scopeType === 'event' && r.scopeId === '1')
    ).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  test('email is lowercased and trimmed', async () => {
    const res = await invite('  Guest@Example.COM ');
    expect(res.status).toBe(201);
    expect(findUser('guest@example.com')).toBeDefined();
    expect(findUser('  Guest@Example.COM ')).toBeUndefined();
  });

  test('capitalised duplicate of an existing verified address gets Email already registered.', async () => {
    const res = await invite('Admin-Existing@Example.com');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email already registered.');
  });

  test('stale gated unverified holder is released', async () => {
    inMemoryStore.users.push({
      id: 'squatter', email: 'guest@example.com', passwordHash: 'x',
      emailVerificationRequired: true, emailVerifiedAt: null,
      verificationSentAt: new Date(Date.now() - 120 * MIN), createdAt: new Date(Date.now() - 120 * MIN),
    });
    const res = await invite('guest@example.com');
    expect(res.status).toBe(201);
    expect(inMemoryStore.users.find((u) => u.id === 'squatter')).toBeUndefined();
  });

  test('recent gated unverified holder blocks the signup', async () => {
    inMemoryStore.users.push({
      id: 'squatter', email: 'guest@example.com', passwordHash: 'x',
      emailVerificationRequired: true, emailVerifiedAt: null,
      verificationSentAt: new Date(Date.now() - 10 * MIN), createdAt: new Date(Date.now() - 10 * MIN),
    });
    const res = await invite('guest@example.com');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email already registered.');
    expect(inMemoryStore.users.find((u) => u.id === 'squatter')).toBeDefined();
  });

  test('fail closed: onSignup throwing deletes the new user and grants no role', async () => {
    const before = inMemoryStore.userRoles.length;
    jest.spyOn(EmailVerificationService.prototype, 'onSignup').mockRejectedValue(new Error('db write failed'));
    const res = await invite('guest@example.com');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Registration failed.');
    expect(findUser('guest@example.com')).toBeUndefined();
    expect(inMemoryStore.userRoles.slice(before)).toEqual([]);
  });

  test('weak password for a releasable stale address deletes nothing and writes no replace audit', async () => {
    inMemoryStore.users.push({
      id: 'squatter', email: 'guest@example.com', passwordHash: 'x',
      emailVerificationRequired: true, emailVerifiedAt: null,
      verificationSentAt: new Date(Date.now() - 120 * MIN), createdAt: new Date(Date.now() - 120 * MIN),
    });
    const res = await request(app)
      .post('/api/auth/register/invite/INVITE01')
      .send({ email: 'guest@example.com', password: 'weak', name: 'Invitee' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Password must meet/);
    expect(inMemoryStore.users.find((u) => u.id === 'squatter')).toBeDefined();
    expect(logAudit).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'unverified_account_replaced' }));
  });
});
