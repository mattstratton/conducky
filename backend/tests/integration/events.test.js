const { inMemoryStore } = require("../../__mocks__/@prisma/client");
const request = require("supertest");
const app = require("../../index");

jest.mock("../../utils/rbac", () => ({
  requireSuperAdmin: () => (req, res, next) => {
    req.isAuthenticated = () => true;
    req.user = { id: "1", email: "admin@example.com", name: "Admin" };
    next();
  },
  requireRole: () => (req, res, next) => {
    req.isAuthenticated = () => true;
    req.user = { id: "1", email: "admin@example.com", name: "Admin" };
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
        .post("/events")
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
      const res = await request(app).post("/events").send({ name: "" });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
    it("should fail if slug is invalid", async () => {
      const res = await request(app)
        .post("/events")
        .send({ name: "Event", slug: "Invalid Slug!" });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
    it("should fail if slug already exists", async () => {
      await request(app).post("/events").send({ name: "Event1", slug: "dupe" });
      const res = await request(app)
        .post("/events")
        .send({ name: "Event2", slug: "dupe" });
      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty("error", "Slug already exists.");
    });
  });

  describe("POST /events/:eventId/roles", () => {
    it("should assign a role to a user", async () => {
      const eventRes = await request(app)
        .post("/events")
        .send({ name: "Role Event", slug: "role-event" });
      const eventId = eventRes.body.event.id;
      const res = await request(app)
        .post(`/events/${eventId}/roles`)
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
        .post("/events")
        .send({ name: "Role Event2", slug: "role-event2" });
      const eventId = eventRes.body.event.id;
      const res = await request(app).post(`/events/${eventId}/roles`).send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
    it("should fail if user does not exist", async () => {
      const eventRes = await request(app)
        .post("/events")
        .send({ name: "Role Event3", slug: "role-event3" });
      const eventId = eventRes.body.event.id;
      const res = await request(app)
        .post(`/events/${eventId}/roles`)
        .send({ userId: "999", roleName: "Admin" });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error", "User does not exist.");
    });
    it("should fail if role does not exist", async () => {
      const eventRes = await request(app)
        .post("/events")
        .send({ name: "Role Event4", slug: "role-event4" });
      const eventId = eventRes.body.event.id;
      const res = await request(app)
        .post(`/events/${eventId}/roles`)
        .send({ userId: "1", roleName: "NotARole" });
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error", "Role does not exist.");
    });
  });

  describe("GET /events/:eventId", () => {
    it("should return event details (success)", async () => {
      const res = await request(app).get("/events/1");
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("event");
      expect(res.body.event).toHaveProperty("id", "1");
    });
    it("should return 404 if event not found", async () => {
      const res = await request(app).get("/events/999");
      expect(res.statusCode).toBe(404);
    });
    // Forbidden case is handled by RBAC middleware mock (always allows)
  });

  describe("DELETE /events/:eventId/roles", () => {
    it("should remove a role from a user (success)", async () => {
      const res = await request(app)
        .delete("/events/1/roles")
        .send({ userId: "1", roleName: "SuperAdmin" });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("message", "Role removed.");
    });
    it("should fail if missing fields", async () => {
      const res = await request(app).delete("/events/1/roles").send({});
      expect(res.statusCode).toBe(400);
    });
    it("should fail if user or role not found", async () => {
      const res = await request(app)
        .delete("/events/1/roles")
        .send({ userId: "999", roleName: "NotARole" });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /events/:eventId/users", () => {
    it("should list users and their roles for an event (success)", async () => {
      const res = await request(app).get("/events/1/users");
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
        .patch("/events/1/reports/r4/state")
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
        .patch("/events/1/reports/r5/state")
        .send({ state: "not-a-state" });
      expect(res.statusCode).toBe(400);
    });

    it("should return 404 if report not found", async () => {
      const res = await request(app)
        .patch("/events/1/reports/doesnotexist/state")
        .send({ state: "acknowledged" });
      expect(res.statusCode).toBe(404);
    });

    it("should return 403 if user does not have required role", async () => {
      // Ensure Reporter role exists
      if (!inMemoryStore.roles.find((r) => r.name === "Reporter")) {
        inMemoryStore.roles.push({ id: "4", name: "Reporter" });
      }
      // Remove all privileged roles for this user
      inMemoryStore.userEventRoles = inMemoryStore.userEventRoles.filter(
        (uer) =>
          !(
            uer.userId === "1" &&
            ["SuperAdmin", "Admin", "Responder"].includes(uer.role.name)
          ),
      );
      // Add only Reporter role
      inMemoryStore.userEventRoles.push({
        userId: "1",
        eventId: "1",
        roleId: "4",
        role: { name: "Reporter" },
        user: { id: "1", email: "admin@example.com", name: "Admin" },
      });
      inMemoryStore.reports.push({
        id: "r6",
        eventId: "1",
        type: "harassment",
        description: "Report 6",
        state: "submitted",
      });
      // Debug output
      console.log(
        "DEBUG: userEventRoles for user 1, event 1:",
        JSON.stringify(
          inMemoryStore.userEventRoles.filter(
            (uer) => uer.userId === "1" && uer.eventId === "1",
          ),
          null,
          2,
        ),
      );
      console.log(
        "DEBUG: roles:",
        JSON.stringify(inMemoryStore.roles, null, 2),
      );
      const res = await request(app)
        .patch("/events/1/reports/r6/state")
        .send({ state: "acknowledged" });
      expect(res.statusCode).toBe(403);
    });
  });

  describe("POST /events/:eventId/reports", () => {
    it("should create a report (success)", async () => {
      const res = await request(app)
        .post("/events/1/reports")
        .send({ type: "harassment", description: "Test report" });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("report");
      expect(res.body.report).toHaveProperty("type", "harassment");
      expect(res.body.report).toHaveProperty("description", "Test report");
    });

    it("should fail if missing required fields", async () => {
      const res = await request(app)
        .post("/events/1/reports")
        .send({ type: "harassment" }); // missing description
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("should return 404 if event not found", async () => {
      const res = await request(app)
        .post("/events/999/reports")
        .send({ type: "harassment", description: "Test report" });
      expect(res.statusCode).toBe(404);
    });

    it("should create a report with evidence file upload", async () => {
      const res = await request(app)
        .post("/events/1/reports")
        .attach("evidence", Buffer.from("fake evidence data"), "evidence.txt")
        .field("type", "harassment")
        .field("description", "Test with file");
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("report");
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
      const res = await request(app).get("/events/1/reports");
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("reports");
      expect(Array.isArray(res.body.reports)).toBe(true);
      expect(res.body.reports.length).toBeGreaterThan(0);
    });

    it("should return 404 if event not found", async () => {
      const res = await request(app).get("/events/999/reports");
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
      const res = await request(app).get("/events/1/reports/r3");
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("report");
      expect(res.body.report).toHaveProperty("id", "r3");
    });

    it("should return 400 or 404 if missing eventId", async () => {
      const res = await request(app).get("/events//reports/r1");
      expect([400, 404]).toContain(res.statusCode);
    });

    it("should return 404 if report not found", async () => {
      const res = await request(app).get("/events/1/reports/doesnotexist");
      expect(res.statusCode).toBe(404);
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
    const res = await request(app).get(`/events/slug/${slug}/users`);
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("users");
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  it("should return 404 if event not found", async () => {
    const res = await request(app).get("/events/slug/doesnotexist/users");
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
    const res = await request(app).get(`/events/slug/${slug}/users`);
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
    const res = await request(app).patch(`/events/slug/${slug}/users/2`).send({
      name: "User2 Updated",
      email: "user2updated@example.com",
      role: "Responder",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "User updated.");
  });

  it("should fail to update user if missing fields", async () => {
    const res = await request(app)
      .patch(`/events/slug/${slug}/users/2`)
      .send({ name: "User2 Updated" }); // missing email and role
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should return 404 if event not found on update", async () => {
    const res = await request(app)
      .patch("/events/slug/doesnotexist/users/2")
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
      .patch(`/events/slug/${slug}/users/2`)
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
    const res = await request(app).delete(`/events/slug/${slug}/users/3`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("message", "User removed from event.");
  });

  it("should return 404 if event not found on delete", async () => {
    const res = await request(app).delete("/events/slug/doesnotexist/users/3");
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
    const res = await request(app).delete(`/events/slug/${slug}/users/3`);
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
      .patch(`/events/slug/${slug}`)
      .send({ name: "Updated Event", description: "Updated desc" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("event");
    expect(res.body.event).toHaveProperty("name", "Updated Event");
  });

  it("should fail with 400 if nothing to update", async () => {
    const res = await request(app).patch(`/events/slug/${slug}`).send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error", "Nothing to update.");
  });

  it("should return 404 if event not found", async () => {
    const res = await request(app)
      .patch("/events/slug/doesnotexist")
      .send({ name: "No Event" });
    expect(res.statusCode).toBe(404);
  });

  it("should return 409 if newSlug already exists", async () => {
    // Add a conflicting event
    inMemoryStore.events.push({ id: "3", name: "Other", slug: "conflict" });
    const res = await request(app)
      .patch(`/events/slug/${slug}`)
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
      .patch(`/events/slug/${slug}`)
      .send({ name: "Should Fail" });
    expect(res.statusCode).toBe(403);
  });

  it("should upload a logo for an event (success)", async () => {
    // Mock file upload
    const res = await request(app)
      .post(`/events/slug/${slug}/logo`)
      .attach("logo", Buffer.from("fake image data"), "logo.png");
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty("event");
  });

  it("should return 400 if no file uploaded", async () => {
    const res = await request(app).post(`/events/slug/${slug}/logo`);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error", "No file uploaded.");
  });

  it("should return 404 if event not found for logo upload", async () => {
    const res = await request(app)
      .post("/events/slug/doesnotexist/logo")
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
      .post(`/events/slug/${slug}/logo`)
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
      .patch(`/events/slug/${slug}/invites/${inviteId}`)
      .send({ disabled: true, note: "Disabled for testing", maxUses: 5 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("invite");
    expect(res.body.invite).toHaveProperty("disabled", true);
    expect(res.body.invite).toHaveProperty("note", "Disabled for testing");
    expect(res.body.invite).toHaveProperty("maxUses", 5);
  });

  it("should return 404 if event not found", async () => {
    const res = await request(app)
      .patch(`/events/slug/doesnotexist/invites/${inviteId}`)
      .send({ disabled: true });
    expect(res.statusCode).toBe(404);
  });

  it("should return 404 if invite not found", async () => {
    const res = await request(app)
      .patch(`/events/slug/${slug}/invites/doesnotexist`)
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
      .patch(`/events/slug/${slug}/invites/${inviteId}`)
      .send({ disabled: true });
    expect(res.statusCode).toBe(403);
  });
});
