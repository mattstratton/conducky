const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cors = require("cors");
const app = express();
const PORT = 4000;
const { logAudit } = require("./utils/audit");
const { requireRole, requireSuperAdmin } = require("./utils/rbac");
const crypto = require("crypto");

// Global request logger
app.use((req, res, next) => {
  console.log("[GLOBAL] Incoming request:", req.method, req.url);
  next();
});

// Add test-only authentication middleware for tests
if (process.env.NODE_ENV === "test") {
  app.use((req, res, next) => {
    req.isAuthenticated = () => true;
    req.user = { id: "1", email: "admin@example.com", name: "Admin" };
    next();
  });
}

// Multer setup for evidence uploads (memory storage, 50MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// Multer setup for event logo uploads (now using memory storage)
const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}); // 10MB limit

// Multer setup for multi-file evidence upload (memory storage, 50MB per file)
const multiUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// CORS middleware (allow frontend dev server)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    credentials: true,
  }),
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "changeme",
    resave: false,
    saveUninitialized: false,
  }),
);

// Serve uploads directory as static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Passport.js setup
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
          return done(null, false, { message: "Incorrect email or password." });
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return done(null, false, { message: "Incorrect email or password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Register route
app.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered." });
    }
    const userCount = await prisma.user.count();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });
    // If this is the first user, assign SuperAdmin role globally (eventId: null)
    let madeSuperAdmin = false;
    if (userCount === 0) {
      let superAdminRole = await prisma.role.findUnique({
        where: { name: "SuperAdmin" },
      });
      if (!superAdminRole) {
        superAdminRole = await prisma.role.create({
          data: { name: "SuperAdmin" },
        });
      }
      await prisma.userEventRole.create({
        data: {
          userId: user.id,
          eventId: null, // Global role assignment
          roleId: superAdminRole.id,
        },
      });
      madeSuperAdmin = true;
    }
    // Respond with success
    return res.json({
      message: "Registration successful!",
      user: { id: user.id, email: user.email, name: user.name },
      madeSuperAdmin,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Registration failed.", details: err.message });
  }
});

// Login route
app.post("/login", passport.authenticate("local"), (req, res) => {
  res.json({
    message: "Logged in!",
    user: { id: req.user.id, email: req.user.email, name: req.user.name },
  });
});

// Logout route
app.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "Logout failed." });
    res.json({ message: "Logged out!" });
  });
});

// Session check route
app.get("/session", async (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    // Fetch user roles
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    // Flatten roles to a list of role names
    const roles = userEventRoles.map((uer) => uer.role.name);
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        roles,
      },
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

app.get("/", async (req, res) => {
  // Check if any users exist
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    return res.json({ firstUserNeeded: true });
  }
  res.json({ message: "Backend API is running!" });
});

app.get("/audit-test", async (req, res) => {
  // Example usage: log a test audit event
  try {
    await logAudit({
      eventId: "902288b2-388a-4292-83b6-4c30e566a413",
      userId: null, // or a real user ID if available
      action: "test_action",
      targetType: "Test",
      targetId: "123",
    });
    res.json({ message: "Audit event logged!" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to log audit event", details: err.message });
  }
});

// Example protected route
app.get("/admin-only", requireRole(["Admin"]), (req, res) => {
  res.json({
    message: "You are an admin for this event!",
    user: { id: req.user.id, email: req.user.email },
  });
});

// Super Admin: Create Event
app.post("/events", requireSuperAdmin(), async (req, res) => {
  const { name, slug } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: "Name and slug are required." });
  }
  // Slug validation: lowercase, url-safe (letters, numbers, hyphens), no spaces
  const slugPattern = /^[a-z0-9-]+$/;
  if (!slugPattern.test(slug)) {
    return res.status(400).json({
      error:
        "Slug must be all lowercase, URL-safe (letters, numbers, hyphens only, no spaces).",
    });
  }
  try {
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: "Slug already exists." });
    }
    const event = await prisma.event.create({ data: { name, slug } });
    res.status(201).json({ event });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Event creation failed.", details: err.message });
  }
});

// Super Admin: List all events
app.get("/events", requireSuperAdmin(), async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ events });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to list events.", details: err.message });
  }
});

// Get event details (Admins or SuperAdmins for that event)
app.get(
  "/events/:eventId",
  requireRole(["Admin", "SuperAdmin"]),
  async (req, res) => {
    const { eventId } = req.params;
    try {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        return res.status(404).json({ error: "Event not found." });
      }
      res.json({ event });
    } catch (err) {
      res
        .status(500)
        .json({ error: "Failed to get event details.", details: err.message });
    }
  },
);

// Assign a role to a user for an event
app.post(
  "/events/:eventId/roles",
  requireRole(["Admin", "SuperAdmin"]),
  async (req, res) => {
    const { eventId } = req.params;
    const { userId, roleName } = req.body;
    if (!userId || !roleName) {
      return res
        .status(400)
        .json({ error: "userId and roleName are required." });
    }
    try {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (!role) {
        return res.status(400).json({ error: "Role does not exist." });
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(400).json({ error: "User does not exist." });
      }
      // Upsert the user-event-role
      const userEventRole = await prisma.userEventRole.upsert({
        where: {
          userId_eventId_roleId: {
            userId,
            eventId,
            roleId: role.id,
          },
        },
        update: {},
        create: { userId, eventId, roleId: role.id },
      });
      res.status(201).json({ message: "Role assigned.", userEventRole });
    } catch (err) {
      res
        .status(500)
        .json({ error: "Failed to assign role.", details: err.message });
    }
  },
);

// Remove a role from a user for an event
app.delete(
  "/events/:eventId/roles",
  requireRole(["Admin", "SuperAdmin"]),
  async (req, res) => {
    const { eventId } = req.params;
    const { userId, roleName } = req.body;
    if (!userId || !roleName) {
      return res
        .status(400)
        .json({ error: "userId and roleName are required." });
    }
    try {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (!role) {
        return res.status(400).json({ error: "Role does not exist." });
      }
      await prisma.userEventRole.delete({
        where: {
          userId_eventId_roleId: {
            userId,
            eventId,
            roleId: role.id,
          },
        },
      });
      res.json({ message: "Role removed." });
    } catch (err) {
      res
        .status(500)
        .json({ error: "Failed to remove role.", details: err.message });
    }
  },
);

// List all users and their roles for an event
app.get("/events/:eventId/users", async (req, res) => {
  console.log("[ROUTE] /events/:eventId/users handler", {
    url: req.url,
    params: req.params,
    query: req.query,
  });
  // Inline RBAC logic for Admin/SuperAdmin
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const eventId = req.params && req.params.eventId;
  if (!eventId) {
    return res.status(400).json({ error: "Missing eventId in params" });
  }
  try {
    // Check for SuperAdmin role globally
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    const isSuperAdmin = allUserRoles.some(
      (uer) => uer.role.name === "SuperAdmin",
    );
    if (!isSuperAdmin) {
      // Otherwise, check for allowed roles for this event
      const userRoles = allUserRoles.filter((uer) => uer.eventId === eventId);
      const hasRole = userRoles.some((uer) =>
        ["Admin", "SuperAdmin"].includes(uer.role.name),
      );
      if (!hasRole) {
        return res.status(403).json({ error: "Forbidden: insufficient role" });
      }
    }
    // --- original handler logic ---
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { eventId },
      include: {
        user: true,
        role: true,
      },
    });
    // Group roles by user
    const users = {};
    userEventRoles.forEach((uer) => {
      if (!users[uer.userId]) {
        users[uer.userId] = {
          id: uer.user.id,
          email: uer.user.email,
          name: uer.user.name,
          roles: [],
        };
      }
      users[uer.userId].roles.push(uer.role.name);
    });
    res.json({ users: Object.values(users) });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to list users for event.", details: err.message });
  }
});

// Submit a report for an event (anonymous or authenticated, with evidence upload)
app.post(
  "/events/:eventId/reports",
  upload.array("evidence", 10),
  async (req, res) => {
    const { eventId } = req.params;
    const { type, description, incidentAt, parties } = req.body;
    if (!type || !description) {
      return res
        .status(400)
        .json({ error: "type and description are required." });
    }
    try {
      // Check event exists
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        return res.status(404).json({ error: "Event not found." });
      }
      // If authenticated, use req.user.id as reporterId; else null
      const reporterId =
        req.isAuthenticated && req.isAuthenticated() && req.user
          ? req.user.id
          : null;
      // Create report first
      const report = await prisma.report.create({
        data: {
          eventId,
          reporterId,
          type,
          description,
          state: "submitted",
          incidentAt: incidentAt ? new Date(incidentAt) : undefined,
          parties: parties || undefined,
        },
      });
      // If evidence files are uploaded, store in DB
      const uploaderId = reporterId;
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await prisma.evidenceFile.create({
            data: {
              reportId: report.id,
              filename: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              data: file.buffer,
              uploaderId,
            },
          });
        }
      }
      res.status(201).json({ report });
    } catch (err) {
      console.error("Error creating report:", err);
      res
        .status(500)
        .json({ error: "Failed to submit report.", details: err.message });
    }
  },
);

// Admin: List all users (Super Admin only)
app.get("/admin/users", requireSuperAdmin(), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to list users.", details: err.message });
  }
});

// Admin: List all roles (Super Admin only)
app.get("/admin/roles", requireSuperAdmin(), async (req, res) => {
  try {
    const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
    res.json({ roles });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to list roles.", details: err.message });
  }
});

// Admin: Search users by email or name (Super Admin only)
app.get("/admin/users/search", requireSuperAdmin(), async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: "Query parameter is required." });
  }
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to search users.", details: err.message });
  }
});

// Admin: Create/invite a new user (Super Admin only)
app.post("/admin/users", requireSuperAdmin(), async (req, res) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered." });
    }
    const user = await prisma.user.create({ data: { email, name } });
    // In a real system, send invite email here
    res.status(201).json({ message: "User created/invited.", user });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create/invite user.", details: err.message });
  }
});

// List all reports for an event
app.get("/events/:eventId/reports", async (req, res) => {
  const { eventId } = req.params;
  try {
    const reports = await prisma.report.findMany({
      where: { eventId },
      include: { reporter: true, evidenceFiles: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ reports });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch reports", details: err.message });
  }
});

// Get a single report for an event by report ID
app.get("/events/:eventId/reports/:reportId", async (req, res) => {
  const { eventId, reportId } = req.params;
  if (!eventId || !reportId) {
    return res
      .status(400)
      .json({ error: "eventId and reportId are required." });
  }
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { reporter: true, evidenceFiles: true },
    });
    if (!report || report.eventId !== eventId) {
      return res
        .status(404)
        .json({ error: "Report not found for this event." });
    }
    res.json({ report });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch report", details: err.message });
  }
});

// Change the state of a report (Responder/Admin/SuperAdmin only)
app.patch(
  "/events/:eventId/reports/:reportId/state",
  requireRole(["Responder", "Admin", "SuperAdmin"]),
  async (req, res) => {
    const { eventId, reportId } = req.params;
    const { state } = req.body;
    const validStates = [
      "submitted",
      "acknowledged",
      "investigating",
      "resolved",
      "closed",
    ];
    if (!state || !validStates.includes(state)) {
      return res.status(400).json({ error: "Invalid or missing state." });
    }
    try {
      // Check report exists and belongs to event
      const report = await prisma.report.findUnique({
        where: { id: reportId },
      });
      if (!report || report.eventId !== eventId) {
        return res
          .status(404)
          .json({ error: "Report not found for this event." });
      }
      // Update state
      const updated = await prisma.report.update({
        where: { id: reportId },
        data: { state },
        include: { reporter: true },
      });
      res.json({ report: updated });
    } catch (err) {
      res
        .status(500)
        .json({ error: "Failed to update report state", details: err.message });
    }
  },
);

// Utility: resolve event slug to eventId
async function getEventIdBySlug(slug) {
  const event = await prisma.event.findUnique({ where: { slug } });
  return event ? event.id : null;
}

// Get event details by slug (public, for routing)
app.get("/event/slug/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }
    res.json({ event });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch event by slug.", details: err.message });
  }
});

// Slug-based: List all reports for an event
app.get("/events/slug/:slug/reports", async (req, res) => {
  const { slug } = req.params;
  const { userId } = req.query;
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: "Event not found." });
    }
    const where = { eventId };
    if (userId) {
      where.reporterId = userId;
    }
    const reports = await prisma.report.findMany({
      where,
      include: {
        reporter: true,
        assignedResponder: true,
        evidenceFiles: {
          include: {
            uploader: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ reports });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch reports", details: err.message });
  }
});

// Slug-based: Submit a report for an event (anonymous or authenticated, with evidence upload)
app.post(
  "/events/slug/:slug/reports",
  upload.array("evidence", 10),
  async (req, res) => {
    const { slug } = req.params;
    const { type, description, incidentAt, parties } = req.body;
    if (!type || !description) {
      return res
        .status(400)
        .json({ error: "type and description are required." });
    }
    try {
      const eventId = await getEventIdBySlug(slug);
      if (!eventId) {
        return res.status(404).json({ error: "Event not found." });
      }
      // If authenticated, use req.user.id as reporterId; else null
      const reporterId =
        req.isAuthenticated && req.isAuthenticated() && req.user
          ? req.user.id
          : null;
      // Create report first
      const report = await prisma.report.create({
        data: {
          eventId,
          reporterId,
          type,
          description,
          state: "submitted",
          incidentAt: incidentAt ? new Date(incidentAt) : undefined,
          parties: parties || undefined,
        },
      });
      // If evidence files are uploaded, store in DB
      const uploaderId = reporterId;
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await prisma.evidenceFile.create({
            data: {
              reportId: report.id,
              filename: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              data: file.buffer,
              uploaderId,
            },
          });
        }
      }
      res.status(201).json({ report });
    } catch (err) {
      console.error("Error creating report:", err);
      res
        .status(500)
        .json({ error: "Failed to submit report.", details: err.message });
    }
  },
);

// Slug-based: Get a single report for an event by report ID
app.get("/events/slug/:slug/reports/:reportId", async (req, res) => {
  const { slug, reportId } = req.params;
  if (!slug || !reportId) {
    return res.status(400).json({ error: "slug and reportId are required." });
  }
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: "Event not found." });
    }
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: true,
        assignedResponder: true,
        evidenceFiles: {
          include: {
            uploader: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!report || report.eventId !== eventId) {
      return res
        .status(404)
        .json({ error: "Report not found for this event." });
    }
    res.json({ report });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch report", details: err.message });
  }
});

// Slug-based: Change the state of a report (Responder/Admin/SuperAdmin only)
app.patch(
  "/events/slug/:slug/reports/:reportId",
  requireRole(["Responder", "Admin", "SuperAdmin"]),
  async (req, res) => {
    const { slug, reportId } = req.params;
    const { assignedResponderId, severity, resolution, state } = req.body;
    try {
      const eventId = await getEventIdBySlug(slug);
      if (!eventId) return res.status(404).json({ error: "Event not found." });
      const report = await prisma.report.findUnique({
        where: { id: reportId },
      });
      if (!report || report.eventId !== eventId) {
        return res
          .status(404)
          .json({ error: "Report not found for this event." });
      }
      const data = {};
      if (assignedResponderId !== undefined)
        data.assignedResponderId = assignedResponderId;
      if (severity !== undefined) data.severity = severity;
      if (resolution !== undefined) data.resolution = resolution;
      if (state !== undefined) data.state = state;
      const updated = await prisma.report.update({
        where: { id: reportId },
        data,
        include: {
          reporter: true,
          assignedResponder: true,
          evidenceFiles: {
            include: {
              uploader: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });
      res.json({ report: updated });
    } catch (err) {
      res
        .status(500)
        .json({ error: "Failed to update report", details: err.message });
    }
  },
);

// Slug-based: List all users and their roles for an event
app.get("/events/slug/:slug/users", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const { slug } = req.params;
  const {
    search,
    sort = "name",
    order = "asc",
    page = 1,
    limit = 10,
    role,
  } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  if (!slug) {
    return res.status(400).json({ error: "Missing slug in params" });
  }
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: "Event not found." });
    }
    // Check for SuperAdmin role globally
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    console.log("[DEBUG] allUserRoles:", allUserRoles);
    const isSuperAdmin = allUserRoles.some(
      (uer) => uer.role.name === "SuperAdmin",
    );
    if (!isSuperAdmin) {
      // Otherwise, check for allowed roles for this event
      const userRoles = allUserRoles.filter((uer) => uer.eventId === eventId);
      console.log("[DEBUG] userRoles for event", eventId, ":", userRoles);
      const hasRole = userRoles.some((uer) =>
        ["Admin", "Responder", "SuperAdmin"].includes(uer.role.name),
      );
      if (!hasRole) {
        return res.status(403).json({ error: "Forbidden: insufficient role" });
      }
    }
    // Handler logic: fetch users for the event
    const userEventRoleWhere = { eventId };
    if (role) {
      userEventRoleWhere.role = { name: role };
    }
    if (search) {
      userEventRoleWhere.user = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }
    const userEventRoles = await prisma.userEventRole.findMany({
      where: userEventRoleWhere,
      include: { user: true, role: true },
      orderBy: [{ user: { [sort]: order } }],
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });
    // Group roles by user
    const users = {};
    userEventRoles.forEach((uer) => {
      if (!users[uer.userId]) {
        users[uer.userId] = {
          id: uer.user.id,
          email: uer.user.email,
          name: uer.user.name,
          roles: [],
        };
      }
      users[uer.userId].roles.push(uer.role.name);
    });
    // For pagination: count total matching users
    const total = await prisma.userEventRole.count({
      where: userEventRoleWhere,
    });
    res.json({ users: Object.values(users), total });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to list users for event.", details: err.message });
  }
});

// PATCH: Update a user's name, email, and role for a specific event
app.patch("/events/slug/:slug/users/:userId", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const { slug, userId } = req.params;
  const { name, email, role } = req.body;
  if (!slug || !userId || !role) {
    return res.status(400).json({ error: "Missing slug, userId, or role" });
  }
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: "Event not found." });
    }
    // Check for SuperAdmin role globally
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    const isSuperAdmin = allUserRoles.some(
      (uer) => uer.role.name === "SuperAdmin",
    );
    if (!isSuperAdmin) {
      // Otherwise, check for Admin role for this event
      const userRoles = allUserRoles.filter((uer) => uer.eventId === eventId);
      const hasRole = userRoles.some((uer) => uer.role.name === "Admin");
      if (!hasRole) {
        return res.status(403).json({ error: "Forbidden: insufficient role" });
      }
    }
    // Update user name/email if changed
    await prisma.user.update({
      where: { id: userId },
      data: { name, email },
    });
    // Update role for this event: remove old roles, add new one
    const eventRoles = await prisma.userEventRole.findMany({
      where: { userId, eventId },
    });
    for (const er of eventRoles) {
      await prisma.userEventRole.delete({ where: { id: er.id } });
    }
    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) {
      return res.status(400).json({ error: "Invalid role" });
    }
    await prisma.userEventRole.create({
      data: {
        userId,
        eventId,
        roleId: roleRecord.id,
      },
    });
    res.json({ message: "User updated." });
  } catch (err) {
    res.status(500).json({
      error: "Failed to update user for event.",
      details: err.message,
    });
  }
});

// DELETE: Remove all roles for a user for a specific event
app.delete("/events/slug/:slug/users/:userId", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const { slug, userId } = req.params;
  if (!slug || !userId) {
    return res.status(400).json({ error: "Missing slug or userId" });
  }
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: "Event not found." });
    }
    // Check for SuperAdmin role globally
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    const isSuperAdmin = allUserRoles.some(
      (uer) => uer.role.name === "SuperAdmin",
    );
    if (!isSuperAdmin) {
      // Otherwise, check for Admin role for this event
      const userRoles = allUserRoles.filter((uer) => uer.eventId === eventId);
      const hasRole = userRoles.some((uer) => uer.role.name === "Admin");
      if (!hasRole) {
        return res.status(403).json({ error: "Forbidden: insufficient role" });
      }
    }
    // Remove all roles for this user for this event
    await prisma.userEventRole.deleteMany({
      where: { userId, eventId },
    });
    res.json({ message: "User removed from event." });
  } catch (err) {
    res.status(500).json({
      error: "Failed to remove user from event.",
      details: err.message,
    });
  }
});

// Helper to generate a random invite code
function generateInviteCode(length = 16) {
  return crypto.randomBytes(length).toString("hex");
}

// List all invite links for an event (admin only)
app.get("/events/slug/:slug/invites", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const { slug } = req.params;
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) return res.status(404).json({ error: "Event not found." });
    // Check admin rights
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    const isSuperAdmin = allUserRoles.some(
      (uer) => uer.role.name === "SuperAdmin",
    );
    if (!isSuperAdmin) {
      const userRoles = allUserRoles.filter((uer) => uer.eventId === eventId);
      const hasRole = userRoles.some((uer) => uer.role.name === "Admin");
      if (!hasRole)
        return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    const invites = await prisma.eventInviteLink.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      include: { role: true },
    });
    const baseUrl = process.env.FRONTEND_BASE_URL || "http://localhost:3001";
    const invitesWithUrl = invites.map((invite) => ({
      ...invite,
      url: `${baseUrl}/invite/${invite.code}`,
    }));
    res.json({ invites: invitesWithUrl });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to list invites.", details: err.message });
  }
});

// Create a new invite link for an event (admin only)
app.post("/events/slug/:slug/invites", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const { slug } = req.params;
  const { maxUses, expiresAt, note, role } = req.body;
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) return res.status(404).json({ error: "Event not found." });
    // Check admin rights
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    const isSuperAdmin = allUserRoles.some(
      (uer) => uer.role.name === "SuperAdmin",
    );
    if (!isSuperAdmin) {
      const userRoles = allUserRoles.filter((uer) => uer.eventId === eventId);
      const hasRole = userRoles.some((uer) => uer.role.name === "Admin");
      if (!hasRole)
        return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    // Look up role
    const roleName = role || "Reporter";
    const roleRecord = await prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!roleRecord) return res.status(400).json({ error: "Invalid role" });
    const code = generateInviteCode(8);
    const invite = await prisma.eventInviteLink.create({
      data: {
        eventId,
        code,
        createdByUserId: req.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses ? Number(maxUses) : null,
        note: note || null,
        roleId: roleRecord.id,
      },
    });
    const baseUrl = process.env.FRONTEND_BASE_URL || "http://localhost:3001";
    res.status(201).json({
      invite: {
        ...invite,
        url: `${baseUrl}/invite/${invite.code}`,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create invite.", details: err.message });
  }
});

// Disable (or update) an invite link (admin only)
app.patch("/events/slug/:slug/invites/:inviteId", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const { slug, inviteId } = req.params;
  const { disabled, note, expiresAt, maxUses } = req.body;
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) return res.status(404).json({ error: "Event not found." });
    // Check admin rights
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    const isSuperAdmin = allUserRoles.some(
      (uer) => uer.role.name === "SuperAdmin",
    );
    if (!isSuperAdmin) {
      const userRoles = allUserRoles.filter((uer) => uer.eventId === eventId);
      const hasRole = userRoles.some((uer) => uer.role.name === "Admin");
      if (!hasRole)
        return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    const updateData = {};
    if (typeof disabled === "boolean") updateData.disabled = disabled;
    if (note !== undefined) updateData.note = note;
    if (expiresAt !== undefined)
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (maxUses !== undefined)
      updateData.maxUses = maxUses ? Number(maxUses) : null;
    const invite = await prisma.eventInviteLink.update({
      where: { id: inviteId },
      data: updateData,
    });
    res.json({ invite });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update invite.", details: err.message });
  }
});

// Redeem an invite link (register with invite)
app.post("/register/invite/:inviteCode", async (req, res) => {
  const { inviteCode } = req.params;
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  try {
    const invite = await prisma.eventInviteLink.findUnique({
      where: { code: inviteCode },
    });
    if (!invite || invite.disabled) {
      return res
        .status(400)
        .json({ error: "Invalid or disabled invite link." });
    }
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Invite link has expired." });
    }
    if (invite.maxUses && invite.useCount >= invite.maxUses) {
      return res
        .status(400)
        .json({ error: "Invite link has reached its maximum uses." });
    }
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });
    // Assign role for the event from invite
    const roleId = invite.roleId;
    await prisma.userEventRole.create({
      data: {
        userId: user.id,
        eventId: invite.eventId,
        roleId,
      },
    });
    // Increment useCount
    await prisma.eventInviteLink.update({
      where: { code: inviteCode },
      data: { useCount: { increment: 1 } },
    });
    res.status(201).json({
      message: "Registration successful!",
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to register with invite.", details: err.message });
  }
});

// GET: Get invite details and event info by invite code
app.get("/invites/:code", async (req, res) => {
  const { code } = req.params;
  try {
    const invite = await prisma.eventInviteLink.findUnique({ where: { code } });
    if (!invite) return res.status(404).json({ error: "Invite not found." });
    const event = await prisma.event.findUnique({
      where: { id: invite.eventId },
    });
    if (!event) return res.status(404).json({ error: "Event not found." });
    res.json({ invite, event });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch invite details.", details: err.message });
  }
});

// PATCH: Update an event's metadata (SuperAdmin or Admin for the event)
app.patch("/events/slug/:slug", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const { slug } = req.params;
  const {
    name,
    newSlug,
    description,
    logo,
    startDate,
    endDate,
    website,
    codeOfConduct,
  } = req.body;
  if (
    !name &&
    !newSlug &&
    !description &&
    !logo &&
    !startDate &&
    !endDate &&
    !website &&
    !codeOfConduct
  ) {
    return res.status(400).json({ error: "Nothing to update." });
  }
  try {
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }
    // RBAC: allow SuperAdmin or Admin for this event
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    const isSuperAdmin = allUserRoles.some(
      (uer) => uer.role.name === "SuperAdmin",
    );
    let isEventAdmin = false;
    if (!isSuperAdmin) {
      const userRoles = allUserRoles.filter((uer) => uer.eventId === event.id);
      isEventAdmin = userRoles.some((uer) => uer.role.name === "Admin");
      if (!isEventAdmin) {
        return res.status(403).json({ error: "Forbidden: insufficient role" });
      }
    }
    // If updating slug, check for conflicts
    if (newSlug && newSlug !== slug) {
      const existing = await prisma.event.findUnique({
        where: { slug: newSlug },
      });
      if (existing) {
        return res.status(409).json({ error: "Slug already exists." });
      }
    }
    // Build update data
    const updateData = {};
    if (name) updateData.name = name;
    if (newSlug) updateData.slug = newSlug;
    if (description !== undefined) updateData.description = description;
    if (logo !== undefined) updateData.logo = logo;
    if (startDate !== undefined)
      updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined)
      updateData.endDate = endDate ? new Date(endDate) : null;
    if (website !== undefined) updateData.website = website;
    if (codeOfConduct !== undefined) updateData.codeOfConduct = codeOfConduct;
    const updated = await prisma.event.update({
      where: { slug },
      data: updateData,
    });
    res.json({ event: updated });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update event.", details: err.message });
  }
});

/**
 * Upload a new logo for an event (Admins/SuperAdmins only)
 * POST /events/slug/:slug/logo
 * Body: multipart/form-data { logo: file }
 * Stores the logo in the EventLogo table as a BLOB and updates the event's logo field to the GET endpoint URL
 */
app.post("/events/slug/:slug/logo", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const { slug } = req.params;
  try {
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }
    // RBAC: allow SuperAdmin or Admin for this event
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    const isSuperAdmin = allUserRoles.some(
      (uer) => uer.role.name === "SuperAdmin",
    );
    let isEventAdmin = false;
    if (!isSuperAdmin) {
      const userRoles = allUserRoles.filter((uer) => uer.eventId === event.id);
      isEventAdmin = userRoles.some((uer) => uer.role.name === "Admin");
      if (!isEventAdmin) {
        return res.status(403).json({ error: "Forbidden: insufficient role" });
      }
    }
    uploadLogo.single("logo")(req, res, async function (err) {
      if (err) {
        return res
          .status(400)
          .json({ error: "File upload failed", details: err.message });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }
      // Remove any existing logo for this event
      await prisma.eventLogo.deleteMany({ where: { eventId: event.id } });
      // Store new logo in DB
      await prisma.eventLogo.create({
        data: {
          eventId: event.id,
          filename: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          data: req.file.buffer,
        },
      });
      // No need to update event.logo field; just return the event
      res.status(200).json({ event });
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to upload logo.", details: err.message });
  }
});

/**
 * Serve the event logo by slug (public)
 * GET /events/slug/:slug/logo
 */
app.get("/events/slug/:slug/logo", async (req, res) => {
  const { slug } = req.params;
  try {
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return res.status(404).send("Event not found");
    const logo = await prisma.eventLogo.findUnique({
      where: { eventId: event.id },
    });
    if (!logo) return res.status(404).send("Logo not found");
    res.setHeader("Content-Type", logo.mimetype);
    res.setHeader("Content-Disposition", `inline; filename="${logo.filename}"`);
    res.send(logo.data);
  } catch (err) {
    res.status(500).send("Failed to fetch logo");
  }
});

// Slug-based: List comments for a report
app.get("/events/slug/:slug/reports/:reportId/comments", async (req, res) => {
  const { slug, reportId } = req.params;
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) return res.status(404).json({ error: "Event not found." });
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report || report.eventId !== eventId) {
      return res
        .status(404)
        .json({ error: "Report not found for this event." });
    }
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id, eventId },
      include: { role: true },
    });
    const roles = userEventRoles.map((uer) => uer.role.name);
    const isResponderOrAbove = roles.some((r) =>
      ["Responder", "Admin", "SuperAdmin"].includes(r),
    );
    const where = { reportId };
    if (!isResponderOrAbove) {
      where.visibility = "public";
    }
    const comments = await prisma.reportComment.findMany({
      where,
      include: { author: true },
      orderBy: { createdAt: "asc" },
    });
    res.json({ comments });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch comments", details: err.message });
  }
});

// Slug-based: Create a comment for a report
app.post("/events/slug/:slug/reports/:reportId/comments", async (req, res) => {
  const { slug, reportId } = req.params;
  const { body, visibility } = req.body;
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (!body || body.trim().length === 0) {
    return res.status(400).json({ error: "Comment body is required." });
  }
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) return res.status(404).json({ error: "Event not found." });
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report || report.eventId !== eventId) {
      return res
        .status(404)
        .json({ error: "Report not found for this event." });
    }
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id, eventId },
      include: { role: true },
    });
    const roles = userEventRoles.map((uer) => uer.role.name);
    const isResponderOrAbove = roles.some((r) =>
      ["Responder", "Admin", "SuperAdmin"].includes(r),
    );
    const isReporter = report.reporterId && req.user.id === report.reporterId;
    if (!isResponderOrAbove && !isReporter) {
      return res.status(403).json({
        error: "Only responders, admins, or the original reporter can comment.",
      });
    }
    let commentVisibility = "public";
    if (visibility === "internal") {
      if (!isResponderOrAbove) {
        return res.status(403).json({
          error: "Only responders/admins can create internal comments.",
        });
      }
      commentVisibility = "internal";
    }
    const comment = await prisma.reportComment.create({
      data: {
        reportId,
        authorId: req.user.id,
        body,
        visibility: commentVisibility,
      },
      include: { author: true },
    });
    res.status(201).json({ comment });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create comment", details: err.message });
  }
});

// Slug-based: Edit a comment
app.patch(
  "/events/slug/:slug/reports/:reportId/comments/:commentId",
  async (req, res) => {
    const { slug, reportId, commentId } = req.params;
    const { body, visibility } = req.body;
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!body || body.trim().length === 0) {
      return res.status(400).json({ error: "Comment body is required." });
    }
    try {
      const eventId = await getEventIdBySlug(slug);
      if (!eventId) return res.status(404).json({ error: "Event not found." });
      const comment = await prisma.reportComment.findUnique({
        where: { id: commentId },
      });
      if (!comment) {
        return res.status(404).json({ error: "Comment not found." });
      }
      const report = await prisma.report.findUnique({
        where: { id: reportId },
      });
      if (
        !report ||
        report.eventId !== eventId ||
        comment.reportId !== reportId
      ) {
        return res
          .status(404)
          .json({ error: "Report or comment not found for this event." });
      }
      // Only author can edit
      if (comment.authorId !== req.user.id) {
        return res
          .status(403)
          .json({ error: "Only the author can edit this comment." });
      }
      // Only responders/admins can set internal visibility
      const userEventRoles = await prisma.userEventRole.findMany({
        where: { userId: req.user.id, eventId },
        include: { role: true },
      });
      const roles = userEventRoles.map((uer) => uer.role.name);
      let commentVisibility = comment.visibility;
      if (visibility && visibility !== comment.visibility) {
        if (
          visibility === "internal" &&
          !roles.some((r) => ["Responder", "Admin", "SuperAdmin"].includes(r))
        ) {
          return res.status(403).json({
            error: "Only responders/admins can set internal visibility.",
          });
        }
        commentVisibility = visibility;
      }
      const updated = await prisma.reportComment.update({
        where: { id: commentId },
        data: { body, visibility: commentVisibility },
        include: { author: true },
      });
      res.json({ comment: updated });
    } catch (err) {
      res
        .status(500)
        .json({ error: "Failed to update comment", details: err.message });
    }
  },
);

// Slug-based: Delete a comment
app.delete(
  "/events/slug/:slug/reports/:reportId/comments/:commentId",
  async (req, res) => {
    const { slug, reportId, commentId } = req.params;
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const eventId = await getEventIdBySlug(slug);
      if (!eventId) return res.status(404).json({ error: "Event not found." });
      const comment = await prisma.reportComment.findUnique({
        where: { id: commentId },
      });
      if (!comment) {
        return res.status(404).json({ error: "Comment not found." });
      }
      const report = await prisma.report.findUnique({
        where: { id: reportId },
      });
      if (
        !report ||
        report.eventId !== eventId ||
        comment.reportId !== reportId
      ) {
        return res
          .status(404)
          .json({ error: "Report or comment not found for this event." });
      }
      const userEventRoles = await prisma.userEventRole.findMany({
        where: { userId: req.user.id, eventId },
        include: { role: true },
      });
      const roles = userEventRoles.map((uer) => uer.role.name);
      const isAdminOrAbove = roles.some((r) =>
        ["Admin", "SuperAdmin"].includes(r),
      );
      // Only author or admin can delete
      if (comment.authorId !== req.user.id && !isAdminOrAbove) {
        return res.status(403).json({
          error: "Only the author or an admin can delete this comment.",
        });
      }
      await prisma.reportComment.delete({ where: { id: commentId } });
      res.json({ message: "Comment deleted." });
    } catch (err) {
      res
        .status(500)
        .json({ error: "Failed to delete comment", details: err.message });
    }
  },
);

// Get current user's roles for an event by slug
app.get("/events/slug/:slug/my-roles", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const { slug } = req.params;
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: "Event not found." });
    }
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id, eventId },
      include: { role: true },
    });
    const roles = userEventRoles.map((uer) => uer.role.name);
    res.json({ roles });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch user roles for event.",
      details: err.message,
    });
  }
});

// Get all events the current user has a role on
app.get("/users/me/events", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id, eventId: { not: null } },
      include: { event: true, role: true },
    });
    // Group by event
    const eventsMap = {};
    userEventRoles.forEach((uer) => {
      if (!uer.event) return;
      if (!eventsMap[uer.event.id]) {
        eventsMap[uer.event.id] = {
          id: uer.event.id,
          name: uer.event.name,
          slug: uer.event.slug,
          roles: [],
        };
      }
      eventsMap[uer.event.id].roles.push(uer.role.name);
    });
    const events = Object.values(eventsMap);
    res.json({ events });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch user events.", details: err.message });
  }
});

// Endpoint to download evidence file for a report
app.get("/reports/:reportId/evidence", async (req, res) => {
  const { reportId } = req.params;
  try {
    const evidence = await prisma.evidenceFile.findUnique({
      where: { reportId },
    });
    if (!evidence) {
      return res
        .status(404)
        .json({ error: "No evidence file found for this report." });
    }
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${evidence.filename}"`,
    );
    res.setHeader("Content-Type", evidence.mimetype);
    res.setHeader("Content-Length", evidence.size);
    res.send(evidence.data);
  } catch (err) {
    res.status(500).json({
      error: "Failed to download evidence file.",
      details: err.message,
    });
  }
});

// Upload one or more evidence files to a report
app.post(
  "/reports/:reportId/evidence",
  multiUpload.array("evidence", 10),
  async (req, res) => {
    const { reportId } = req.params;
    // TODO: Auth check: only reporter, responder, or admin can upload
    try {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
      });
      if (!report) return res.status(404).json({ error: "Report not found." });
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded." });
      }
      const uploaderId =
        req.isAuthenticated && req.isAuthenticated() && req.user
          ? req.user.id
          : null;
      const created = [];
      for (const file of req.files) {
        const evidence = await prisma.evidenceFile.create({
          data: {
            reportId: report.id,
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            data: file.buffer,
            uploaderId,
          },
          include: {
            uploader: { select: { id: true, name: true, email: true } },
          },
        });
        created.push({
          id: evidence.id,
          filename: evidence.filename,
          mimetype: evidence.mimetype,
          size: evidence.size,
          createdAt: evidence.createdAt,
          uploader: evidence.uploader,
        });
      }
      res.status(201).json({ files: created });
    } catch (err) {
      res.status(500).json({
        error: "Failed to upload evidence files.",
        details: err.message,
      });
    }
  },
);

// List all evidence files for a report (metadata only)
app.get("/reports/:reportId/evidence", async (req, res) => {
  const { reportId } = req.params;
  try {
    const files = await prisma.evidenceFile.findMany({
      where: { reportId },
      select: {
        id: true,
        filename: true,
        mimetype: true,
        size: true,
        createdAt: true,
        uploader: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json({ files });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to list evidence files.", details: err.message });
  }
});

// Download a specific evidence file by its ID
app.get("/evidence/:evidenceId/download", async (req, res) => {
  const { evidenceId } = req.params;
  try {
    const evidence = await prisma.evidenceFile.findUnique({
      where: { id: evidenceId },
    });
    if (!evidence)
      return res.status(404).json({ error: "Evidence file not found." });
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${evidence.filename}"`,
    );
    res.setHeader("Content-Type", evidence.mimetype);
    res.setHeader("Content-Length", evidence.size);
    res.send(evidence.data);
  } catch (err) {
    res.status(500).json({
      error: "Failed to download evidence file.",
      details: err.message,
    });
  }
});

// (Optional) Delete an evidence file
app.delete("/evidence/:evidenceId", async (req, res) => {
  const { evidenceId } = req.params;
  // TODO: Auth check: only reporter or admin can delete
  try {
    const evidence = await prisma.evidenceFile.findUnique({
      where: { id: evidenceId },
    });
    if (!evidence)
      return res.status(404).json({ error: "Evidence file not found." });
    await prisma.evidenceFile.delete({ where: { id: evidenceId } });
    res.json({ message: "Evidence file deleted." });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete evidence file.", details: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend server listening on port ${PORT}`);
  });
}

module.exports = app;
