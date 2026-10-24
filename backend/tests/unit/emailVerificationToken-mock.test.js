const { PrismaClient, inMemoryStore } = require('@prisma/client');

const client = new PrismaClient();
const model = client.emailVerificationToken;
const t = (n) => new Date(2030, 0, n);

const seed = () => {
  inMemoryStore.emailVerificationTokens.length = 0;
  return [
    model.create({ data: { userId: 'u1', tokenHash: 'a', expiresAt: t(1) } }),
    model.create({ data: { userId: 'u1', tokenHash: 'b', pendingEmail: 'x@y.z', expiresAt: t(5), usedAt: t(2) } }),
    model.create({ data: { userId: 'u2', tokenHash: 'c', expiresAt: t(9) } }),
  ];
};
const hashes = () => inMemoryStore.emailVerificationTokens.map((r) => r.tokenHash).sort();

describe('emailVerificationToken mock', () => {
  test('ids stay unique across create, deleteMany, create', () => {
    seed();
    model.deleteMany({ where: { userId: 'u1' } });
    model.create({ data: { userId: 'u3', tokenHash: 'd', expiresAt: t(1) } });
    model.create({ data: { userId: 'u3', tokenHash: 'e', expiresAt: t(1) } });
    const ids = inMemoryStore.emailVerificationTokens.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test.each([
    [{ userId: 'u1' }, ['c']],
    [{ id: '__first__' }, ['b', 'c']],
    [{ tokenHash: 'c' }, ['a', 'b']],
    [{ pendingEmail: 'x@y.z' }, ['a', 'c']],
    [{ usedAt: null }, ['b']],
    [{ expiresAt: { lt: t(6) } }, ['c']],
    [{ expiresAt: { gt: t(6) } }, ['a', 'b']],
    [{}, []],
  ])('deleteMany honors %j', (where, remaining) => {
    const [first] = seed();
    if (where.id === '__first__') where = { id: first.id };
    model.deleteMany({ where });
    expect(hashes()).toEqual(remaining);
  });

  test.each([
    [{ userId: 'u2' }, ['c']],
    [{ tokenHash: 'a' }, ['a']],
    [{ pendingEmail: 'x@y.z' }, ['b']],
    [{ usedAt: null }, ['a', 'c']],
    [{ expiresAt: { lt: t(6) } }, ['a', 'b']],
    [{ userId: 'u1', usedAt: null }, ['a']],
    [{}, ['a', 'b', 'c']],
  ])('updateMany honors %j', (where, touched) => {
    seed();
    model.updateMany({ where, data: { pendingEmail: 'changed' } });
    const got = inMemoryStore.emailVerificationTokens
      .filter((r) => r.pendingEmail === 'changed').map((r) => r.tokenHash).sort();
    expect(got).toEqual(touched);
  });

  test('updateMany by id touches only that row', () => {
    const [first] = seed();
    model.updateMany({ where: { id: first.id }, data: { pendingEmail: 'changed' } });
    expect(inMemoryStore.emailVerificationTokens.filter((r) => r.pendingEmail === 'changed')).toHaveLength(1);
  });

  test('unsupported filter keys throw', () => {
    seed();
    expect(() => model.deleteMany({ where: { bogus: 1 } })).toThrow(/bogus/);
    expect(() => model.updateMany({ where: { bogus: 1 }, data: {} })).toThrow(/bogus/);
    expect(() => model.deleteMany({ where: { expiresAt: { equals: t(1) } } })).toThrow(/equals/);
  });
});
