import { UnifiedRBACService } from '../../src/services/unified-rbac.service';

// Mock Prisma client interface used inside service with minimal methods
class MockPrisma {
  public userRole = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  } as any;
  public event = {
    findUnique: jest.fn(),
  } as any;
  public unifiedRole = {
    findUnique: jest.fn(),
  } as any;
}

describe('UnifiedRBACService.hasEventRole (explicit event roles only, no org-admin inheritance)', () => {
  let prisma: MockPrisma;
  let service: UnifiedRBACService;

  beforeEach(() => {
    prisma = new MockPrisma();
    service = new UnifiedRBACService(prisma as any);
  });

  test('returns true for system_admin (system scope)', async () => {
    prisma.userRole.findMany.mockResolvedValue([
      { scopeType: 'system', scopeId: 'SYSTEM', role: { name: 'system_admin' } },
    ]);
    const allowed = await service.hasEventRole('user-1', 'event-1', ['event_admin']);
    expect(allowed).toBe(true);
  });

  test('returns true when user has direct event role', async () => {
    prisma.userRole.findMany.mockResolvedValue([
      { scopeType: 'event', scopeId: 'event-1', role: { name: 'event_admin' } },
    ]);
    const allowed = await service.hasEventRole('user-1', 'event-1', ['event_admin']);
    expect(allowed).toBe(true);
  });

  test('returns false when user has org_admin but no direct event role', async () => {
    prisma.userRole.findMany.mockResolvedValue([
      { scopeType: 'organization', scopeId: 'org-1', role: { name: 'org_admin' } },
    ]);
    const allowed = await service.hasEventRole('user-1', 'event-1', ['event_admin']);
    expect(allowed).toBe(false);
  });

  test('returns false when user has no relevant roles', async () => {
    prisma.userRole.findMany.mockResolvedValue([
      { scopeType: 'organization', scopeId: 'org-1', role: { name: 'org_viewer' } },
    ]);
    const allowed = await service.hasEventRole('user-1', 'event-1', ['event_admin']);
    expect(allowed).toBe(false);
  });
});


