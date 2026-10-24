/**
 * Sign-in block for gated (unverified new) accounts.
 */
const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../../index');
const { inMemoryStore } = require('@prisma/client');
const { logAudit } = require('../../src/utils/audit');
const { emailService } = require('../../src/utils/email');

jest.mock('../../src/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
}));

// The hash in auth-audit.test.js does not actually match 'password123', so build a real one.
const HASH = bcrypt.hashSync('password123', 4);
let isConfigured;

function seedUser(extra) {
  inMemoryStore.users.length = 1;
  inMemoryStore.users[0] = {
    id: 'user1',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: HASH,
    ...extra,
  };
}

const login = (agent, password = 'password123') =>
  agent.post('/api/auth/login').send({ email: 'test@example.com', password });

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  isConfigured = jest.spyOn(emailService, 'isConfigured').mockResolvedValue(true);
});

describe('sign-in block for unverified gated accounts', () => {
  test('gated + unverified + configured + correct password -> 401 EMAIL_NOT_VERIFIED, no session', async () => {
    seedUser({ emailVerificationRequired: true, emailVerifiedAt: null });
    const res = await login(request(app));
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Please verify your email address to sign in.');
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
    expect(res.headers['set-cookie']).toBeUndefined();
    // The test harness overrides req.user on every request, so /session can't prove this.
    // No cookie plus no login_successful audit entry shows req.logIn never ran.
    expect(logAudit).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'login_successful' }));
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'login_failed' }));
  });

  test('wrong password on the same user -> generic message and no code', async () => {
    seedUser({ emailVerificationRequired: true, emailVerifiedAt: null });
    const res = await login(request(app), 'wrongpassword');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password.');
    expect(res.body).not.toHaveProperty('code');
  });

  test('gated but verified -> 200', async () => {
    seedUser({ emailVerificationRequired: true, emailVerifiedAt: new Date() });
    expect((await login(request(app))).status).toBe(200);
  });

  test('ungated legacy user (flags undefined) -> 200 and email service untouched', async () => {
    seedUser({});
    expect((await login(request(app))).status).toBe(200);
    expect(isConfigured).not.toHaveBeenCalled();
  });

  test('gated unverified user with email not configured -> 200', async () => {
    isConfigured.mockResolvedValue(false);
    seedUser({ emailVerificationRequired: true, emailVerifiedAt: null });
    expect((await login(request(app))).status).toBe(200);
  });
});
