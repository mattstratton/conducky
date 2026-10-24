/**
 * Seed and maintenance scripts run outside the TypeScript build and mostly
 * outside tests, so nothing notices when a model they use is removed from the
 * schema. `sample-data` crashed on a removed `organizationMembership` model
 * for months. This checks that every `prisma.<model>` the scripts touch still
 * exists in schema.prisma.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const schema = fs.readFileSync(path.join(root, 'prisma', 'schema.prisma'), 'utf8');
const models = new Set(
  [...schema.matchAll(/^model (\w+)/gm)].map(([, name]) => name[0].toLowerCase() + name.slice(1)),
);

// Legacy scripts that still use models removed from the schema (`role`,
// `userEventRole`, `report`, ...). Delete or fix them, then drop them from this list.
const knownBroken = ['prisma/seed.js', 'prisma/roles-seed.js', 'scripts/cleanup-user.js'];

const scriptFiles = ['prisma', 'scripts']
  .flatMap((dir) =>
    fs
      .readdirSync(path.join(root, dir))
      .filter((file) => file.endsWith('.js') && file !== 'db.js')
      .map((file) => `${dir}/${file}`),
  )
  .filter((file) => !knownBroken.includes(file));

describe('seed and maintenance scripts', () => {
  test('the schema has models to check against', () => {
    expect(models.has('user')).toBe(true);
    expect(models.has('userRole')).toBe(true);
  });

  test.each(scriptFiles)('%s only uses models that exist in the schema', (file) => {
    const source = fs.readFileSync(path.join(root, ...file.split('/')), 'utf8');
    const used = new Set([...source.matchAll(/\bprisma\.([a-z]\w*)\./g)].map(([, name]) => name));
    const missing = [...used].filter((name) => !models.has(name));
    expect(missing).toEqual([]);
  });
});
