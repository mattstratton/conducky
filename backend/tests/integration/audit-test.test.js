const request = require("supertest");
const app = require("../../index");
const { inMemoryStore } = require("@prisma/client");

beforeEach(() => {
  // Reset the inMemoryStore for test isolation
  inMemoryStore.events.length = 1;
  inMemoryStore.roles.length = 3;
  inMemoryStore.users.length = 1;
  inMemoryStore.userEventRoles.length = 1;
  inMemoryStore.reports.length = 1;
  inMemoryStore.auditLogs.length = 0;
});

jest.mock("../../utils/audit", () => ({
  logAudit: jest.fn().mockResolvedValue({}),
}));

describe("GET /audit-test", () => {
  it("should return 200 and a success message", async () => {
    const res = await request(app).get("/audit-test");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "Audit event logged!");
  });
});
