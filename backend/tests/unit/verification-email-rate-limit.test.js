// The limiter is skipped under NODE_ENV=test, so load it as production on a throwaway app.
const express = require('express');
const request = require('supertest');

test('verificationEmailRateLimit allows 5 requests per window per IP, then 429', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  let limiter;
  jest.isolateModules(() => {
    ({ verificationEmailRateLimit: limiter } = require('../../src/middleware/rate-limit'));
  });
  const app = express();
  app.post('/x', limiter, (req, res) => res.json({ ok: true }));
  let res;
  try {
    // shouldSkipRateLimit reads NODE_ENV per request, so stay in production until done.
    for (let i = 0; i < 5; i++) expect((await request(app).post('/x')).status).toBe(200);
    res = await request(app).post('/x');
  } finally {
    process.env.NODE_ENV = prev;
  }
  expect(res.status).toBe(429);
  expect(res.body.message).toMatch(/verification email/i);
});

test('the route applies verificationEmailRateLimit', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../../src/routes/user.routes.ts'), 'utf8');
  expect(src).toMatch(/'\/me\/verification-email', requireAuth, verificationEmailRateLimit/);
});
