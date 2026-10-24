import { PrismaClient, inMemoryStore } from '@prisma/client';
import { pickVerifiedEmail, resolveOAuthUser } from '../../src/services/oauth-account.service';

jest.mock('../../src/utils/audit', () => ({ logAudit: jest.fn() }));
import { logAudit } from '../../src/utils/audit';
import logger from '../../src/config/logger';

const store = inMemoryStore as any;

describe('pickVerifiedEmail', () => {
  it('prefers primary+verified over an earlier verified entry', () => {
    expect(
      pickVerifiedEmail([
        { value: 'second@x.com', verified: true, primary: false },
        { value: 'main@x.com', verified: true, primary: true },
      ]),
    ).toBe('main@x.com');
  });
  it('GitHub: unverified primary + verified secondary -> the verified secondary', () => {
    expect(
      pickVerifiedEmail([
        { value: 'main@x.com', verified: false, primary: true },
        { value: 'other@x.com', verified: true, primary: false },
      ]),
    ).toBe('other@x.com');
  });
  it('GitHub: nothing verified -> null', () => {
    expect(
      pickVerifiedEmail([
        { value: 'a@x.com', verified: false, primary: true },
        { value: 'b@x.com', verified: false },
      ]),
    ).toBeNull();
  });
  it('Google shape (verified, no primary)', () => {
    expect(pickVerifiedEmail([{ value: 'g@x.com', verified: true }])).toBe('g@x.com');
    expect(pickVerifiedEmail([{ value: 'g@x.com', verified: false }])).toBeNull();
  });
  it('an entry with no verified flag is not trusted', () => {
    expect(pickVerifiedEmail([{ value: 'g@x.com' }])).toBeNull();
  });
  it('empty or undefined -> null', () => {
    expect(pickVerifiedEmail([])).toBeNull();
    expect(pickVerifiedEmail(undefined)).toBeNull();
  });
  it('lowercases and trims', () => {
    expect(pickVerifiedEmail([{ value: '  MiXed@Case.COM ', verified: true }])).toBe('mixed@case.com');
  });
});

describe('resolveOAuthUser', () => {
  let prisma: any;
  const input = (over: Record<string, unknown> = {}) => ({
    provider: 'google' as any,
    providerId: 'g-123',
    email: 'victim@example.com',
    displayName: 'Vic Tim',
    profileData: JSON.stringify({ id: 'g-123' }),
    ...over,
  });
  const addUser = (over: Record<string, unknown> = {}) => {
    const u = {
      id: `oa-${store.users.length + 1}`,
      email: 'victim@example.com',
      name: 'Attacker',
      passwordHash: 'attacker-hash',
      emailVerifiedAt: null,
      emailVerificationRequired: false,
      ...over,
    };
    store.users.push(u);
    return u;
  };
  const find = (id: string) => store.users.find((u: any) => u.id === id);

  beforeEach(() => {
    store.users = [];
    (logAudit as jest.Mock).mockClear();
    prisma = new PrismaClient(); // creates store.socialAccounts if missing
    store.socialAccounts = [];
  });

  it('creates a verified, passwordless user and a social account when none exists', async () => {
    const user = await resolveOAuthUser(prisma, input());
    expect(user.email).toBe('victim@example.com');
    expect(user.passwordHash).toBeNull();
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(store.socialAccounts).toHaveLength(1);
    expect(store.socialAccounts[0]).toMatchObject({ userId: user.id, provider: 'google', providerId: 'g-123' });
    expect(logAudit).not.toHaveBeenCalled();
  });

  it('links an already verified user and leaves it untouched', async () => {
    const when = new Date('2025-01-01');
    const u = addUser({ emailVerifiedAt: when, emailVerificationRequired: true });
    const user = await resolveOAuthUser(prisma, input());
    expect(user.id).toBe(u.id);
    expect(find(u.id)).toMatchObject({ passwordHash: 'attacker-hash', emailVerifiedAt: when });
    expect(store.socialAccounts).toHaveLength(1);
    expect(logAudit).not.toHaveBeenCalled();
  });

  it('gated unverified user: linked, verified, password cleared, audited without secrets', async () => {
    const u = addUser({ emailVerificationRequired: true });
    const user = await resolveOAuthUser(prisma, input());
    expect(user.id).toBe(u.id);
    expect(find(u.id).passwordHash).toBeNull();
    expect(find(u.id).emailVerifiedAt).toBeInstanceOf(Date);
    expect(store.socialAccounts).toHaveLength(1);
    const actions = (logAudit as jest.Mock).mock.calls.map((c) => c[0].action);
    expect(actions).toEqual(['oauth_linked_unverified_account', 'oauth_password_cleared']);
    expect(JSON.stringify((logAudit as jest.Mock).mock.calls)).not.toMatch(/attacker-hash|g-123/);
  });

  it('old ungated unverified user: linked, verified, password kept', async () => {
    const u = addUser({ emailVerificationRequired: false });
    await resolveOAuthUser(prisma, input());
    expect(find(u.id).passwordHash).toBe('attacker-hash');
    expect(find(u.id).emailVerifiedAt).toBeInstanceOf(Date);
    expect(store.socialAccounts).toHaveLength(1);
    const actions = (logAudit as jest.Mock).mock.calls.map((c) => c[0].action);
    expect(actions).toEqual(['oauth_linked_unverified_account']);
  });

  it('updates an existing social account for the provider instead of duplicating', async () => {
    const u = addUser({ emailVerifiedAt: new Date() });
    store.socialAccounts.push({ id: 'sa-x', userId: u.id, provider: 'google', providerId: 'g-123', providerName: 'Old' });
    await resolveOAuthUser(prisma, input({ displayName: 'New Name', profileData: '{"n":1}' }));
    expect(store.socialAccounts).toHaveLength(1);
    expect(store.socialAccounts[0]).toMatchObject({ providerName: 'New Name', profileData: '{"n":1}' });
  });

  it('race: email changed after the lookup -> user is not verified and not linked, retry resolves to a new user', async () => {
    const u = addUser({ emailVerificationRequired: true });
    const real = prisma.user.findUnique.getMockImplementation();
    let first = true;
    prisma.user.findUnique.mockImplementation((args: any) => {
      const found = real(args);
      if (first && found) {
        first = false;
        store.users.find((x: any) => x.id === u.id).email = 'changed@example.com'; // changes under us
      }
      return found;
    });
    const user = await resolveOAuthUser(prisma, input());
    expect(find(u.id)).toMatchObject({ email: 'changed@example.com', emailVerifiedAt: null, passwordHash: 'attacker-hash' });
    expect(store.socialAccounts.every((s: any) => s.userId !== u.id)).toBe(true);
    expect(user.id).not.toBe(u.id);
    expect(user.email).toBe('victim@example.com');
  });

  it('race that keeps happening fails the sign-in instead of looping', async () => {
    const u = addUser({ emailVerificationRequired: true });
    prisma.user.updateMany.mockImplementation(() => ({ count: 0 }));
    await expect(resolveOAuthUser(prisma, input())).rejects.toThrow(/try again/i);
    expect(prisma.user.updateMany).toHaveBeenCalledTimes(2);
    expect(find(u.id).emailVerifiedAt).toBeNull();
    expect(store.socialAccounts).toHaveLength(0);
  });

  it('a failing audit write does not fail the sign-in and is logged without secrets', async () => {
    const u = addUser({ emailVerificationRequired: true });
    (logAudit as jest.Mock).mockRejectedValue(new Error('audit down'));
    const errSpy = jest.spyOn(logger(), 'error').mockImplementation((() => logger()) as any);
    const user = await resolveOAuthUser(prisma, input());
    expect(user.id).toBe(u.id);
    expect(find(u.id).emailVerifiedAt).toBeInstanceOf(Date);
    expect(find(u.id).passwordHash).toBeNull();
    expect(store.socialAccounts).toHaveLength(1);
    expect(errSpy).toHaveBeenCalledWith(expect.any(String), 'audit down');
    errSpy.mockRestore();
    (logAudit as jest.Mock).mockReset();
  });

  it('keeps the other provider social account when linking this one', async () => {
    const u = addUser({ emailVerifiedAt: new Date() });
    store.socialAccounts.push({ id: 'sa-gh', userId: u.id, provider: 'github', providerId: 'gh-1' });
    await resolveOAuthUser(prisma, input());
    expect(store.socialAccounts.map((s: any) => s.provider).sort()).toEqual(['github', 'google']);
  });

  it('concurrent first sign-in: user.create P2002 retries and links into the row created meanwhile', async () => {
    const real = prisma.user.create.getMockImplementation();
    let first = true;
    prisma.user.create.mockImplementation((args: any) => {
      if (first) {
        first = false;
        store.users.push({ id: 'winner', email: 'victim@example.com', name: 'W', passwordHash: null, emailVerifiedAt: new Date() });
      }
      return real(args); // throws P2002 because the winner row now exists
    });
    const user = await resolveOAuthUser(prisma, input());
    expect(user.id).toBe('winner');
    expect(store.users.filter((x: any) => x.email === 'victim@example.com')).toHaveLength(1);
    expect(store.socialAccounts).toHaveLength(1);
  });

  it('provider id already linked to another user: friendly error, no retry', async () => {
    const other = addUser({ email: 'other@example.com', emailVerifiedAt: new Date() });
    addUser({ emailVerifiedAt: new Date() });
    store.socialAccounts.push({ id: 'sa-o', userId: other.id, provider: 'google', providerId: 'g-123' });
    await expect(resolveOAuthUser(prisma, input())).rejects.toThrow('Sign-in could not be completed, please try again.');
    expect(prisma.socialAccount.create).toHaveBeenCalledTimes(1);
  });
});
