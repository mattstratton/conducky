const { inMemoryStore } = require("../../__mocks__/@prisma/client");
const request = require("supertest");
const app = require("../../index");

jest.mock("../../src/utils/rbac", () => ({
  requireSuperAdmin: () => (req, res, next) => {
    req.isAuthenticated = () => true;
    
    // Check if user has SuperAdmin role in any event
    const { inMemoryStore } = require("../../__mocks__/@prisma/client");
    
    // Use test user ID from header if provided, otherwise default to user 1
    const testUserId = req.headers['x-test-user-id'] || "1";
    const testUser = inMemoryStore.users.find(u => u.id === testUserId) || { id: testUserId, email: `user${testUserId}@example.com`, name: `User${testUserId}` };
    req.user = testUser;
    const isSuperAdmin = inMemoryStore.userEventRoles.some(
      (uer) => uer.userId === req.user.id && uer.role.name === "SuperAdmin"
    );
    
    if (!isSuperAdmin) {
      res.status(403).json({ error: "Forbidden: insufficient role" });
      return;
    }
    
    next();
  },
  requireRole: (allowedRoles) => (req, res, next) => {
    req.isAuthenticated = () => true;
    
    const { inMemoryStore } = require("../../__mocks__/@prisma/client");
    
    // Use test user ID from header if provided, otherwise default to user 1
    const testUserId = req.headers['x-test-user-id'] || "1";
    const testUser = inMemoryStore.users.find(u => u.id === testUserId) || { id: testUserId, email: `user${testUserId}@example.com`, name: `User${testUserId}` };
    req.user = testUser;
    
    // Get eventId from params
    let eventId = req.params.eventId || req.params.slug;
    
    // If slug is provided, resolve to eventId
    if (req.params.slug && !eventId.match(/^\d+$/)) {
      const event = inMemoryStore.events.find(e => e.slug === req.params.slug);
      if (event) {
        eventId = event.id;
      }
    }
    
    // Check for SuperAdmin role globally
    const isSuperAdmin = inMemoryStore.userEventRoles.some(
      (uer) => uer.userId === req.user.id && uer.role.name === "SuperAdmin"
    );
    
    if (allowedRoles.includes("SuperAdmin") && isSuperAdmin) {
      return next();
    }
    
    // Check for allowed roles for this specific event
    const userRoles = inMemoryStore.userEventRoles.filter(
      (uer) => uer.userId === req.user.id && uer.eventId === eventId
    );
    
    const hasRole = userRoles.some((uer) =>
      allowedRoles.includes(uer.role.name)
    );
    
    if (!hasRole) {
      res.status(403).json({ error: "Forbidden: insufficient role" });
      return;
    }
    
    next();
  },
}));

beforeEach(() => {
  // Reset inMemoryStore to a clean state for each test
  inMemoryStore.events = [{ id: "1", name: "Event1", slug: "event1" }];
  inMemoryStore.roles = [
    { id: "1", name: "SuperAdmin" },
    { id: "2", name: "Admin" },
    { id: "3", name: "Responder" },
    { id: "4", name: "Reporter" },
  ];
  inMemoryStore.users = [
    { id: "1", email: "admin@example.com", name: "Admin" },
  ];
  inMemoryStore.userEventRoles = [
    {
      userId: "1",
      eventId: "1",
      roleId: "1",
      role: { name: "SuperAdmin" },
      user: { id: "1", email: "admin@example.com", name: "Admin" },
    },
  ];
  inMemoryStore.reports = [];
  inMemoryStore.auditLogs = [];
  inMemoryStore.eventLogos = [];
  inMemoryStore.eventInvites = [];
  inMemoryStore.evidenceFiles = [];
});

describe("Event endpoints", () => {
  afterEach(() => jest.clearAllMocks());

  describe("POST /events", () => {
    it("should create an event as SuperAdmin", async () => {
      const res = await request(app)
        .post("/api/events")
        .send({ name: "Test Event", slug: "test-event" });
      console.log(
        "DEBUG: Assertion line, expecting [200, 201], got:",
        res.statusCode,
      );
      expect([200, 201]).toContain(res.statusCode);
      expect(res.body).toHaveProperty("event");
      expect(res.body.event).toHaveProperty("slug", "test-event");
    });
    it("should fail if missing fields", async () => {
      const res = await request(app).post("/api/events").send({ name: "" });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
    it("should fail if slug is invalid", async () => {
      const res = await request(app)
        .post("/api/events")
        .send({ name: "Event", slug: "Invalid Slug!" });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
    it("should fail if slug already exists", async () => {
      await request(app).post("/api/events").send({ name: "Event1", slug: "dupe" });
      const res = await request(app)
        .post("/api/events")
        .send({ name: "Event2", slug: "dupe" });
      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty("error", "Slug already exists.");
    });
  });

  describe("POST /events/:eventId/roles", () => {
    it("should assign a role to a user", async () => {
      const eventRes = await request(app)
        .post("/api/events")
        .send({ name: "Role Event", slug: "role-event" });
      const eventId = eventRes.body.event.id;
      const res = await request(app)
        .post(`/api/events/${eventId}/roles`)
        .send({ userId: "1", roleName: "Admin" });
      console.log("DEBUG: assign a role to a user, response body:", res.body);
      console.log(
        "DEBUG: assign a role to a user, expecting [200, 201], got:",
        res.statusCode,
      );
      expect([200, 201]).toContain(res.statusCode);
      expect(res.body).toHaveProperty("message", "Role assigned.");
    });
    it("should fail if missing fields", async () => {
      const eventRes = await request(app)
        .post("/api/events")
        .send({ name: "Role Event2", slug: "role-event2" });
      const eventId = eventRes.body.event.id;
      const res = await request(app).post(`/api/events/${eventId}/roles`).send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
    it("should fail if user does not exist", async () => {
      const eventRes = await request(app)
        .post("/api/events")
        .send({ name: "Role Event3", slug: "role-event3" });
      const eventId = eventRes.body.event.id;
      const res = await request(app)
        .post(`/api/events/${eventId}/roles`)
        .send({ userId: "999", roleName: "Admin" });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error", "User does not exist.");
    });
    it("should fail if role does not exist", async () => {
      const eventRes = await request(app)
        .post("/api/events")
        .send({ name: "Role Event4", slug: "role-event4" });
      const eventId = eventRes.body.event.id;
      const res = await request(app)
        .post(`/api/events/${eventId}/roles`)
        .send({ userId: "1", roleName: "NotARole" });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error", "Role does not exist.");
    });
  });

  describe("GET /events/:eventId", () => {
    it("should return event details (success)", async () => {
      const res = await request(app).get("/api/events/1");
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("event");
      expect(res.body.event).toHaveProperty("id", "1");
    });
    it("should return 404 if event not found", async () => {
      const res = await request(app).get("/api/events/999");
      expect(res.statusCode).toBe(404);
    });
    // Forbidden case is handled by RBAC middleware mock (always allows)
  });

  describe("DELETE /events/:eventId/roles", () => {
    it("should remove a role from a user (success)", async () => {
      const res = await request(app)
        .delete("/api/events/1/roles")
        .send({ userId: "1", roleName: "SuperAdmin" });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("message", "Role removed.");
    });
    it("should fail if missing fields", async () => {
      const res = await request(app).delete("/api/events/1/roles").send({});
      expect(res.statusCode).toBe(400);
    });
    it("should fail if user or role not found", async () => {
      const res = await request(app)
        .delete("/api/events/1/roles")
        .send({ userId: "999", roleName: "NotARole" });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /events/:eventId/users", () => {
    it("should list users and their roles for an event (success)", async () => {
      const res = await request(app).get("/api/events/1/users");
      console.log(
        "DEBUG: list users and their roles, response body:",
        res.body,
      );
      console.log(
        "DEBUG: list users and their roles, expecting [200, 201], got:",
        res.statusCode,
      );
      expect([200, 201]).toContain(res.statusCode);
      expect(res.body).toHaveProperty("users");
      expect(Array.isArray(res.body.users)).toBe(true);
    });
    // Not authenticated and forbidden cases are handled by RBAC mock
  });

  describe("PATCH /events/:eventId/reports/:reportId/state", () => {
    it("should update report state (success)", async () => {
      // Ensure a report exists for event 1
      inMemoryStore.reports.push({
        id: "r4",
        eventId: "1",
        type: "harassment",
        description: "Report 4",
        state: "submitted",
      });
      const res = await request(app)
        .patch("/api/events/1/reports/r4/state")
        .send({ state: "acknowledged" });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("report");
      expect(res.body.report).toHaveProperty("state", "acknowledged");
    });

    it("should return 400 if invalid state", async () => {
      inMemoryStore.reports.push({
        id: "r5",
        eventId: "1",
        type: "harassment",
        description: "Report 5",
        state: "submitted",
      });
      const res = await request(app)
        .patch("/api/events/1/reports/r5/state")
        .send({ state: "not-a-state" });
      expect(res.statusCode).toBe(400);
    });

    it("should return 404 if report not found", async () => {
      const res = await request(app)
        .patch("/api/events/1/reports/doesnotexist/state")
        .send({ state: "acknowledged" });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /events/:eventId/reports", () => {
    it("should create a report (success)", async () => {
      const res = await request(app)
        .post("/api/events/1/reports")
        .send({ type: "harassment", description: "Test report", title: "A valid report title" });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("report");
      expect(res.body.report).toHaveProperty("type", "harassment");
      expect(res.body.report).toHaveProperty("description", "Test report");
      expect(res.body.report).toHaveProperty("title", "A valid report title");
    });

    it("should fail if missing required fields", async () => {
      const res = await request(app)
        .post("/api/events/1/reports")
        .send({ type: "harassment" }); // missing description and title
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should fail if title is too short", async () => {
      const res = await request(app)
        .post("/api/events/1/reports")
        .send({ type: "harassment", description: "desc", title: "short" });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should fail if title is too long", async () => {
      const longTitle = "a".repeat(71);
      const res = await request(app)
        .post("/api/events/1/reports")
        .send({ type: "harassment", description: "desc", title: longTitle });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 404 if event not found", async () => {
      const res = await request(app)
        .post("/api/events/999/reports")
        .send({ type: "harassment", description: "Test report", title: "A valid report title" });
      expect(res.statusCode).toBe(404);
    });

    it("should create a report with evidence file upload", async () => {
      // Use proper text content that will pass validation
      const textContent = "This is a valid text file for testing evidence upload.";
      
      const res = await request(app)
        .post("/api/events/1/reports")
        .attach("evidence", Buffer.from(textContent), "evidence.txt")
        .field("type", "harassment")
        .field("description", "Test with file")
        .field("title", "A valid report title");
      
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("report");
      expect(res.body.report).toHaveProperty("title", "A valid report title");
    });

    it("should create a report with new optional fields", async () => {
      const res = await request(app)
        .post("/api/events/1/reports")
        .send({ 
          type: "harassment", 
          description: "Test report with new fields", 
          title: "A valid report title",
          location: "Main conference room",
          contactPreference: "email",
          urgency: "high"
        });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("report");
      expect(res.body.report).toHaveProperty("location", "Main conference room");
      expect(res.body.report).toHaveProperty("contactPreference", "email");
      expect(res.body.report).toHaveProperty("severity", "high"); // urgency maps to severity
    });

    it("should accept valid contactPreference values", async () => {
      const validPreferences = ["email", "phone", "in_person", "no_contact"];
      
      for (const preference of validPreferences) {
        const res = await request(app)
          .post("/api/events/1/reports")
          .send({ 
            type: "harassment", 
            description: "Test report", 
            title: "A valid report title",
            contactPreference: preference
          });
        expect(res.statusCode).toBe(201);
        expect(res.body.report).toHaveProperty("contactPreference", preference);
      }
    });

    it("should accept valid urgency/severity values", async () => {
      const validSeverities = ["low", "medium", "high", "critical"];
      
      for (const severity of validSeverities) {
        const res = await request(app)
          .post("/api/events/1/reports")
          .send({ 
            type: "harassment", 
            description: "Test report", 
            title: "A valid report title",
            urgency: severity
          });
        expect(res.statusCode).toBe(201);
        expect(res.body.report).toHaveProperty("severity", severity);
      }
    });

    it("should handle empty location field", async () => {
      const res = await request(app)
        .post("/api/events/1/reports")
        .send({ 
          type: "harassment", 
          description: "Test report", 
          title: "A valid report title",
          location: ""
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.report).toHaveProperty("location", "");
    });

    it("should default contactPreference to email when not provided", async () => {
      const res = await request(app)
        .post("/api/events/1/reports")
        .send({ 
          type: "harassment", 
          description: "Test report", 
          title: "A valid report title"
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.report).toHaveProperty("contactPreference", "email");
    });

    it("should handle incidentAt and parties fields", async () => {
      const incidentDate = "2024-01-15T10:00:00Z";
      const res = await request(app)
        .post("/api/events/1/reports")
        .send({ 
          type: "harassment", 
          description: "Test report with incident details", 
          title: "A valid report title",
          incidentAt: incidentDate,
          parties: "John Doe, Jane Smith"
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.report).toHaveProperty("incidentAt");
      expect(res.body.report).toHaveProperty("parties", "John Doe, Jane Smith");
    });

    it("should handle null values for optional fields", async () => {
      const res = await request(app)
        .post("/api/events/1/reports")
        .send({ 
          type: "harassment", 
          description: "Test report", 
          title: "A valid report title",
          location: null,
          incidentAt: null,
          parties: null
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.report).toHaveProperty("location", null);
      expect(res.body.report).toHaveProperty("incidentAt", null);
      expect(res.body.report).toHaveProperty("parties", null);
    });

    it("should reject invalid report type", async () => {
      const res = await request(app)
        .post("/api/events/1/reports")
        .send({ 
          type: "invalid_type", 
          description: "Test report", 
          title: "A valid report title",
          urgency: "low"
        });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    // Test edit endpoints
    it("should update report location", async () => {
      // First create a report
      const createRes = await request(app)
        .post("/api/events/1/reports")
        .send({ 
          type: "harassment", 
          description: "Test report", 
          title: "A valid report title"
        });
      expect(createRes.statusCode).toBe(201);
      const reportId = createRes.body.report.id;

      // Update location
      const updateRes = await request(app)
        .patch(`/api/events/1/reports/${reportId}/location`)
        .send({ location: "Conference Room A" });
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.report).toHaveProperty("location", "Conference Room A");
    });

    it("should update report contact preference", async () => {
      // First create a report
      const createRes = await request(app)
        .post("/api/events/1/reports")
        .send({ 
          type: "harassment", 
          description: "Test report", 
          title: "A valid report title"
        });
      expect(createRes.statusCode).toBe(201);
      const reportId = createRes.body.report.id;

      // Update contact preference
      const updateRes = await request(app)
        .patch(`/api/events/1/reports/${reportId}/contact-preference`)
        .send({ contactPreference: "phone" });
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.report).toHaveProperty("contactPreference", "phone");
    });

    it("should update report type", async () => {
      // First create a report
      const createRes = await request(app)
        .post("/api/events/1/reports")
        .send({ 
          type: "harassment", 
          description: "Test report", 
          title: "A valid report title"
        });
      expect(createRes.statusCode).toBe(201);
      const reportId = createRes.body.report.id;

      // Update type
      const updateRes = await request(app)
        .patch(`/api/events/1/reports/${reportId}/type`)
        .send({ type: "safety" });
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.report).toHaveProperty("type", "safety");
    });

    it("should reject invalid contact preference", async () => {
      // First create a report
      const createRes = await request(app)
        .post("/api/events/1/reports")
        .send({ 
          type: "harassment", 
          description: "Test report", 
          title: "A valid report title"
        });
      expect(createRes.statusCode).toBe(201);
      const reportId = createRes.body.report.id;

      // Try to update with invalid contact preference
      const updateRes = await request(app)
        .patch(`/api/events/1/reports/${reportId}/contact-preference`)
        .send({ contactPreference: "invalid" });
      expect(updateRes.statusCode).toBe(400);
      expect(updateRes.body).toHaveProperty("error");
    });

    it("should reject invalid type update", async () => {
      // First create a report
      const createRes = await request(app)
        .post("/api/events/1/reports")
        .send({ 
          type: "harassment", 
          description: "Test report", 
          title: "A valid report title"
        });
      expect(createRes.statusCode).toBe(201);
      const reportId = createRes.body.report.id;

      // Try to update with invalid type
      const updateRes = await request(app)
        .patch(`/api/events/1/reports/${reportId}/type`)
        .send({ type: "invalid_type" });
      expect(updateRes.statusCode).toBe(400);
      expect(updateRes.body).toHaveProperty("error");
    });
  });

  describe("GET /events/:eventId/reports", () => {
    it("should return reports for an event (success)", async () => {
      // Ensure at least one report exists for event 1
      inMemoryStore.reports.push({
        id: "r2",
        eventId: "1",
        type: "harassment",
        description: "Report 2",
        state: "submitted",
      });
      const res = await request(app).get("/api/events/1/reports");
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("reports");
      expect(Array.isArray(res.body.reports)).toBe(true);
      expect(res.body.reports.length).toBeGreaterThan(0);
    });

    it("should return 404 if event not found", async () => {
      const res = await request(app).get("/api/events/999/reports");
      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /events/:eventId/reports/:reportId", () => {
    it("should return a report for an event (success)", async () => {
      // Ensure a report exists for event 1
      inMemoryStore.reports.push({
        id: "r3",
        eventId: "1",
        type: "harassment",
        description: "Report 3",
        state: "submitted",
      });
      const res = await request(app).get("/api/events/1/reports/r3");
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("report");
      expect(res.body.report).toHaveProperty("id", "r3");
    });

    it("should return 400 or 404 if missing eventId", async () => {
      const res = await request(app).get("/api/events//reports/r1");
      expect([400, 404]).toContain(res.statusCode);
    });

    it("should return 404 if report not found", async () => {
      const res = await request(app).get("/api/events/1/reports/doesnotexist");
      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /events/:eventId/reports/:reportId/title", () => {
    it("should allow reporter to edit title", async () => {
      // Create a report as reporter
      inMemoryStore.reports.push({
        id: "r10",
        eventId: "1",
        reporterId: "1",
        type: "harassment",
        title: "Original Title",
        description: "desc",
        state: "submitted",
      });
      const res = await request(app)
        .patch("/api/events/1/reports/r10/title")
        .set("x-test-user-id", "1")
        .send({ title: "Updated Report Title" });
      expect(res.statusCode).toBe(200);
      expect(res.body.report).toHaveProperty("title", "Updated Report Title");
    });
    it("should allow admin to edit title", async () => {
      // Add admin role for user 2
      inMemoryStore.users.push({ id: "2", email: "admin2@example.com", name: "Admin2" });
      inMemoryStore.userEventRoles.push({ userId: "2", eventId: "1", roleId: "2", role: { name: "Admin" }, user: { id: "2" } });
      inMemoryStore.reports.push({
        id: "r11",
        eventId: "1",
        reporterId: "1",
        type: "harassment",
        title: "Original Title",
        description: "desc",
        state: "submitted",
      });
      const res = await request(app)
        .patch("/api/events/1/reports/r11/title")
        .set("x-test-user-id", "2")
        .send({ title: "Admin Updated Title" });
      expect(res.statusCode).toBe(200);
      expect(res.body.report).toHaveProperty("title", "Admin Updated Title");
    });
    it("should forbid responder from editing title", async () => {
      // Add responder role for user 3
      inMemoryStore.users.push({ id: "3", email: "responder@example.com", name: "Responder" });
      inMemoryStore.userEventRoles.push({ userId: "3", eventId: "1", roleId: "3", role: { name: "Responder" }, user: { id: "3" } });
      inMemoryStore.reports.push({
        id: "r12",
        eventId: "1",
        reporterId: "1",
        type: "harassment",
        title: "Original Title",
        description: "desc",
        state: "submitted",
      });
      const res = await request(app)
        .patch("/api/events/1/reports/r12/title")
        .set("x-test-user-id", "3")
        .send({ title: "Responder Update Attempt" });
      expect(res.statusCode).toBe(403);
    });
    it("should fail if title is invalid", async () => {
      inMemoryStore.reports.push({
        id: "r13",
        eventId: "1",
        reporterId: "1",
        type: "harassment",
        title: "Original Title",
        description: "desc",
        state: "submitted",
      });
      const res = await request(app)
        .patch("/api/events/1/reports/r13/title")
        .set("x-test-user-id", "1")
        .send({ title: "short" });
      expect(res.statusCode).toBe(400);
    });
  });
});

describe("Slug-based Event/User Endpoints", () => {
  const slug = "event1";
  beforeEach(() => {
    // Remove all roles for user 1 and event 2
    inMemoryStore.userEventRoles = inMemoryStore.userEventRoles.filter(
      (uer) => !(uer.userId === "1" && uer.eventId === "2"),
    );
    // Ensure the event with slug exists in the inMemoryStore
    if (!inMemoryStore.events.find((e) => e.slug === slug)) {
      inMemoryStore.events.push({ id: "2", name: "Event1", slug });
    }
    // Add SuperAdmin role for user 1 and event 2 for default tests
    inMemoryStore.userEventRoles.push({
      userId: "1",
      eventId: "2",
      roleId: "1",
      role: { name: "SuperAdmin" },
      user: { id: "1", email: "admin@example.com", name: "Admin" },
    });
  });

  it("should list users and their roles for an event by slug (success)", async () => {
    const res = await request(app).get(`/api/events/slug/${slug}/users`);
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("users");
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  it("should return 404 if event not found", async () => {
    const res = await request(app).get("/api/events/slug/doesnotexist/users");
    expect(res.statusCode).toBe(404);
  });

  it("should return 403 if user does not have sufficient role", async () => {
    // Remove all SuperAdmin roles for this user (across all events)
    inMemoryStore.userEventRoles = inMemoryStore.userEventRoles.filter(
      (uer) => !(uer.userId === "1" && uer.role.name === "SuperAdmin"),
    );
    // Remove all privileged roles for this event
    inMemoryStore.userEventRoles = inMemoryStore.userEventRoles.filter(
      (uer) =>
        !(
          uer.userId === "1" &&
          uer.eventId === "2" &&
          ["Admin", "Responder"].includes(uer.role.name)
        ),
    );
    // Add a non-privileged role
    inMemoryStore.userEventRoles.push({
      userId: "1",
      eventId: "2",
      roleId: "3",
      role: { name: "Reporter" },
      user: { id: "1", email: "admin@example.com", name: "Admin" },
    });
    // Debug log
    const rolesForUserEvent = inMemoryStore.userEventRoles
      .filter((uer) => uer.userId === "1" && uer.eventId === "2")
      .map((uer) => uer.role.name);
    console.log(
      "DEBUG: Roles for user 1, event 2 before request:",
      rolesForUserEvent,
    );
    const res = await request(app).get(`/api/events/slug/${slug}/users`);
    expect(res.statusCode).toBe(403);
  });

  it("should update a user for an event by slug (success)", async () => {
    // Ensure user exists and has a Reporter role
    inMemoryStore.users.push({
      id: "2",
      email: "user2@example.com",
      name: "User2",
    });
    inMemoryStore.userEventRoles.push({
      userId: "2",
      eventId: "2",
      roleId: "3",
      role: { name: "Reporter" },
      user: { id: "2", email: "user2@example.com", name: "User2" },
    });
    const res = await request(app).patch(`/api/events/slug/${slug}/users/2`).send({
      name: "User2 Updated",
      email: "user2updated@example.com",
      role: "Responder",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "User updated.");
  });

  it("should fail to update user if missing fields", async () => {
    const res = await request(app)
      .patch(`/api/events/slug/${slug}/users/2`)
      .send({ name: "User2 Updated" }); // missing email and role
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should return 404 if event not found on update", async () => {
    const res = await request(app)
      .patch("/api/events/slug/doesnotexist/users/2")
      .send({ name: "User2", email: "user2@example.com", role: "Responder" });
    expect(res.statusCode).toBe(404);
  });

  it("should return 403 if user does not have sufficient role to update", async () => {
    // Remove all SuperAdmin roles for this user (across all events)
    inMemoryStore.userEventRoles = inMemoryStore.userEventRoles.filter(
      (uer) => !(uer.userId === "1" && uer.role.name === "SuperAdmin"),
    );
    // Remove all Admin roles for this event
    inMemoryStore.userEventRoles = inMemoryStore.userEventRoles.filter(
      (uer) =>
        !(
          uer.userId === "1" &&
          uer.eventId === "2" &&
          uer.role.name === "Admin"
        ),
    );
    // Add only Reporter role
    inMemoryStore.userEventRoles.push({
      userId: "1",
      eventId: "2",
      roleId: "3",
      role: { name: "Reporter" },
      user: { id: "1", email: "admin@example.com", name: "Admin" },
    });
    const res = await request(app)
      .patch(`/api/events/slug/${slug}/users/2`)
      .send({ name: "User2", email: "user2@example.com", role: "Responder" });
    expect(res.statusCode).toBe(403);
  });

  it("should remove a user from an event by slug (success)", async () => {
    // Ensure user exists and has a role
    inMemoryStore.users.push({
      id: "3",
      email: "user3@example.com",
      name: "User3",
    });
    inMemoryStore.userEventRoles.push({
      userId: "3",
      eventId: "2",
      roleId: "3",
      role: { name: "Reporter" },
      user: { id: "3", email: "user3@example.com", name: "User3" },
    });
    const res = await request(app).delete(`/api/events/slug/${slug}/users/3`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "User removed from event.");
  });

  it("should return 404 if event not found on delete", async () => {
    const res = await request(app).delete("/api/events/slug/doesnotexist/users/3");
    expect(res.statusCode).toBe(404);
  });

  it("should return 403 if user does not have sufficient role to delete", async () => {
    // Remove all SuperAdmin roles for this user (across all events)
    inMemoryStore.userEventRoles = inMemoryStore.userEventRoles.filter(
      (uer) => !(uer.userId === "1" && uer.role.name === "SuperAdmin"),
    );
    // Remove all Admin roles for this event
    inMemoryStore.userEventRoles = inMemoryStore.userEventRoles.filter(
      (uer) =>
        !(
          uer.userId === "1" &&
          uer.eventId === "2" &&
          uer.role.name === "Admin"
        ),
    );
    // Add only Reporter role
    inMemoryStore.userEventRoles.push({
      userId: "1",
      eventId: "2",
      roleId: "3",
      role: { name: "Reporter" },
      user: { id: "1", email: "admin@example.com", name: "Admin" },
    });
    const res = await request(app).delete(`/api/events/slug/${slug}/users/3`);
    expect(res.statusCode).toBe(403);
  });
});

describe("Slug-based Event Endpoints", () => {
  const slug = "event1";
  beforeEach(() => {
    // Remove all roles for user 1 and event 2
    inMemoryStore.userEventRoles = inMemoryStore.userEventRoles.filter(
      (uer) => !(uer.userId === "1" && uer.eventId === "2"),
    );
    // Ensure the event with slug exists in the inMemoryStore
    if (!inMemoryStore.events.find((e) => e.slug === slug)) {
      inMemoryStore.events.push({ id: "2", name: "Event1", slug });
    }
    // Add SuperAdmin role for user 1 and event 2 for default tests
    inMemoryStore.userEventRoles.push({
      userId: "1",
      eventId: "2",
      roleId: "1",
      role: { name: "SuperAdmin" },
      user: { id: "1", email: "admin@example.com", name: "Admin" },
    });
  });

  it("should update event metadata by slug (success)", async () => {
    const res = await request(app)
      .patch(`/api/events/slug/${slug}`)
      .send({ name: "Updated Event", description: "Updated desc" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("event");
    expect(res.body.event).toHaveProperty("name", "Updated Event");
  });

  it("should update contactEmail for an event", async () => {
    const res = await request(app)
      .patch(`/api/events/slug/${slug}`)
      .send({ contactEmail: "contact@example.com" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("event");
    expect(res.body.event).toHaveProperty(
      "contactEmail",
      "contact@example.com",
    );
  });

  it("should fail with 400 if nothing to update", async () => {
    const res = await request(app).patch(`/api/events/slug/${slug}`).send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error", "Nothing to update.");
  });

  it("should return 404 if event not found", async () => {
    const res = await request(app)
      .patch("/api/events/slug/doesnotexist")
      .send({ name: "No Event" });
    expect(res.statusCode).toBe(404);
  });

  it("should return 409 if newSlug already exists", async () => {
    // Add a conflicting event
    inMemoryStore.events.push({ id: "3", name: "Other", slug: "conflict" });
    const res = await request(app)
      .patch(`/api/events/slug/${slug}`)
      .send({ newSlug: "conflict" });
    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty("error", "Slug already exists.");
  });

  it("should return 403 if user does not have sufficient role to update event", async () => {
    // Remove all SuperAdmin and Admin roles for this user
    inMemoryStore.userEventRoles = inMemoryStore.userEventRoles.filter(
      (uer) =>
        !(
          uer.userId === "1" && ["SuperAdmin", "Admin"].includes(uer.role.name)
        ),
    );
    // Add only Reporter role
    inMemoryStore.userEventRoles.push({
      userId: "1",
      eventId: "2",
      roleId: "3",
      role: { name: "Reporter" },
      user: { id: "1", email: "admin@example.com", name: "Admin" },
    });
    const res = await request(app)
      .patch(`/api/events/slug/${slug}`)
      .send({ name: "Should Fail" });
    expect(res.statusCode).toBe(403);
  });

  it("should upload a logo for an event (success)", async () => {
    // Mock file upload
    const res = await request(app)
      .post(`/api/events/slug/${slug}/logo`)
      .attach("logo", Buffer.from("fake image data"), "logo.png");
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("event");
  });

  it("should return 400 if no file uploaded", async () => {
    const res = await request(app).post(`/api/events/slug/${slug}/logo`);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error", "No file uploaded.");
  });

  it("should return 404 if event not found for logo upload", async () => {
    const res = await request(app)
      .post("/api/events/slug/doesnotexist/logo")
      .attach("logo", Buffer.from("fake image data"), "logo.png");
    expect(res.statusCode).toBe(404);
  });

  it("should return 403 if user does not have sufficient role to upload logo", async () => {
    // Remove all SuperAdmin and Admin roles for this user
    inMemoryStore.userEventRoles = inMemoryStore.userEventRoles.filter(
      (uer) =>
        !(
          uer.userId === "1" && ["SuperAdmin", "Admin"].includes(uer.role.name)
        ),
    );
    // Add only Reporter role
    inMemoryStore.userEventRoles.push({
      userId: "1",
      eventId: "2",
      roleId: "3",
      role: { name: "Reporter" },
      user: { id: "1", email: "admin@example.com", name: "Admin" },
    });
    const res = await request(app)
      .post(`/api/events/slug/${slug}/logo`)
      .attach("logo", Buffer.from("fake image data"), "logo.png");
    expect(res.statusCode).toBe(403);
  });
});

describe("Slug-based Invite Endpoints", () => {
  const slug = "event1";
  let inviteId;
  beforeEach(() => {
    // Remove all roles for user 1 and event 2
    inMemoryStore.userEventRoles = inMemoryStore.userEventRoles.filter(
      (uer) => !(uer.userId === "1" && uer.eventId === "2"),
    );
    // Ensure the event with slug exists in the inMemoryStore
    if (!inMemoryStore.events.find((e) => e.slug === slug)) {
      inMemoryStore.events.push({ id: "2", name: "Event1", slug });
    }
    // Add SuperAdmin role for user 1 and event 2 for default tests
    inMemoryStore.userEventRoles.push({
      userId: "1",
      eventId: "2",
      roleId: "1",
      role: { name: "SuperAdmin" },
      user: { id: "1", email: "admin@example.com", name: "Admin" },
    });
    // Add an invite for the event
    if (!inMemoryStore.eventInvites) inMemoryStore.eventInvites = [];
    inMemoryStore.eventInvites.length = 0;
    inviteId = "i1";
    inMemoryStore.eventInvites.push({
      id: inviteId,
      eventId: "2",
      disabled: false,
      note: "",
      expiresAt: null,
      maxUses: null,
    });
  });

  it("should update an invite (success)", async () => {
    const res = await request(app)
      .patch(`/api/events/slug/${slug}/invites/${inviteId}`)
      .send({ disabled: true, note: "Disabled for testing", maxUses: 5 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("invite");
    expect(res.body.invite).toHaveProperty("disabled", true);
    expect(res.body.invite).toHaveProperty("note", "Disabled for testing");
    expect(res.body.invite).toHaveProperty("maxUses", 5);
  });

  it("should return 404 if event not found", async () => {
    const res = await request(app)
      .patch(`/api/events/slug/doesnotexist/invites/${inviteId}`)
      .send({ disabled: true });
    expect(res.statusCode).toBe(404);
  });

  it("should return 404 if invite not found", async () => {
    const res = await request(app)
      .patch(`/api/events/slug/${slug}/invites/doesnotexist`)
      .send({ disabled: true });
    expect(res.statusCode).toBe(404);
  });

  it("should return 403 if user does not have sufficient role", async () => {
    // Remove all SuperAdmin and Admin roles for this user
    inMemoryStore.userEventRoles = inMemoryStore.userEventRoles.filter(
      (uer) =>
        !(
          uer.userId === "1" && ["SuperAdmin", "Admin"].includes(uer.role.name)
        ),
    );
    // Add only Reporter role
    inMemoryStore.userEventRoles.push({
      userId: "1",
      eventId: "2",
      roleId: "3",
      role: { name: "Reporter" },
      user: { id: "1", email: "admin@example.com", name: "Admin" },
    });
    const res = await request(app)
      .patch(`/api/events/slug/${slug}/invites/${inviteId}`)
      .send({ disabled: true });
    expect(res.statusCode).toBe(403);
  });
});

describe("User Avatar endpoints", () => {
  const userId = "1";
  const avatarPng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]); // PNG header
  const avatarJpg = Buffer.from([0xff, 0xd8, 0xff, 0xdb]); // JPG header

  it("should upload a valid PNG avatar", async () => {
    const res = await request(app)
      .post(`/api/users/${userId}/avatar`)
      .attach("avatar", avatarPng, {
        filename: "avatar.png",
        contentType: "image/png",
      });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("avatarId");
  });

  it("should upload a valid JPG avatar", async () => {
    const res = await request(app)
      .post(`/api/users/${userId}/avatar`)
      .attach("avatar", avatarJpg, {
        filename: "avatar.jpg",
        contentType: "image/jpeg",
      });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("avatarId");
  });

  it("should reject an invalid file type", async () => {
    const res = await request(app)
      .post(`/api/users/${userId}/avatar`)
      .attach("avatar", Buffer.from([0x00, 0x01]), {
        filename: "avatar.gif",
        contentType: "image/gif",
      });
    expect([400, 415, 500]).toContain(res.statusCode);
  });

  it("should fetch the uploaded avatar", async () => {
    await request(app)
      .post(`/api/users/${userId}/avatar`)
      .attach("avatar", avatarPng, {
        filename: "avatar.png",
        contentType: "image/png",
      });
    const res = await request(app).get(`/api/users/${userId}/avatar`);
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/image\/png/);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("should return 404 for missing avatar", async () => {
    const res = await request(app).get(`/api/users/999/avatar`);
    expect(res.statusCode).toBe(404);
  });

  it("should delete the avatar", async () => {
    await request(app)
      .post(`/api/users/${userId}/avatar`)
      .attach("avatar", avatarPng, {
        filename: "avatar.png",
        contentType: "image/png",
      });
    const delRes = await request(app).delete(`/api/users/${userId}/avatar`);
    expect([200, 204]).toContain(delRes.statusCode);
    const getRes = await request(app).get(`/api/users/${userId}/avatar`);
    expect(getRes.statusCode).toBe(404);
  });

  it("should not allow another user to upload/delete avatar", async () => {
    // Simulate a different user
    const otherUserId = "2";
    inMemoryStore.users.push({
      id: otherUserId,
      email: "other@example.com",
      name: "Other",
    });
    const res = await request(app)
      .post(`/api/users/${userId}/avatar`)
      .set("x-test-user-id", otherUserId)
      .attach("avatar", avatarPng, {
        filename: "avatar.png",
        contentType: "image/png",
      });
    expect([401, 403]).toContain(res.statusCode);
    const delRes = await request(app)
      .delete(`/api/users/${userId}/avatar`)
      .set("x-test-user-id", otherUserId);
    expect([401, 403]).toContain(delRes.statusCode);
  });

  it("should include avatarUrl in /session and /api/events/slug/:slug/users", async () => {
    // Upload avatar
    await request(app)
      .post(`/api/users/${userId}/avatar`)
      .attach("avatar", avatarPng, {
        filename: "avatar.png",
        contentType: "image/png",
      });
    // /session
    const sessionRes = await request(app).get("/session");
    expect(sessionRes.statusCode).toBe(200);
    expect(sessionRes.body.user).toHaveProperty("avatarUrl");
    // /api/events/slug/:slug/users
    inMemoryStore.events[0].slug = "event1";
    const usersRes = await request(app).get("/api/events/slug/event1/users");
    expect(usersRes.statusCode).toBe(200);
    expect(usersRes.body.users[0]).toHaveProperty("avatarUrl");
  });
});

describe("Evidence endpoints", () => {
  let reportId;
  beforeEach(async () => {
    // Create a report to attach evidence to
    const res = await request(app)
      .post("/api/events/1/reports")
      .send({ type: "harassment", description: "Report for evidence", title: "Evidence Report Title" });
    reportId = res.body.report.id;
  });

  it("should upload multiple evidence files to a report", async () => {
    const res = await request(app)
      .post(`/api/reports/${reportId}/evidence`)
      .attach("evidence", Buffer.from("file1data"), "file1.txt")
      .attach("evidence", Buffer.from("file2data"), "file2.txt");
    expect(res.statusCode).toBe(201);
    expect(res.body.files).toHaveLength(2);
    expect(res.body.files[0]).toHaveProperty("filename", "file1.txt");
    expect(res.body.files[1]).toHaveProperty("filename", "file2.txt");
  });

  it("should list all evidence files for a report", async () => {
    // Upload files first
    await request(app)
      .post(`/api/reports/${reportId}/evidence`)
      .attach("evidence", Buffer.from("file1data"), "file1.txt")
      .attach("evidence", Buffer.from("file2data"), "file2.txt");
    const res = await request(app).get(`/api/reports/${reportId}/evidence`);
    expect(res.statusCode).toBe(200);
    expect(res.body.files).toHaveLength(2);
    expect(res.body.files[0]).toHaveProperty("filename", "file1.txt");
    expect(res.body.files[1]).toHaveProperty("filename", "file2.txt");
  });

  it("should download a specific evidence file by its ID", async () => {
    // Upload a file (this sets the correct test user context)
    const uploadRes = await request(app)
      .post(`/api/reports/${reportId}/evidence`)
      .attach("evidence", Buffer.from("downloadme"), "download.txt");
    const evidenceId = uploadRes.body.files[0].id;
    
    // Download the file (now requires authentication, but test middleware provides it)
    const res = await request(app).get(`/api/evidence/${evidenceId}/download`);
    expect(res.statusCode).toBe(200);
    expect(res.header["content-type"]).toBe("text/plain; charset=utf-8");
    expect(res.header["content-disposition"]).toContain("download.txt");
    expect(res.text).toBe("downloadme");
  });
});

describe("Report detail access control (slug-based)", () => {
  beforeEach(() => {
    // Set up event, users, roles, and a report
    inMemoryStore.events = [{ id: "1", name: "Event1", slug: "event1" }];
    inMemoryStore.roles = [
      { id: "1", name: "SuperAdmin" },
      { id: "2", name: "Admin" },
      { id: "3", name: "Responder" },
      { id: "4", name: "Reporter" },
    ];
    inMemoryStore.users = [
      { id: "u1", email: "reporter@example.com", name: "Reporter" },
      { id: "u2", email: "responder@example.com", name: "Responder" },
      { id: "u3", email: "other@example.com", name: "Other" },
    ];
    inMemoryStore.userEventRoles = [
      { userId: "u1", eventId: "1", roleId: "4", role: { name: "Reporter" }, user: { id: "u1" } },
      { userId: "u2", eventId: "1", roleId: "3", role: { name: "Responder" }, user: { id: "u2" } },
    ];
    inMemoryStore.reports = [
      { id: "r1", eventId: "1", reporterId: "u1", type: "harassment", description: "Test report", state: "submitted" },
    ];
  });

  it("allows the reporter to access the report detail", async () => {
    const res = await request(app)
      .get("/api/events/slug/event1/reports/r1")
      .set("x-test-user-id", "u1");
    expect(res.statusCode).toBe(200);
    expect(res.body.report).toHaveProperty("id", "r1");
  });

  it("allows a responder to access the report detail", async () => {
    const res = await request(app)
      .get("/api/events/slug/event1/reports/r1")
      .set("x-test-user-id", "u2");
    expect(res.statusCode).toBe(200);
    expect(res.body.report).toHaveProperty("id", "r1");
  });

  it("forbids a user who is not the reporter or responder", async () => {
    const res = await request(app)
      .get("/api/events/slug/event1/reports/r1")
      .set("x-test-user-id", "u3");
    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("error");
  });
});
