/**
 * The dev seeds create accounts with passwords published in the README (one is
 * a System Admin), so they must refuse to run in production before touching the
 * database. No DATABASE_URL is set here: if a guard failed, the script would
 * die on the connection instead of on the guard message.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const prismaDir = path.join(__dirname, '..', '..', 'prisma');

describe.each(['seed.js', 'sample-data-seed.js'])('prisma/%s', (script) => {
  test('refuses to run when NODE_ENV=production', () => {
    const env = { ...process.env, NODE_ENV: 'production' };
    delete env.DATABASE_URL;
    const result = spawnSync('node', [path.join(prismaDir, script)], { env, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/must not run when NODE_ENV=production/);
  });
});
