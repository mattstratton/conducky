const { inMemoryStore } = require("../../__mocks__/@prisma/client");
const request = require("supertest");
const app = require("../../index");

// Mock RBAC to allow proper authentication for testing
jest.mock("../../src/utils/rbac", () => ({
  requireSuperAdmin: () => (req, res, next) => {
    // Check if user is authenticated based on header
    const testUserId = req.headers['x-test-user-id'];
    
    if (!testUserId) {
      req.isAuthenticated = () => false;
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    
    req.isAuthenticated = () => true;
    
    // Check if user has SuperAdmin role in any event
    const { inMemoryStore } = require("../../__mocks__/@prisma/client");
    
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
    // Check if user is authenticated based on header
    const testUserId = req.headers['x-test-user-id'];
    
    if (!testUserId) {
      req.isAuthenticated = () => false;
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    
    req.isAuthenticated = () => true;
    
    const { inMemoryStore } = require("../../__mocks__/@prisma/client");
    
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

describe("System Settings Integration Tests", () => {
  beforeEach(() => {
    // Reset inMemoryStore to a clean state for each test
    inMemoryStore.users = [
      { id: "1", email: "superadmin@test.com", name: "Super Admin" },
      { id: "2", email: "regular@test.com", name: "Regular User" },
    ];
    inMemoryStore.roles = [
      { id: "1", name: "SuperAdmin" },
      { id: "2", name: "Admin" },
      { id: "3", name: "Responder" },
      { id: "4", name: "Reporter" },
    ];
    inMemoryStore.userEventRoles = [
      {
        userId: "1",
        eventId: null,
        roleId: "1",
        role: { name: "SuperAdmin" },
        user: { id: "1", email: "superadmin@test.com", name: "Super Admin" },
      },
    ];
    inMemoryStore.systemSettings = [
      { id: "1", key: "showPublicEventList", value: "false" }
    ];
  });

  describe("GET /api/system/settings", () => {
    it("should allow unauthenticated access to system settings", async () => {
      const response = await request(app)
        .get("/api/system/settings")
        .expect(200);

      expect(response.body).toHaveProperty("settings");
      expect(typeof response.body.settings).toBe("object");
      expect(response.body.settings).toHaveProperty("showPublicEventList");
    });

    it("should return system settings to authenticated users", async () => {
      const response = await request(app)
        .get("/api/system/settings")
        .set('x-test-user-id', '2') // Regular user
        .expect(200);

      expect(response.body).toHaveProperty("settings");
      expect(response.body.settings).toHaveProperty("showPublicEventList");
      expect(response.body.settings.showPublicEventList).toBe("false");
    });

    it("should return system settings to SuperAdmin", async () => {
      const response = await request(app)
        .get("/api/system/settings")
        .set('x-test-user-id', '1') // SuperAdmin user
        .expect(200);

      expect(response.body).toHaveProperty("settings");
      expect(response.body.settings).toHaveProperty("showPublicEventList");
      expect(response.body.settings.showPublicEventList).toBe("false");
    });
  });

  describe("PATCH /api/admin/system/settings", () => {
    beforeEach(() => {
      // Reset test settings
      inMemoryStore.systemSettings = [
        { id: "1", key: "showPublicEventList", value: "false" },
        { id: "2", key: "test_showPublicEventList", value: "false" }
      ];
    });

    it("should require authentication", async () => {
      await request(app)
        .patch("/api/admin/system/settings")
        .send({ test_showPublicEventList: "true" })
        .expect(401);
    });

    it("should require SuperAdmin role", async () => {
      await request(app)
        .patch("/api/admin/system/settings")
        .set('x-test-user-id', '2') // Regular user (not SuperAdmin)
        .send({ test_showPublicEventList: "true" })
        .expect(403);
    });

    it("should allow SuperAdmin to update system settings", async () => {
      const response = await request(app)
        .patch("/api/admin/system/settings")
        .set('x-test-user-id', '1') // SuperAdmin user
        .send({ test_showPublicEventList: "true" })
        .expect(200);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toBe("System settings updated successfully");
      expect(response.body).toHaveProperty("updated");
      expect(response.body.updated).toEqual([
        { key: "test_showPublicEventList", value: "true" }
      ]);

      // Verify setting was updated in mock store
      const setting = inMemoryStore.systemSettings.find(s => s.key === "test_showPublicEventList");
      expect(setting.value).toBe("true");
    });

    it("should update showPublicEventList setting specifically", async () => {
      const response = await request(app)
        .patch("/api/admin/system/settings")
        .set('x-test-user-id', '1') // SuperAdmin user
        .send({ showPublicEventList: "true" })
        .expect(200);

      expect(response.body.updated).toEqual([
        { key: "showPublicEventList", value: "true" }
      ]);

      // Verify setting was updated
      const setting = inMemoryStore.systemSettings.find(s => s.key === "showPublicEventList");
      expect(setting.value).toBe("true");
    });

    it("should handle multiple settings update", async () => {
      const response = await request(app)
        .patch("/api/admin/system/settings")
        .set('x-test-user-id', '1') // SuperAdmin user
        .send({ 
          showPublicEventList: "true",
          test_newSetting: "value123"
        })
        .expect(200);

      expect(response.body.updated).toHaveLength(2);
      expect(response.body.updated).toContainEqual(
        { key: "showPublicEventList", value: "true" }
      );
      expect(response.body.updated).toContainEqual(
        { key: "test_newSetting", value: "value123" }
      );

      // Verify settings were updated
      const setting1 = inMemoryStore.systemSettings.find(s => s.key === "showPublicEventList");
      expect(setting1.value).toBe("true");
      
      const setting2 = inMemoryStore.systemSettings.find(s => s.key === "test_newSetting");
      expect(setting2.value).toBe("value123");
    });

    it("should validate non-string values", async () => {
      await request(app)
        .patch("/api/admin/system/settings")
        .set('x-test-user-id', '1') // SuperAdmin user
        .send({ test_invalidSetting: 123 })
        .expect(400);
    });

    it("should require updates object", async () => {
      await request(app)
        .patch("/api/admin/system/settings")
        .set('x-test-user-id', '1') // SuperAdmin user
        .expect(400);
    });

    it("should handle empty updates object", async () => {
      await request(app)
        .patch("/api/admin/system/settings")
        .set('x-test-user-id', '1') // SuperAdmin user
        .send({})
        .expect(200);
    });
  });

  describe("Integration with home page functionality", () => {
    it("should affect public event listing on home page", async () => {
      // Set showPublicEventList to false
      await request(app)
        .patch("/api/admin/system/settings")
        .set('x-test-user-id', '1') // SuperAdmin user
        .send({ showPublicEventList: "false" })
        .expect(200);

      // Check settings
      const response1 = await request(app)
        .get("/api/system/settings")
        .expect(200);

      expect(response1.body.settings.showPublicEventList).toBe("false");

      // Set showPublicEventList to true
      await request(app)
        .patch("/api/admin/system/settings")
        .set('x-test-user-id', '1') // SuperAdmin user
        .send({ showPublicEventList: "true" })
        .expect(200);

      // Check settings
      const response2 = await request(app)
        .get("/api/system/settings")
        .expect(200);

      expect(response2.body.settings.showPublicEventList).toBe("true");
    });
  });
}); 