const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', '..', 'prisma', 'migrations');

describe('email verification migration', () => {
  const dir = fs.readdirSync(migrationsDir).find((d) => d.endsWith('_email_verification'));

  test('migration directory exists', () => {
    expect(dir).toBeDefined();
  });

  test('adds the columns and table, and vouches for social-only users', () => {
    // Prisma pads and orders the multi-column ALTER, so collapse whitespace and match the column on its own.
    const sql = fs.readFileSync(path.join(migrationsDir, dir, 'migration.sql'), 'utf8').replace(/\s+/g, ' ');
    expect(sql).toContain('ALTER TABLE "User" ADD COLUMN');
    expect(sql).toContain('ADD COLUMN "emailVerifiedAt"');
    expect(sql).toContain('CREATE TABLE "EmailVerificationToken"');
    expect(sql).toContain('UPDATE "User" SET "emailVerifiedAt" = NOW() WHERE "passwordHash" IS NULL');
  });
});

describe('email verification token email migration', () => {
  test('adds a nullable email column to the token table', () => {
    const dir = fs.readdirSync(migrationsDir).find((d) => d.endsWith('_email_verification_token_email'));
    expect(dir).toBeDefined();
    const sql = fs.readFileSync(path.join(migrationsDir, dir, 'migration.sql'), 'utf8').replace(/\s+/g, ' ');
    expect(sql).toContain('ALTER TABLE "EmailVerificationToken" ADD COLUMN "email" TEXT');
    expect(sql).not.toContain('NOT NULL');
  });
});
