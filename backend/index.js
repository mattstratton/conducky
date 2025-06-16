// Load environment variables first, especially for test environment
if (process.env.NODE_ENV === 'test') {
  require('dotenv').config({ path: '.env.test', override: true });
}

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const cors = require("cors");
const app = express();

// Initialize Prisma client (after environment is loaded)
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;
const { logAudit } = require("./utils/audit");
const { requireRole, requireSuperAdmin } = require("./utils/rbac");
const crypto = require("crypto");
const { createUploadMiddleware } = require("./utils/upload");
const { emailService } = require("./utils/email");
const avatarUpload = createUploadMiddleware({
  allowedMimeTypes: ["image/png", "image/jpeg"],
  maxSizeMB: 2,
});

// Global request logger
app.use((req, res, next) => {
  console.log("[GLOBAL] Incoming request:", req.method, req.url);
  next();
});

// Add test-only authentication middleware for tests
if (process.env.NODE_ENV === "test") {
  app.use((req, res, next) => {
    // Allow disabling authentication for specific tests
    const disableAuth = req.headers["x-test-disable-auth"];
    if (disableAuth === "true") {
      req.isAuthenticated = () => false;
      req.user = null;
      next();
      return;
    }
    
    // Allow setting specific user via header
    const testUserId = req.headers["x-test-user-id"];
    if (testUserId) {
      req.isAuthenticated = () => true;
      req.user = {
        id: testUserId,
        email: `${testUserId}@example.com`,
        name: `User${testUserId}`,
      };
    } else {
      // Default authenticated user
      req.isAuthenticated = () => true;
      req.user = { id: "1", email: "admin@example.com", name: "Admin" };
    }
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

// Check email availability
app.get("/auth/check-email", async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: "Email parameter is required." });
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    res.json({ available: !existing });
  } catch (err) {
    res.status(500).json({ error: "Failed to check email availability.", details: err.message });
  }
});

// Helper function to validate password strength
function validatePassword(password) {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
  
  const score = Object.values(requirements).filter(Boolean).length;
  const isValid = score === 5; // All requirements must be met
  
  return { isValid, requirements, score };
}

// Register route
app.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  
  // Enhanced validation
  if (!email || !password || !name) {
    return res.status(400).json({ 
      error: "Name, email, and password are required." 
    });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      error: "Please enter a valid email address." 
    });
  }
  
  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ 
      error: "Password must meet all security requirements: at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character." 
    });
  }
  
  // Validate name length
  if (name.trim().length < 1) {
    return res.status(400).json({ 
      error: "Name is required." 
    });
  }
  
  try {
    const existing = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    if (existing) {
      return res.status(409).json({ error: "Email already registered." });
    }
    
    const userCount = await prisma.user.count();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        email: email.toLowerCase(), 
        passwordHash, 
        name: name.trim() 
      },
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
    console.error("Registration error:", err);
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
    // Check for avatar
    const avatar = await prisma.userAvatar.findUnique({
      where: { userId: req.user.id },
    });
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        roles,
        avatarUrl: avatar ? `/users/${req.user.id}/avatar` : null,
      },
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

// Rate limiting for password reset attempts
const resetAttempts = new Map(); // In production, use Redis or database
const RESET_RATE_LIMIT = 3; // Max attempts per window
const RESET_RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkResetRateLimit(email) {
  const now = Date.now();
  const attempts = resetAttempts.get(email) || { count: 0, firstAttempt: now };
  
  // Reset window if enough time has passed
  if (now - attempts.firstAttempt > RESET_RATE_WINDOW) {
    attempts.count = 0;
    attempts.firstAttempt = now;
  }
  
  if (attempts.count >= RESET_RATE_LIMIT) {
    return {
      allowed: false,
      timeRemaining: RESET_RATE_WINDOW - (now - attempts.firstAttempt)
    };
  }
  
  // Increment attempt count
  attempts.count++;
  resetAttempts.set(email, attempts);
  
  return { allowed: true };
}

// Forgot password - send reset email
app.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  
  // Check rate limiting
  const rateCheck = checkResetRateLimit(email.toLowerCase());
  if (!rateCheck.allowed) {
    const minutesRemaining = Math.ceil(rateCheck.timeRemaining / (60 * 1000));
    return res.status(429).json({ 
      error: `Too many password reset attempts. Please try again in ${minutesRemaining} minutes.` 
    });
  }
  
  try {
    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    
    // Always return success to prevent email enumeration
    // but only send email if user exists
    if (user) {
      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      
      // Clean up old tokens for this user and expired tokens system-wide
      await prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { userId: user.id },
            { expiresAt: { lt: new Date() } }
          ]
        }
      });
      
      // Create new reset token
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt
        }
      });
      
      // Send password reset email
      try {
        await emailService.sendPasswordReset(user.email, user.name, resetToken);
        console.log(`[Auth] Password reset email sent to ${user.email}`);
      } catch (emailError) {
        console.error('[Auth] Failed to send reset email:', emailError);
        // Continue - don't expose email sending errors to user
      }
    }
    
    // Always return the same response to prevent email enumeration
    res.json({ 
      message: "If an account with that email exists, we've sent a password reset link." 
    });
  } catch (err) {
    console.error('[Auth] Forgot password error:', err);
    res.status(500).json({ error: "Failed to process password reset request." });
  }
});

// Reset password with token
app.post("/auth/reset-password", async (req, res) => {
  const { token, password } = req.body;
  
  if (!token || !password) {
    return res.status(400).json({ error: "Token and password are required." });
  }
  
  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ 
      error: "Password must meet all security requirements: at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character." 
    });
  }
  
  try {
    // Find valid token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });
    
    if (!resetToken) {
      return res.status(400).json({ error: "Invalid or expired reset token." });
    }
    
    if (resetToken.used) {
      return res.status(400).json({ error: "Reset token has already been used." });
    }
    
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({ error: "Reset token has expired." });
    }
    
    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Update user password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true }
      })
    ]);
    
    console.log(`[Auth] Password reset successful for user ${resetToken.user.email}`);
    
    res.json({ message: "Password has been reset successfully. You can now login with your new password." });
  } catch (err) {
    console.error('[Auth] Reset password error:', err);
    res.status(500).json({ error: "Failed to reset password." });
  }
});

// Validate reset token
app.get("/auth/validate-reset-token", async (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).json({ error: "Token is required." });
  }
  
  try {
    // Find the token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { email: true } } }
    });
    
    if (!resetToken) {
      return res.status(400).json({ 
        valid: false, 
        error: "Invalid reset token." 
      });
    }
    
    if (resetToken.used) {
      return res.status(400).json({ 
        valid: false, 
        error: "Reset token has already been used." 
      });
    }
    
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({ 
        valid: false, 
        error: "Reset token has expired." 
      });
    }
    
    // Token is valid
    res.json({ 
      valid: true, 
      email: resetToken.user.email,
      expiresAt: resetToken.expiresAt
    });
  } catch (err) {
    console.error('[Auth] Validate reset token error:', err);
    res.status(500).json({ error: "Failed to validate reset token." });
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
        ["Admin", "Responder", "SuperAdmin"].includes(uer.role.name),
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
    for (const uer of userEventRoles) {
      if (!users[uer.userId]) {
        // Fetch avatar for each user
        const avatar = await prisma.userAvatar.findUnique({
          where: { userId: uer.user.id },
        });
        users[uer.userId] = {
          id: uer.user.id,
          email: uer.user.email,
          name: uer.user.name,
          roles: [],
          avatarUrl: avatar ? `/users/${uer.user.id}/avatar` : null,
        };
      }
      users[uer.userId].roles.push(uer.role.name);
    }
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
    const { type, description, incidentAt, parties, title } = req.body;
    if (!type || !description || !title) {
      return res
        .status(400)
        .json({ error: "type, title, and description are required." });
    }
    if (typeof title !== "string" || title.length < 10 || title.length > 70) {
      return res.status(400).json({ error: "title must be 10-70 characters." });
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
          title,
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

      // Create notification for report submission
      try {
        await notifyReportEvent(report.id, 'report_submitted', req.user?.id || null);
      } catch (notifyErr) {
        console.error('Failed to create notification for report submission:', notifyErr);
        // Don't fail the request if notification fails
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
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Event not found." });
    }
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
      // Store original state for notification comparison
      const originalState = report.state;
      
      // Update state
      const updated = await prisma.report.update({
        where: { id: reportId },
        data: { state },
        include: { reporter: true },
      });

      // Create notification for state change
      try {
        if (state !== originalState) {
          await notifyReportEvent(reportId, 'report_status_changed', req.user.id);
        }
      } catch (notifyErr) {
        console.error('Failed to create notification for state change:', notifyErr);
        // Don't fail the request if notification fails
      }

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
    const { type, description, incidentAt, parties, title } = req.body;
    if (!type || !description || !title) {
      return res
        .status(400)
        .json({ error: "type, title, and description are required." });
    }
    if (typeof title !== "string" || title.length < 10 || title.length > 70) {
      return res.status(400).json({ error: "title must be 10-70 characters." });
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
          title,
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

      // Create notification for report submission
      try {
        await notifyReportEvent(report.id, 'report_submitted', req.user?.id || null);
      } catch (notifyErr) {
        console.error('Failed to create notification for report submission:', notifyErr);
        // Don't fail the request if notification fails
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
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
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
      return res.status(404).json({ error: "Report not found for this event." });
    }
    // Access control: allow reporter or responder/admin/superadmin for the event
    const isReporter = report.reporterId && req.user.id === report.reporterId;
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id, eventId },
      include: { role: true },
    });
    const roles = userEventRoles.map((uer) => uer.role.name);
    const isResponderOrAbove = roles.some((r) =>
      ["Responder", "Admin", "SuperAdmin"].includes(r)
    );
    if (!isReporter && !isResponderOrAbove) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
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
      
      // Store original values for notification comparison
      const originalAssignedResponderId = report.assignedResponderId;
      const originalState = report.state;
      
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

      // Create notifications for changes
      try {
        // Notify on assignment change
        if (assignedResponderId !== undefined && assignedResponderId !== originalAssignedResponderId) {
          await notifyReportEvent(reportId, 'report_assigned', req.user.id);
        }
        
        // Notify on state change
        if (state !== undefined && state !== originalState) {
          await notifyReportEvent(reportId, 'report_status_changed', req.user.id);
        }
      } catch (notifyErr) {
        console.error('Failed to create notifications for report update:', notifyErr);
        // Don't fail the request if notification fails
      }

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
        ["Admin", "Responder", "SuperAdmin", "Reporter"].includes(
          uer.role.name,
        ),
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
    for (const uer of userEventRoles) {
      if (!users[uer.userId]) {
        // Fetch avatar for each user
        const avatar = await prisma.userAvatar.findUnique({
          where: { userId: uer.user.id },
        });
        users[uer.userId] = {
          id: uer.user.id,
          email: uer.user.email,
          name: uer.user.name,
          roles: [],
          avatarUrl: avatar ? `/users/${uer.user.id}/avatar` : null,
        };
      }
      users[uer.userId].roles.push(uer.role.name);
    }
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
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Invite not found." });
    }
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
    contactEmail,
  } = req.body;
  if (
    !name &&
    !newSlug &&
    !description &&
    !logo &&
    !startDate &&
    !endDate &&
    !website &&
    !codeOfConduct &&
    !contactEmail
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
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
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
    console.error("Failed to upload logo:", err);
    res.status(500).send(`Failed to upload logo: ${err.message}`);
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
    console.error("Failed to fetch logo:", err);
    res.status(500).send(`Failed to fetch logo: ${err.message}`);
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
    const commentsRaw = await prisma.reportComment.findMany({
      where,
      include: { author: true },
      orderBy: { createdAt: "asc" },
    });
    // Add avatarUrl to each comment's author
    const comments = await Promise.all(
      commentsRaw.map(async (comment) => {
        const avatar = await prisma.userAvatar.findUnique({
          where: { userId: comment.author.id },
        });
        return {
          ...comment,
          author: {
            ...comment.author,
            avatarUrl: avatar ? `/users/${comment.author.id}/avatar` : null,
          },
        };
      }),
    );
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

    // Create notification for new comment
    try {
      await notifyReportEvent(reportId, 'report_comment_added', req.user.id);
    } catch (notifyErr) {
      console.error('Failed to create notification for new comment:', notifyErr);
      // Don't fail the request if notification fails
    }

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
    // Add access control before querying files
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { event: true }
    });
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }
    // Verify user has access to this report
    const isReporter = report.reporterId && req.user && req.user.id === report.reporterId;
    const userEventRoles = req.user ? await prisma.userEventRole.findMany({
      where: { userId: req.user.id, eventId: report.eventId },
      include: { role: true },
    }) : [];
    const roles = userEventRoles.map((uer) => uer.role.name);
    const isResponderOrAbove = roles.some((r) =>
      ["Responder", "Admin", "SuperAdmin"].includes(r)
    );
    if (!isReporter && !isResponderOrAbove) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
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
    // Always use application/octet-stream for downloads
    res.setHeader("Content-Type", "application/octet-stream");
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

// User avatar endpoints
app.post(
  "/users/:userId/avatar",
  avatarUpload.single("avatar"),
  async (req, res) => {
    if (
      !req.isAuthenticated() ||
      !req.user ||
      req.user.id !== req.params.userId
    ) {
      console.error("[Avatar Upload] Not authorized", {
        userId: req.user?.id,
        paramsUserId: req.params.userId,
      });
      return res.status(401).json({ error: "Not authorized" });
    }
    if (!req.file) {
      console.error("[Avatar Upload] No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }
    try {
      await prisma.userAvatar.deleteMany({ where: { userId: req.user.id } });
      const avatar = await prisma.userAvatar.create({
        data: {
          userId: req.user.id,
          filename: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          data: req.file.buffer,
        },
      });
      res.status(200).json({ success: true, avatarId: avatar.id });
    } catch (err) {
      console.error("[Avatar Upload] Failed to upload avatar", err);
      res
        .status(500)
        .json({ error: "Failed to upload avatar.", details: err.message });
    }
  },
);

app.delete("/users/:userId/avatar", async (req, res) => {
  if (
    !req.isAuthenticated() ||
    !req.user ||
    req.user.id !== req.params.userId
  ) {
    console.error("[Avatar Delete] Not authorized", {
      userId: req.user?.id,
      paramsUserId: req.params.userId,
    });
    return res.status(401).json({ error: "Not authorized" });
  }
  try {
    await prisma.userAvatar.deleteMany({ where: { userId: req.user.id } });
    res.status(204).send();
  } catch (err) {
    console.error("[Avatar Delete] Failed to delete avatar", err);
    res
      .status(500)
      .json({ error: "Failed to delete avatar.", details: err.message });
  }
});

app.get("/users/:userId/avatar", async (req, res) => {
  try {
    const avatar = await prisma.userAvatar.findUnique({
      where: { userId: req.params.userId },
    });
    if (!avatar) {
      console.error("[Avatar Fetch] No avatar found", {
        userId: req.params.userId,
      });
      return res.status(404).send("No avatar");
    }
    res.setHeader("Content-Type", avatar.mimetype);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${avatar.filename}"`,
    );
    res.send(avatar.data);
  } catch (err) {
    console.error("[Avatar Fetch] Failed to fetch avatar", err);
    res
      .status(500)
      .json({ error: "Failed to fetch avatar.", details: err.message });
  }
});

// Startup check for required environment variables
const requiredEnv = ["DATABASE_URL", "SESSION_SECRET", "FRONTEND_BASE_URL"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(", ")}.\nPlease set them in your .env file.`
  );
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend server listening on port ${PORT}`);
  });
}

// PATCH endpoint to edit report title (eventId-based)
app.patch(
  "/events/:eventId/reports/:reportId/title",
  async (req, res) => {
    const { eventId, reportId } = req.params;
    const { title } = req.body;
    if (!title || typeof title !== "string" || title.length < 10 || title.length > 70) {
      return res.status(400).json({ error: "title must be 10-70 characters." });
    }
    try {
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report || report.eventId !== eventId) {
        return res.status(404).json({ error: "Report not found for this event." });
      }
      // Only reporter or admin can edit
      let canEdit = false;
      if (req.isAuthenticated && req.isAuthenticated() && req.user) {
        if (report.reporterId && req.user.id === report.reporterId) {
          canEdit = true;
        } else {
          // Check if user is admin for the event
          const userEventRoles = await prisma.userEventRole.findMany({
            where: { userId: req.user.id, eventId },
            include: { role: true },
          });
          const roles = userEventRoles.map((uer) => uer.role.name);
          if (roles.some((r) => ["Admin", "SuperAdmin"].includes(r))) {
            canEdit = true;
          }
        }
      }
      if (!canEdit) {
        return res.status(403).json({ error: "Forbidden: only reporter or admin can edit title." });
      }
      const updated = await prisma.report.update({
        where: { id: reportId },
        data: { title },
      });
      res.json({ report: updated });
    } catch (err) {
      res.status(500).json({ error: "Failed to update report title", details: err.message });
    }
  },
);

// PATCH endpoint to edit report title (slug-based)
app.patch(
  "/events/slug/:slug/reports/:reportId/title",
  async (req, res) => {
    const { slug, reportId } = req.params;
    const { title } = req.body;
    if (!title || typeof title !== "string" || title.length < 10 || title.length > 70) {
      return res.status(400).json({ error: "title must be 10-70 characters." });
    }
    try {
      const eventId = await getEventIdBySlug(slug);
      if (!eventId) return res.status(404).json({ error: "Event not found." });
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report || report.eventId !== eventId) {
        return res.status(404).json({ error: "Report not found for this event." });
      }
      // Only reporter or admin can edit
      let canEdit = false;
      if (req.isAuthenticated && req.isAuthenticated() && req.user) {
        if (report.reporterId && req.user.id === report.reporterId) {
          canEdit = true;
        } else {
          // Check if user is admin for the event
          const userEventRoles = await prisma.userEventRole.findMany({
            where: { userId: req.user.id, eventId },
            include: { role: true },
          });
          const roles = userEventRoles.map((uer) => uer.role.name);
          if (roles.some((r) => ["Admin", "SuperAdmin"].includes(r))) {
            canEdit = true;
          }
        }
      }
      if (!canEdit) {
        return res.status(403).json({ error: "Forbidden: only reporter or admin can edit title." });
      }
      const updated = await prisma.report.update({
        where: { id: reportId },
        data: { title },
      });
      res.json({ report: updated });
    } catch (err) {
      res.status(500).json({ error: "Failed to update report title", details: err.message });
    }
  },
);



// System Settings API
// Get all system settings (public)
app.get("/api/system/settings", async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const result = {};
    for (const s of settings) result[s.key] = s.value;
    res.json({ settings: result });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch system settings.", details: err.message });
  }
});

// Update a system setting (SuperAdmin only)
app.put("/api/system/settings/:key", requireSuperAdmin(), async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  if (typeof value !== "string") {
    return res.status(400).json({ error: "Value must be a string." });
  }
  try {
    const updated = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    res.json({ setting: { key: updated.key, value: updated.value } });
  } catch (err) {
    res.status(500).json({ error: "Failed to update system setting.", details: err.message });
  }
});

// Get all events for the current user (with roles)
app.get("/api/users/me/events", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const userId = req.user.id;
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { userId },
      include: { event: true, role: true },
    });
    // Group by event, include roles
    const eventsMap = {};
    for (const uer of userEventRoles) {
      if (!uer.event) continue;
      if (!eventsMap[uer.event.id]) {
        eventsMap[uer.event.id] = {
          id: uer.event.id,
          name: uer.event.name,
          slug: uer.event.slug,
          description: uer.event.description,
          roles: [],
        };
      }
      eventsMap[uer.event.id].roles.push(uer.role.name);
    }
    const events = Object.values(eventsMap);
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user events", details: err.message });
  }
});

// Get quick stats for the current user
app.get("/api/users/me/quickstats", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const userId = req.user.id;
    // Get all event memberships
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { userId },
      include: { event: true, role: true },
    });
    const eventIds = userEventRoles.map(uer => uer.eventId).filter(Boolean);
    const eventCount = new Set(eventIds).size;

    // Count reports where user is reporter OR assigned responder OR admin in event
    const reportsAsReporter = await prisma.report.count({ where: { reporterId: userId } });
    const reportsAsResponder = await prisma.report.count({ where: { assignedResponderId: userId } });
    // Count events where user is admin
    const adminEventIds = userEventRoles.filter(uer => uer.role.name === 'Admin').map(uer => uer.eventId);
    let reportsAsAdmin = 0;
    if (adminEventIds.length > 0) {
      reportsAsAdmin = await prisma.report.count({ where: { eventId: { in: adminEventIds } } });
    }
    // Total unique reports
    const reportCount = reportsAsReporter + reportsAsResponder + reportsAsAdmin;

    // Needs response: reports assigned to user as responder and not closed/resolved
    const needsResponseCount = await prisma.report.count({
      where: {
        assignedResponderId: userId,
        state: { in: ['submitted', 'acknowledged', 'investigating'] },
      },
    });

    res.json({ eventCount, reportCount, needsResponseCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quick stats", details: err.message });
  }
});

// Placeholder: Get recent activity for the current user
// TODO: Replace with real AuditLog queries when implemented
// TODO: When using real data, limit to the last 10-20 items for performance and UX (e.g., .take(10) in Prisma)
// TODO: Include enough info in each activity item to allow the frontend to link to the relevant event/report/user (e.g., eventSlug, reportId, etc.)
// Each activity item: { type, message, timestamp, eventSlug, reportId, ... }
app.get("/api/users/me/activity", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  // Mock data for now
  const mockActivity = [
    {
      type: "report_submitted",
      message: "You submitted a new report in DuckCon.",
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      eventSlug: "duckcon",
      reportId: "rpt1",
    },
    {
      type: "report_assigned",
      message: "A report was assigned to you in TechFest.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      eventSlug: "techfest",
      reportId: "rpt2",
    },
    {
      type: "invited",
      message: "You were invited to PyData Chicago.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      eventSlug: "pydata-chicago",
    },
    {
      type: "status_changed",
      message: "A report you submitted was marked as resolved.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      eventSlug: "duckcon",
      reportId: "rpt3",
    },
  ];
  res.json({ activity: mockActivity });
});


// User profile management endpoints

// Update user profile
app.patch("/users/me/profile", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { name, email } = req.body;

  try {
    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Please enter a valid email address." });
      }

      // Check if email is already in use by another user
      const normalizedEmail = email.toLowerCase();
      const existingUser = await prisma.user.findUnique({ 
        where: { email: normalizedEmail } 
      });
      
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(409).json({ error: "This email address is already in use." });
      }
    }

    // Update user profile
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase();

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });

    // Get avatar if exists
    const avatar = await prisma.userAvatar.findUnique({
      where: { userId: req.user.id }
    });

    const userResponse = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatarUrl: avatar?.url || null
    };

    res.json({ 
      message: "Profile updated successfully!",
      user: userResponse 
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// Change user password
app.patch("/users/me/password", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required." });
  }

  try {
    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Verify current password
    let isCurrentPasswordValid;
    try {
      isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    } catch (err) {
      console.error("Error comparing passwords:", err);
      return res.status(400).json({ error: "Unable to verify current password." });
    }

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }

    // Validate new password strength
    const minLength = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!minLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return res.status(400).json({ 
        error: "New password must meet all security requirements: at least 8 characters, uppercase letter, lowercase letter, number, and special character." 
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash }
    });

    res.json({ message: "Password updated successfully!" });
  } catch (err) {
    console.error("Error changing password:", err);
    res.status(500).json({ error: "Failed to change password." });
  }
});

// Get user's events with roles
app.get("/api/users/me/events", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: {
        event: true,
        role: true
      }
    });

    // Group by event and collect roles
    const eventsMap = new Map();
    
    userEventRoles.forEach(uer => {
      const eventId = uer.event.id;
      if (!eventsMap.has(eventId)) {
        eventsMap.set(eventId, {
          id: uer.event.id,
          name: uer.event.name,
          slug: uer.event.slug,
          description: uer.event.description,
          roles: []
        });
      }
      eventsMap.get(eventId).roles.push(uer.role.name);
    });

    const events = Array.from(eventsMap.values());

    res.json({ events });
  } catch (err) {
    console.error("Error fetching user events:", err);
    res.status(500).json({ error: "Failed to fetch events." });
  }
});

// Get user's reports across all accessible events
app.get("/api/users/me/reports", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      event: eventFilter,
      assigned,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    // Validate and parse pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ error: "Invalid pagination parameters. Page and limit must be positive integers." });
    }
    
    if (limitNum > 100) {
      return res.status(400).json({ error: "Limit cannot exceed 100 items per page." });
    }
    
    const skip = (pageNum - 1) * limitNum;

    // Get user's event roles to determine access
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: {
        event: true,
        role: true
      }
    });

    if (userEventRoles.length === 0) {
      return res.json({ reports: [], total: 0, page: pageNum, limit: limitNum });
    }

    // Group roles by event for access control
    const eventRoles = new Map();
    userEventRoles.forEach(uer => {
      const eventId = uer.event.id;
      if (!eventRoles.has(eventId)) {
        eventRoles.set(eventId, {
          event: uer.event,
          roles: []
        });
      }
      eventRoles.get(eventId).roles.push(uer.role.name);
    });

    // Build where clause based on user's access
    const eventIds = Array.from(eventRoles.keys());
    let whereClause = {
      eventId: { in: eventIds }
    };

    // Role-based filtering: Reporters only see their own reports
    const reporterOnlyEvents = [];
    const responderAdminEvents = [];
    
    eventRoles.forEach((eventData, eventId) => {
      const roles = eventData.roles;
      const hasResponderOrAdmin = roles.some(r => ['Responder', 'Admin', 'SuperAdmin'].includes(r));
      
      if (hasResponderOrAdmin) {
        responderAdminEvents.push(eventId);
      } else {
        reporterOnlyEvents.push(eventId);
      }
    });

    // Build complex where clause for role-based access
    if (reporterOnlyEvents.length > 0 && responderAdminEvents.length > 0) {
      whereClause = {
        OR: [
          // Reports in events where user is responder/admin (all reports)
          { eventId: { in: responderAdminEvents } },
          // Reports in events where user is only reporter (only their reports)
          { 
            AND: [
              { eventId: { in: reporterOnlyEvents } },
              { reporterId: req.user.id }
            ]
          }
        ]
      };
    } else if (reporterOnlyEvents.length > 0) {
      // User is only reporter in all events
      whereClause = {
        eventId: { in: reporterOnlyEvents },
        reporterId: req.user.id
      };
    } else {
      // User is responder/admin in all events
      whereClause = {
        eventId: { in: responderAdminEvents }
      };
    }

    // Apply filters while preserving access control
    const filters = [];
    
    // Preserve the original access control as the base
    const baseAccessControl = { ...whereClause };
    
    if (search) {
      filters.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    if (status) {
      filters.push({ state: status });
    }

    if (eventFilter) {
      // Filter by specific event slug
      const targetEvent = Array.from(eventRoles.values()).find(e => e.event.slug === eventFilter);
      if (targetEvent) {
        filters.push({ eventId: targetEvent.event.id });
      } else {
        // User doesn't have access to this event
        return res.json({ reports: [], total: 0, page: pageNum, limit: limitNum });
      }
    }

    if (assigned === 'me') {
      filters.push({ assignedResponderId: req.user.id });
    } else if (assigned === 'unassigned') {
      filters.push({ assignedResponderId: null });
    }

    // Combine base access control with filters using AND
    if (filters.length > 0) {
      whereClause = {
        AND: [
          baseAccessControl,
          ...filters
        ]
      };
    }

    // Build sort clause
    const validSortFields = ['createdAt', 'updatedAt', 'title', 'state'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    // Get total count
    const total = await prisma.report.count({ where: whereClause });

    // Get reports with pagination
    const reports = await prisma.report.findMany({
      where: whereClause,
      include: {
        event: {
          select: { id: true, name: true, slug: true }
        },
        reporter: {
          select: { id: true, name: true, email: true }
        },
        assignedResponder: {
          select: { id: true, name: true, email: true }
        },
        evidenceFiles: {
          select: { id: true, filename: true, mimetype: true, size: true }
        },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limitNum
    });

    // Add user's role in each event to the response
    const reportsWithRoles = reports.map(report => ({
      ...report,
      userRoles: eventRoles.get(report.eventId)?.roles || []
    }));

    res.json({
      reports: reportsWithRoles,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });

  } catch (err) {
    console.error("Error fetching user reports:", err);
    res.status(500).json({ error: "Failed to fetch reports." });
  }
});

// Leave an event
app.delete("/users/me/events/:eventId", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { eventId } = req.params;

  try {
    // Check if user is a member of the event
    const userRoles = await prisma.userEventRole.findMany({
      where: { 
        userId: req.user.id, 
        eventId: eventId 
      },
      include: {
        event: true,
        role: true
      }
    });

    if (userRoles.length === 0) {
      return res.status(404).json({ error: "You are not a member of this event." });
    }

    // Check if user is the only admin
    const isAdmin = userRoles.some(ur => ur.role.name === 'Admin');
    if (isAdmin) {
      const adminCount = await prisma.userEventRole.count({
        where: {
          eventId: eventId,
          role: { name: 'Admin' }
        }
      });

      if (adminCount === 1) {
        return res.status(400).json({ 
          error: "You cannot leave this event as you are the only admin. Please assign another admin first." 
        });
      }
    }

    // Remove user from event
    await prisma.userEventRole.deleteMany({
      where: {
        userId: req.user.id,
        eventId: eventId
      }
    });

    const eventName = userRoles[0].event.name;
    res.json({ message: `Successfully left ${eventName}.` });
  } catch (err) {
    console.error("Error leaving event:", err);
    res.status(500).json({ error: "Failed to leave event." });
  }
});

// Redeem an invite link (for logged-in users to join an event)
app.post("/invites/:code/redeem", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const { code } = req.params;
  try {
    const invite = await prisma.eventInviteLink.findUnique({ where: { code } });
    if (!invite || invite.disabled) {
      return res.status(400).json({ error: "Invalid or disabled invite link." });
    }
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Invite link has expired." });
    }
    if (invite.maxUses && invite.useCount >= invite.maxUses) {
      return res.status(400).json({ error: "Invite link has reached its maximum uses." });
    }
    // Check if user is already a member of the event
    const existing = await prisma.userEventRole.findFirst({
      where: {
        userId: req.user.id,
        eventId: invite.eventId,
      },
    });
    if (existing) {
      return res.status(409).json({ error: "You are already a member of this event." });
    }
    // Assign role for the event from invite
    await prisma.userEventRole.create({
      data: {
        userId: req.user.id,
        eventId: invite.eventId,
        roleId: invite.roleId,
      },
    });
    // Increment useCount
    await prisma.eventInviteLink.update({
      where: { code },
      data: { useCount: { increment: 1 } },
    });
    // Get event slug for redirect
    const event = await prisma.event.findUnique({ where: { id: invite.eventId } });
    res.status(200).json({ message: "Joined event successfully!", eventSlug: event?.slug });
  } catch (err) {
    res.status(500).json({ error: "Failed to join event.", details: err.message });
  }
});

// ============================================================================
// NOTIFICATION ENDPOINTS
// ============================================================================

// Get user's notifications with pagination and filtering
app.get("/api/users/me/notifications", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      type,
      priority
    } = req.query;

    // Validate and parse pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 per page
    
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ error: "Invalid pagination parameters" });
    }

    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const whereClause = { userId: req.user.id };
    
    if (unreadOnly === 'true') {
      whereClause.isRead = false;
    }
    
    if (type) {
      whereClause.type = type;
    }
    
    if (priority) {
      whereClause.priority = priority;
    }

    // Get total count
    const total = await prisma.notification.count({ where: whereClause });

    // Get notifications with related data
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      include: {
        event: {
          select: { id: true, name: true, slug: true }
        },
        report: {
          select: { id: true, title: true, state: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    // Get unread count for the user
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false }
    });

    res.json({
      notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      },
      unreadCount
    });

  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications." });
  }
});

// Mark notification as read
app.patch("/api/notifications/:notificationId/read", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { notificationId } = req.params;

  try {
    // Check if notification belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to access this notification" });
    }

    // Mark as read if not already read
    if (!notification.isRead) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { 
          isRead: true,
          readAt: new Date()
        }
      });
    }

    res.json({ message: "Notification marked as read" });

  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ error: "Failed to mark notification as read." });
  }
});

// Mark all notifications as read
app.patch("/api/users/me/notifications/read-all", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    await prisma.notification.updateMany({
      where: { 
        userId: req.user.id,
        isRead: false
      },
      data: { 
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({ message: "All notifications marked as read" });

  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    res.status(500).json({ error: "Failed to mark all notifications as read." });
  }
});

// Delete a notification
app.delete("/api/notifications/:notificationId", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { notificationId } = req.params;

  try {
    // Check if notification belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to delete this notification" });
    }

    await prisma.notification.delete({
      where: { id: notificationId }
    });

    res.json({ message: "Notification deleted" });

  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ error: "Failed to delete notification." });
  }
});

// Get notification statistics for user
app.get("/api/users/me/notifications/stats", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userId = req.user.id;

    // Get counts by type and priority
    const [
      totalCount,
      unreadCount,
      typeCounts,
      priorityCounts
    ] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.groupBy({
        by: ['type'],
        where: { userId },
        _count: { type: true }
      }),
      prisma.notification.groupBy({
        by: ['priority'],
        where: { userId },
        _count: { priority: true }
      })
    ]);

    const typeStats = {};
    typeCounts.forEach(item => {
      typeStats[item.type] = item._count.type;
    });

    const priorityStats = {};
    priorityCounts.forEach(item => {
      priorityStats[item.priority] = item._count.priority;
    });

    res.json({
      total: totalCount,
      unread: unreadCount,
      byType: typeStats,
      byPriority: priorityStats
    });

  } catch (err) {
    console.error("Error fetching notification stats:", err);
    res.status(500).json({ error: "Failed to fetch notification statistics." });
  }
});

// ============================================================================
// NOTIFICATION HELPER FUNCTIONS
// ============================================================================

// Helper function to create notifications
async function createNotification({
  userId,
  type,
  priority = 'normal',
  title,
  message,
  eventId = null,
  reportId = null,
  actionData = null,
  actionUrl = null
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        priority,
        title,
        message,
        eventId,
        reportId,
        actionData: actionData ? JSON.stringify(actionData) : null,
        actionUrl
      }
    });
    return notification;
  } catch (err) {
    console.error("Error creating notification:", err);
    throw err;
  }
}

// Helper function to notify users about report events
async function notifyReportEvent(reportId, type, excludeUserId = null) {
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        event: true,
        reporter: true,
        assignedResponder: true
      }
    });

    if (!report) return;

    const notifications = [];

    switch (type) {
      case 'report_submitted':
        // Notify event admins and responders
        const eventStaff = await prisma.userEventRole.findMany({
          where: {
            eventId: report.eventId,
            role: { name: { in: ['Admin', 'Responder'] } }
          },
          include: { user: true }
        });

        for (const staff of eventStaff) {
          if (staff.userId !== excludeUserId) {
            notifications.push(createNotification({
              userId: staff.userId,
              type: 'report_submitted',
              priority: 'high',
              title: 'New Report Submitted',
              message: `A new report "${report.title}" was submitted in ${report.event.name}`,
              eventId: report.eventId,
              reportId: report.id,
              actionUrl: `/events/${report.event.slug}/reports/${report.id}`
            }));
          }
        }
        break;

      case 'report_assigned':
        // Notify the assigned responder
        if (report.assignedResponderId && report.assignedResponderId !== excludeUserId) {
          notifications.push(createNotification({
            userId: report.assignedResponderId,
            type: 'report_assigned',
            priority: 'high',
            title: 'Report Assigned to You',
            message: `You have been assigned to report "${report.title}" in ${report.event.name}`,
            eventId: report.eventId,
            reportId: report.id,
            actionUrl: `/events/${report.event.slug}/reports/${report.id}`
          }));
        }
        break;

      case 'report_status_changed':
        // Notify reporter and assigned responder
        const usersToNotify = [];
        if (report.reporterId && report.reporterId !== excludeUserId) {
          usersToNotify.push(report.reporterId);
        }
        if (report.assignedResponderId && report.assignedResponderId !== excludeUserId) {
          usersToNotify.push(report.assignedResponderId);
        }

        for (const userId of usersToNotify) {
          notifications.push(createNotification({
            userId,
            type: 'report_status_changed',
            priority: 'normal',
            title: 'Report Status Updated',
            message: `Report "${report.title}" status changed to ${report.state} in ${report.event.name}`,
            eventId: report.eventId,
            reportId: report.id,
            actionUrl: `/events/${report.event.slug}/reports/${report.id}`
          }));
        }
        break;

      case 'report_comment_added':
        // Notify reporter, assigned responder, and event admins (excluding commenter)
        const interestedUsers = new Set();
        if (report.reporterId) interestedUsers.add(report.reporterId);
        if (report.assignedResponderId) interestedUsers.add(report.assignedResponderId);

        // Add event admins
        const admins = await prisma.userEventRole.findMany({
          where: {
            eventId: report.eventId,
            role: { name: 'Admin' }
          }
        });
        admins.forEach(admin => interestedUsers.add(admin.userId));

        // Remove the commenter
        if (excludeUserId) interestedUsers.delete(excludeUserId);

        for (const userId of interestedUsers) {
          notifications.push(createNotification({
            userId,
            type: 'report_comment_added',
            priority: 'normal',
            title: 'New Comment on Report',
            message: `A new comment was added to report "${report.title}" in ${report.event.name}`,
            eventId: report.eventId,
            reportId: report.id,
            actionUrl: `/events/${report.event.slug}/reports/${report.id}`
          }));
        }
        break;
    }

    // Create all notifications
    await Promise.all(notifications);

  } catch (err) {
    console.error("Error creating report notifications:", err);
  }
}

// Export the app for testing (clean, no custom properties for supertest compatibility)
module.exports = app;
