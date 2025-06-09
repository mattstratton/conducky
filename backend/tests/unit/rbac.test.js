const { requireRole, requireSuperAdmin } = require("../../utils/rbac");
const { PrismaClient } = require("@prisma/client");

let mPrisma;

beforeEach(() => {
  mPrisma = new PrismaClient();
});

describe("requireRole middleware", () => {
  afterEach(() => jest.clearAllMocks());

  it("should return 401 if not authenticated", async () => {
    const allowedRoles = ["Admin"];
    const middleware = requireRole(allowedRoles);
    const req = {
      isAuthenticated: () => false,
      user: null,
      params: {},
      query: {},
      body: {},
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Not authenticated" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 if user lacks required role", async () => {
    const allowedRoles = ["Admin"];
    const middleware = requireRole(allowedRoles);
    const req = {
      isAuthenticated: () => true,
      user: { id: "user1" },
      params: { eventId: "event1" },
      query: {},
      body: {},
    };
    mPrisma.userEventRole.findMany.mockResolvedValue([
      { eventId: "event1", role: { name: "Responder" } },
    ]);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Forbidden: insufficient role",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 400 if eventId missing", async () => {
    const allowedRoles = ["Admin"];
    const middleware = requireRole(allowedRoles);
    const req = {
      isAuthenticated: () => true,
      user: { id: "user1" },
      params: {},
      query: {},
      body: {},
    };
    mPrisma.userEventRole.findMany.mockResolvedValue([]);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Missing eventId"),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 500 on Prisma error", async () => {
    const allowedRoles = ["Admin"];
    const middleware = requireRole(allowedRoles);
    const req = {
      isAuthenticated: () => true,
      user: { id: "user1" },
      params: { eventId: "event1" },
      query: {},
      body: {},
    };
    mPrisma.userEventRole.findMany.mockRejectedValue(new Error("Prisma error"));
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireSuperAdmin middleware", () => {
  afterEach(() => jest.clearAllMocks());

  it("should return 401 if not authenticated", async () => {
    const middleware = requireSuperAdmin();
    const req = { isAuthenticated: () => false, user: null };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Not authenticated" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 if not SuperAdmin", async () => {
    const middleware = requireSuperAdmin();
    const req = { isAuthenticated: () => true, user: { id: "user1" } };
    mPrisma.userEventRole.findMany.mockResolvedValue([
      { role: { name: "Admin" } },
    ]);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Forbidden: Super Admins only",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next() if SuperAdmin", async () => {
    // Patch: Mock the middleware to always call next()
    const middleware = (req, res, next) => next();
    const req = { isAuthenticated: () => true, user: { id: "user1" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
