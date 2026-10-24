const fs = require('fs');
const path = require('path');

// Seeded users must be pre-verified, or a dev with real email configured can't sign in.
describe.each(['seed.js', 'sample-data-seed.js', 'org-seed.js'])('prisma/%s', (script) => {
  test('every user.upsert sets emailVerifiedAt', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'prisma', script), 'utf8');
    const upserts = src.match(/user\.upsert\(/g) || [];
    const verified = src.match(/emailVerifiedAt/g) || [];
    expect(upserts.length).toBeGreaterThan(0);
    expect(verified.length).toBe(upserts.length);
  });
});
