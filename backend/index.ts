// Load environment variables first, especially for test environment
if (process.env.NODE_ENV === 'test') {
  require('dotenv').config({ path: '.env.test', override: true });
}

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import cors from 'cors';
import crypto from 'crypto';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';

// Import utilities
import { logAudit } from './utils/audit';
import { requireRole, requireSuperAdmin } from './utils/rbac';
import { emailService } from './utils/email';

// Initialize Prisma client (after environment is loaded)
const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 4000;

// Multer setup for evidence uploads (memory storage, 50MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// Multer setup for event logo uploads (memory storage, 10MB limit)
const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Global request logger
app.use((req: any, _res: any, next: any) => {
  console.log('[GLOBAL] Incoming request:', req.method, req.url);
  next();
});

// Add test-only authentication middleware for tests
if (process.env.NODE_ENV === 'test') {
  app.use((req: any, _res: any, next: any) => {
    // Allow disabling authentication for specific tests
    const disableAuth = req.headers['x-test-disable-auth'];
    if (disableAuth === 'true') {
      req.isAuthenticated = () => false;
      req.user = null;
      next();
      return;
    }
    
    // Allow setting specific user via header
    const testUserId = req.headers['x-test-user-id'] as string;
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
      req.user = { id: '1', email: 'admin@example.com', name: 'Admin' };
    }
    next();
  });
}

// CORS middleware (allow frontend dev server)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  }),
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'changeme',
    resave: false,
    saveUninitialized: false,
  }),
);

// Passport.js setup
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy
passport.use(
  new LocalStrategy(
    { usernameField: 'email' },
    async (email: string, password: string, done: any) => {
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
          return done(null, false, { message: 'Incorrect email or password.' });
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return done(null, false, { message: 'Incorrect email or password.' });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

passport.serializeUser((user: any, done: any) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done: any) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Basic routes
app.get('/', async (_req: any, res: any) => {
  try {
    // Check if any users exist
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      return res.json({ firstUserNeeded: true });
    }
    res.json({ message: 'Backend API is running!' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.get('/health', (_req: any, res: any) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/audit-test', async (_req: any, res: any) => {
  try {
    await logAudit({
      eventId: '902288b2-388a-4292-83b6-4c30e566a413',
      userId: null,
      action: 'test_action',
      targetType: 'Test',
      targetId: '123',
    });
    res.json({ message: 'Audit event logged!' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to log audit event', details: err.message });
  }
});

// Example protected route
app.get('/admin-only', requireRole(['Admin']) as any, (req: any, res: any) => {
  res.json({
    message: 'You are an admin for this event!',
    user: { id: req.user?.id, email: req.user?.email },
  });
});

// Login route
app.post('/login', passport.authenticate('local'), (req: any, res: any) => {
  res.json({
    message: 'Logged in!',
    user: { id: req.user?.id, email: req.user?.email, name: req.user?.name },
  });
});

// Logout route
app.post('/logout', (req: any, res: any) => {
  req.logout((err: any) => {
    if (err) return res.status(500).json({ error: 'Logout failed.' });
    res.json({ message: 'Logged out!' });
  });
});

// Session check route
app.get('/session', async (req: any, res: any) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    // Fetch user roles
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    // Flatten roles to a list of role names
    const roles = userEventRoles.map((uer: any) => uer.role.name);
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

// Helper function to validate password
function validatePassword(password: string) {
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
app.post("/register", async (req: any, res: any) => {
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
  } catch (err: any) {
    console.error("Registration error:", err);
    return res
      .status(500)
      .json({ error: "Registration failed.", details: err.message });
  }
});

// Check email availability
app.get("/auth/check-email", async (req: any, res: any) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: "Email parameter is required." });
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    res.json({ available: !existing });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to check email availability.", details: err.message });
  }
});

// Rate limiting for password reset attempts
const resetAttempts = new Map();

function checkResetRateLimit(email: string) {
  const now = Date.now();
  const attempts = resetAttempts.get(email) || [];
  
  // Remove attempts older than 15 minutes
  const recentAttempts = attempts.filter((timestamp: number) => now - timestamp < 15 * 60 * 1000);
  
  if (recentAttempts.length >= 3) {
    const oldestAttempt = Math.min(...recentAttempts);
    const timeRemaining = (oldestAttempt + 15 * 60 * 1000) - now;
    return { allowed: false, timeRemaining };
  }
  
  // Add current attempt
  recentAttempts.push(now);
  resetAttempts.set(email, recentAttempts);
  
  return { allowed: true, timeRemaining: 0 };
}

// Forgot password - send reset email
app.post("/auth/forgot-password", async (req: any, res: any) => {
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
        await emailService.sendPasswordReset(user.email, user.name || 'User', resetToken);
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
  } catch (err: any) {
    console.error('[Auth] Forgot password error:', err);
    res.status(500).json({ error: "Failed to process password reset request." });
  }
});

// Reset password with token
app.post("/auth/reset-password", async (req: any, res: any) => {
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
  } catch (err: any) {
    console.error('[Auth] Reset password error:', err);
    res.status(500).json({ error: "Failed to reset password." });
  }
});

// Validate reset token
app.get("/auth/validate-reset-token", async (req: any, res: any) => {
  const { token } = req.query;
  
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: "Token is required." });
  }
  
  try {
    // Find the token (token is guaranteed to be string after the check above)
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: token as string },
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
  } catch (err: any) {
    console.error('[Auth] Validate reset token error:', err);
    res.status(500).json({ error: "Failed to validate reset token." });
  }
});

// ============================================================================
// EVENT MANAGEMENT ROUTES
// ============================================================================

// Super Admin: Create Event
app.post('/events', requireSuperAdmin() as any, async (req: any, res: any) => {
  const { name, slug } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: 'Name and slug are required.' });
  }
  // Slug validation: lowercase, url-safe (letters, numbers, hyphens), no spaces
  const slugPattern = /^[a-z0-9-]+$/;
  if (!slugPattern.test(slug)) {
    return res.status(400).json({
      error: 'Slug must be all lowercase, URL-safe (letters, numbers, hyphens only, no spaces).',
    });
  }
  try {
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: 'Slug already exists.' });
    }
    const event = await prisma.event.create({ data: { name, slug } });
    res.status(201).json({ event });
  } catch (err: any) {
    res.status(500).json({ error: 'Event creation failed.', details: err.message });
  }
});

// Super Admin: List all events
app.get('/events', requireSuperAdmin() as any, async (_req: any, res: any) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ events });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list events.', details: err.message });
  }
});

// Get event details (Admins or SuperAdmins for that event)
app.get('/events/:eventId', requireRole(['Admin', 'SuperAdmin']) as any, async (req: any, res: any) => {
  const { eventId } = req.params;
  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    res.json({ event });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get event details.', details: err.message });
  }
});

// Assign a role to a user for an event
app.post('/events/:eventId/roles', requireRole(['Admin', 'SuperAdmin']) as any, async (req: any, res: any) => {
  const { eventId } = req.params;
  const { userId, roleName } = req.body;
  if (!userId || !roleName) {
    return res.status(400).json({ error: 'userId and roleName are required.' });
  }
  try {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      return res.status(400).json({ error: 'Role does not exist.' });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(400).json({ error: 'User does not exist.' });
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
    res.status(201).json({ message: 'Role assigned.', userEventRole });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to assign role.', details: err.message });
  }
});

// Remove a role from a user for an event
app.delete('/events/:eventId/roles', requireRole(['Admin', 'SuperAdmin']) as any, async (req: any, res: any) => {
  const { eventId } = req.params;
  const { userId, roleName } = req.body;
  if (!userId || !roleName) {
    return res.status(400).json({ error: 'userId and roleName are required.' });
  }
  try {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      return res.status(400).json({ error: 'Role does not exist.' });
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
    res.json({ message: 'Role removed.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove role.', details: err.message });
  }
});

// List all users and their roles for an event
app.get('/events/:eventId/users', async (req: any, res: any) => {
  console.log('[ROUTE] /events/:eventId/users handler', {
    url: req.url,
    params: req.params,
    query: req.query,
  });
  // Inline RBAC logic for Admin/SuperAdmin
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const eventId = req.params && req.params.eventId;
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId in params' });
  }
  try {
    // Check for SuperAdmin role globally
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    const isSuperAdmin = allUserRoles.some((uer: any) => uer.role.name === 'SuperAdmin');
    if (!isSuperAdmin) {
      // Otherwise, check for allowed roles for this event
      const userRoles = allUserRoles.filter((uer: any) => uer.eventId === eventId);
      const hasRole = userRoles.some((uer: any) =>
        ['Admin', 'Responder', 'SuperAdmin'].includes(uer.role.name),
      );
      if (!hasRole) {
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
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
    const users: any = {};
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
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list users for event.', details: err.message });
  }
});

// ============================================================================
// REPORT MANAGEMENT ROUTES
// ============================================================================

// Change the state of a report (Responder/Admin/SuperAdmin only)
app.patch('/events/:eventId/reports/:reportId/state', requireRole(['Responder', 'Admin', 'SuperAdmin']) as any, async (req: any, res: any) => {
  const { eventId, reportId } = req.params;
  const { state } = req.body;
  const validStates = ['submitted', 'acknowledged', 'investigating', 'resolved', 'closed'];
  if (!state || !validStates.includes(state)) {
    return res.status(400).json({ error: 'Invalid or missing state.' });
  }
  try {
    // Check report exists and belongs to event
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report || report.eventId !== eventId) {
      return res.status(404).json({ error: 'Report not found for this event.' });
    }
    // Update state
    const updated = await prisma.report.update({
      where: { id: reportId },
      data: { state },
      include: { reporter: true },
    });
    res.json({ report: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update report state', details: err.message });
  }
});

// Submit a report for an event (anonymous or authenticated, with evidence upload)
app.post('/events/:eventId/reports', upload.array('evidence', 10) as any, async (req: any, res: any) => {
  const { eventId } = req.params;
  const { type, description, incidentAt, parties, title } = req.body;
  if (!type || !description || !title) {
    return res.status(400).json({ error: 'type, title, and description are required.' });
  }
  if (typeof title !== 'string' || title.length < 10 || title.length > 70) {
    return res.status(400).json({ error: 'title must be 10-70 characters.' });
  }
  try {
    // Check event exists
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    // If authenticated, use req.user.id as reporterId; else null
    const reporterId = req.isAuthenticated && req.isAuthenticated() && req.user ? req.user.id : null;
    // Create report first
    const reportData: any = {
      eventId,
      reporterId,
      type,
      title,
      description,
      state: 'submitted',
    };
    if (incidentAt) reportData.incidentAt = new Date(incidentAt);
    if (parties) reportData.parties = parties;
    
    const report = await prisma.report.create({
      data: reportData,
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
  } catch (err: any) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Failed to submit report.', details: err.message });
  }
});

// List all reports for an event
app.get('/events/:eventId/reports', async (req: any, res: any) => {
  const { eventId } = req.params;
  try {
    const reports = await prisma.report.findMany({
      where: { eventId },
      include: { reporter: true, evidenceFiles: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ reports });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Event not found.' });
    }
    res.status(500).json({ error: 'Failed to fetch reports', details: err.message });
  }
});

// Get a single report for an event by report ID
app.get('/events/:eventId/reports/:reportId', async (req: any, res: any) => {
  const { eventId, reportId } = req.params;
  if (!eventId || !reportId) {
    return res.status(400).json({ error: 'eventId and reportId are required.' });
  }
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { reporter: true, evidenceFiles: true },
    });
    if (!report || report.eventId !== eventId) {
      return res.status(404).json({ error: 'Report not found for this event.' });
    }
    res.json({ report });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch report', details: err.message });
  }
});

// Edit report title (Reporter or Admin/SuperAdmin only)
app.patch('/events/:eventId/reports/:reportId/title', async (req: any, res: any) => {
  const { eventId, reportId } = req.params;
  const { title } = req.body;
  
  if (!title || typeof title !== 'string' || title.length < 10 || title.length > 70) {
    return res.status(400).json({ error: 'title must be 10-70 characters.' });
  }
  
  try {
    // Check report exists and belongs to event
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { reporter: true },
    });
    if (!report || report.eventId !== eventId) {
      return res.status(404).json({ error: 'Report not found for this event.' });
    }
    
    // Check permissions: reporter can edit their own report, or user must be Admin/SuperAdmin
    const isReporter = req.user && req.user.id === report.reporterId;
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user?.id, eventId },
      include: { role: true },
    });
    const userRoles = userEventRoles.map((uer: any) => uer.role.name);
    const isAdminOrSuper = userRoles.includes('Admin') || userRoles.includes('SuperAdmin');
    
    if (!isReporter && !isAdminOrSuper) {
      return res.status(403).json({ error: 'Insufficient permissions to edit this report title.' });
    }
    
    // Update title
    const updated = await prisma.report.update({
      where: { id: reportId },
      data: { title },
      include: { reporter: true },
    });
    
    res.json({ report: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update report title', details: err.message });
  }
});

// Utility: resolve event slug to eventId
async function getEventIdBySlug(slug: string) {
  const event = await prisma.event.findUnique({ where: { slug } });
  return event ? event.id : null;
}

function generateInviteCode(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

async function getUserRoleForEvent(userId: string, eventId: string) {
  try {
    const userEventRole = await prisma.userEventRole.findFirst({
      where: { userId, eventId },
      include: { role: true },
    });
    return userEventRole?.role.name || null;
  } catch (err) {
    console.error('[getUserRoleForEvent] Error:', err);
    return null;
  }
}

// Get event details by slug (public, for routing)
app.get("/event/slug/:slug", async (req: any, res: any) => {
  const { slug } = req.params;
  try {
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }
    res.json({ event });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch event by slug.", details: err.message });
  }
});

// Get current user's roles for an event by slug
app.get("/events/slug/:slug/my-roles", async (req: any, res: any) => {
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
    const roles = userEventRoles.map((uer: any) => uer.role.name);
    res.json({ roles });
  } catch (err: any) {
    res.status(500).json({
      error: "Failed to fetch user roles for event.",
      details: err.message,
    });
  }
});

// Slug-based: List users and their roles for an event
app.get('/events/slug/:slug/users', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { slug } = req.params;
  const {
    search,
    sort = 'name',
    order = 'asc',
    page = 1,
    limit = 10,
    role,
  } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
  if (!slug) {
    return res.status(400).json({ error: 'Missing slug in params' });
  }
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    // Check for SuperAdmin role globally
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    const isSuperAdmin = allUserRoles.some(
      (uer: any) => uer.role.name === 'SuperAdmin',
    );
    if (!isSuperAdmin) {
      // Otherwise, check for allowed roles for this event
      const userRoles = allUserRoles.filter((uer: any) => uer.eventId === eventId);
      const hasRole = userRoles.some((uer: any) =>
        ['Admin', 'Responder', 'SuperAdmin', 'Reporter'].includes(
          uer.role.name,
        ),
      );
      if (!hasRole) {
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
      }
    }
    // Handler logic: fetch users for the event
    const userEventRoleWhere: any = { eventId };
    if (role) {
      userEventRoleWhere.role = { name: role };
    }
    if (search) {
      userEventRoleWhere.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }
    const userEventRoles = await prisma.userEventRole.findMany({
      where: userEventRoleWhere,
      include: { user: true, role: true },
      orderBy: [{ user: { [sort as string]: order } }],
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });
    // Group roles by user
    const users: any = {};
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
  } catch (err: any) {
    res
      .status(500)
      .json({ error: 'Failed to list users for event.', details: err.message });
  }
});

// PATCH: Update a user's name, email, and role for a specific event
app.patch('/events/slug/:slug/users/:userId', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { slug, userId } = req.params;
  const { name, email, role } = req.body;
  if (!slug || !userId || !role) {
    return res.status(400).json({ error: 'Missing slug, userId, or role' });
  }
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    // Check for SuperAdmin role globally
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    const isSuperAdmin = allUserRoles.some(
      (uer: any) => uer.role.name === 'SuperAdmin',
    );
    if (!isSuperAdmin) {
      // Otherwise, check for Admin role for this event
      const userRoles = allUserRoles.filter((uer: any) => uer.eventId === eventId);
      const hasRole = userRoles.some((uer: any) => uer.role.name === 'Admin');
      if (!hasRole) {
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
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
      return res.status(400).json({ error: 'Invalid role' });
    }
    await prisma.userEventRole.create({
      data: {
        userId,
        eventId,
        roleId: roleRecord.id,
      },
    });
    res.json({ message: 'User updated.' });
  } catch (err: any) {
    res.status(500).json({
      error: 'Failed to update user for event.',
      details: err.message,
    });
  }
});

// DELETE: Remove all roles for a user for a specific event
app.delete('/events/slug/:slug/users/:userId', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { slug, userId } = req.params;
  if (!slug || !userId) {
    return res.status(400).json({ error: 'Missing slug or userId' });
  }
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    // Check for SuperAdmin role globally
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    const isSuperAdmin = allUserRoles.some(
      (uer: any) => uer.role.name === 'SuperAdmin',
    );
    if (!isSuperAdmin) {
      // Otherwise, check for Admin role for this event
      const userRoles = allUserRoles.filter((uer: any) => uer.eventId === eventId);
      const hasRole = userRoles.some((uer: any) => uer.role.name === 'Admin');
      if (!hasRole) {
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
      }
    }
    // Remove all roles for this user for this event
    await prisma.userEventRole.deleteMany({
      where: { userId, eventId },
    });
    res.json({ message: 'User removed from event.' });
  } catch (err: any) {
    res.status(500).json({
      error: 'Failed to remove user from event.',
      details: err.message,
    });
  }
});

// Slug-based: List all reports for an event
app.get('/events/slug/:slug/reports', async (req: any, res: any) => {
  const { slug } = req.params;
  const { userId } = req.query;
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    const where: any = { eventId };
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
      orderBy: { createdAt: 'desc' },
    });
    res.json({ reports });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch reports', details: err.message });
  }
});

// Slug-based: Submit a report for an event (anonymous or authenticated, with evidence upload)
app.post(
  '/events/slug/:slug/reports',
  upload.array('evidence', 10),
  async (req: any, res: any) => {
    const { slug } = req.params;
    const { type, description, incidentAt, parties, title } = req.body;
    if (!type || !description || !title) {
      return res
        .status(400)
        .json({ error: 'type, title, and description are required.' });
    }
    if (typeof title !== 'string' || title.length < 10 || title.length > 70) {
      return res.status(400).json({ error: 'title must be 10-70 characters.' });
    }
    try {
      const eventId = await getEventIdBySlug(slug);
      if (!eventId) {
        return res.status(404).json({ error: 'Event not found.' });
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
          state: 'submitted',
          incidentAt: incidentAt ? new Date(incidentAt) : null,
          parties: parties || null,
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
    } catch (err: any) {
      console.error('Error creating report:', err);
      res
        .status(500)
        .json({ error: 'Failed to submit report.', details: err.message });
    }
  },
);

// Slug-based: Get a single report for an event by report ID
app.get('/events/slug/:slug/reports/:reportId', async (req: any, res: any) => {
  const { slug, reportId } = req.params;
  if (!slug || !reportId) {
    return res.status(400).json({ error: 'slug and reportId are required.' });
  }
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: 'Event not found.' });
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
      return res.status(404).json({ error: 'Report not found for this event.' });
    }
    // Access control: allow reporter or responder/admin/superadmin for the event
    const isReporter = report.reporterId && req.user.id === report.reporterId;
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id, eventId },
      include: { role: true },
    });
    const roles = userEventRoles.map((uer: any) => uer.role.name);
    const isResponderOrAbove = roles.some((r: string) =>
      ['Responder', 'Admin', 'SuperAdmin'].includes(r)
    );
    if (!isReporter && !isResponderOrAbove) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    res.json({ report });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch report', details: err.message });
  }
});

// Slug-based: Update a report (assignment, severity, resolution, state)
app.patch('/events/slug/:slug/reports/:reportId', async (req: any, res: any) => {
  const { slug, reportId } = req.params;
  const { assignedResponderId, severity, resolution, state } = req.body;
  
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    
    // Check user permissions
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id, eventId },
      include: { role: true },
    });
    const roles = userEventRoles.map((uer: any) => uer.role.name);
    const hasPermission = roles.some((r: string) =>
      ['Responder', 'Admin', 'SuperAdmin'].includes(r)
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });
    
    if (!report || report.eventId !== eventId) {
      return res.status(404).json({ error: 'Report not found for this event.' });
    }
    
    // Build update data
    const data: any = {};
    if (assignedResponderId !== undefined) data.assignedResponderId = assignedResponderId;
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
      console.log(`[DEBUG] Checking notification conditions:`, {
        assignedResponderId,
        originalAssignedResponderId,
        state,
        originalState,
        reportId,
        userId: req.user.id
      });
      
      // Notify on assignment change
      if (assignedResponderId !== undefined && assignedResponderId !== originalAssignedResponderId) {
        console.log(`[DEBUG] Creating assignment notification for report ${reportId} assigned to ${assignedResponderId}`);
        // For assignments, don't exclude the user - they should see notifications when reports are assigned to them
        await notifyReportEvent(reportId, 'report_assigned', null);
        console.log(`[Notification] Report ${reportId} assigned to ${assignedResponderId} - notification created`);
      }
      
      // Notify on state change
      if (state !== undefined && state !== originalState) {
        console.log(`[DEBUG] Creating state change notification for report ${reportId} state changed to ${state}`);
        await notifyReportEvent(reportId, 'report_status_changed', req.user.id);
        console.log(`[Notification] Report ${reportId} state changed to ${state} - notification created`);
      }
    } catch (notifyErr) {
      console.error('Failed to create notifications for report update:', notifyErr);
      // Don't fail the request if notification fails
    }

    res.json({ report: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update report', details: err.message });
  }
});

// Slug-based: Update event metadata
app.patch('/events/slug/:slug', async (req: any, res: any) => {
  const { slug } = req.params;
  const { name, description, contactEmail, newSlug } = req.body;
  
  // Check if there's anything to update
  if (!name && !description && !contactEmail && !newSlug) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }
  
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    
    // Check user permissions - only SuperAdmin and Admin can update events
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    
    const userRole = await getUserRoleForEvent(req.user.id, eventId);
    if (!userRole || !['SuperAdmin', 'Admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to update event.' });
    }
    
    // Check if newSlug already exists (if provided)
    if (newSlug && newSlug !== slug) {
      const existingEvent = await prisma.event.findUnique({ where: { slug: newSlug } });
      if (existingEvent) {
        return res.status(409).json({ error: 'Slug already exists.' });
      }
    }
    
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (contactEmail) updateData.contactEmail = contactEmail;
    if (newSlug) updateData.slug = newSlug;
    
    const event = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });
    
    res.json({ event });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update event', details: err.message });
  }
});

// User avatar endpoints
app.post('/users/:userId/avatar', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user || req.user.id !== req.params.userId) {
    console.error('[Avatar Upload] Not authorized', {
      userId: req.user?.id,
      paramsUserId: req.params.userId,
    });
    return res.status(401).json({ error: 'Not authorized' });
  }

  // Use multer middleware for single file upload
  upload.single('avatar')(req, res, async (err: any) => {
    if (err) {
      console.error('[Avatar Upload] Multer error:', err);
      return res.status(400).json({ error: 'File upload failed', details: err.message });
    }

    if (!req.file) {
      console.error('[Avatar Upload] No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only PNG and JPEG are allowed.' });
    }

    // Validate file size (2MB limit)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (req.file.size > maxSize) {
      return res.status(400).json({ error: 'File too large. Maximum size is 2MB.' });
    }

    try {
      // Remove existing avatar
      await prisma.userAvatar.deleteMany({ where: { userId: req.user.id } });

      // Create new avatar
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
    } catch (err: any) {
      console.error('[Avatar Upload] Failed to upload avatar', err);
      res.status(500).json({ error: 'Failed to upload avatar.', details: err.message });
    }
  });
});

app.delete('/users/:userId/avatar', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user || req.user.id !== req.params.userId) {
    console.error('[Avatar Delete] Not authorized', {
      userId: req.user?.id,
      paramsUserId: req.params.userId,
    });
    return res.status(401).json({ error: 'Not authorized' });
  }

  try {
    await prisma.userAvatar.deleteMany({ where: { userId: req.user.id } });
    res.status(204).send();
  } catch (err: any) {
    console.error('[Avatar Delete] Failed to delete avatar', err);
    res.status(500).json({ error: 'Failed to delete avatar.', details: err.message });
  }
});

app.get('/users/:userId/avatar', async (req: any, res: any) => {
  try {
    const avatar = await prisma.userAvatar.findUnique({
      where: { userId: req.params.userId },
    });

    if (!avatar) {
      console.error('[Avatar Fetch] No avatar found', {
        userId: req.params.userId,
      });
      return res.status(404).send('No avatar');
    }

    res.setHeader('Content-Type', avatar.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${avatar.filename}"`);
    res.send(avatar.data);
  } catch (err: any) {
    console.error('[Avatar Fetch] Failed to fetch avatar', err);
    res.status(500).json({ error: 'Failed to fetch avatar.', details: err.message });
  }
});

// Evidence file management routes
// Upload one or more evidence files to a report
app.post('/reports/:reportId/evidence', upload.array('evidence', 10), async (req: any, res: any) => {
  const { reportId } = req.params;
  
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }
    
    const uploaderId = req.isAuthenticated && req.isAuthenticated() && req.user ? req.user.id : null;
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
  } catch (err: any) {
    res.status(500).json({
      error: 'Failed to upload evidence files.',
      details: err.message,
    });
  }
});

// List all evidence files for a report (metadata only)
app.get('/reports/:reportId/evidence', async (req: any, res: any) => {
  const { reportId } = req.params;
  
  try {
    // Add access control before querying files
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { event: true }
    });
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Verify user has access to this report
    const isReporter = report.reporterId && req.user && req.user.id === report.reporterId;
    const userEventRoles = req.user ? await prisma.userEventRole.findMany({
      where: { userId: req.user.id, eventId: report.eventId },
      include: { role: true },
    }) : [];
    const roles = userEventRoles.map((uer) => uer.role.name);
    const isResponderOrAbove = roles.some((r) =>
      ['Responder', 'Admin', 'SuperAdmin'].includes(r)
    );
    
    if (!isReporter && !isResponderOrAbove) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
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
      orderBy: { createdAt: 'asc' },
    });
    
    res.json({ files });
  } catch (err: any) {
    res.status(500).json({ 
      error: 'Failed to list evidence files.', 
      details: err.message 
    });
  }
});

// Download a specific evidence file by its ID
app.get('/evidence/:evidenceId/download', async (req: any, res: any) => {
  const { evidenceId } = req.params;
  
  try {
    const evidence = await prisma.evidenceFile.findUnique({
      where: { id: evidenceId },
    });
    
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence file not found.' });
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${evidence.filename}"`);
    // Always use application/octet-stream for downloads
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', evidence.size);
    res.send(evidence.data);
  } catch (err: any) {
    res.status(500).json({
      error: 'Failed to download evidence file.',
      details: err.message,
    });
  }
});

// Delete an evidence file
app.delete('/evidence/:evidenceId', async (req: any, res: any) => {
  const { evidenceId } = req.params;
  
  try {
    const evidence = await prisma.evidenceFile.findUnique({
      where: { id: evidenceId },
    });
    
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence file not found.' });
    }
    
    await prisma.evidenceFile.delete({ where: { id: evidenceId } });
    res.json({ message: 'Evidence file deleted.' });
  } catch (err: any) {
    res.status(500).json({ 
      error: 'Failed to delete evidence file.', 
      details: err.message 
    });
  }
});

// ============================================================================
// EVENT INVITE MANAGEMENT ROUTES
// ============================================================================

// List all invite links for an event (admin only)
app.get('/events/slug/:slug/invites', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { slug } = req.params;
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) return res.status(404).json({ error: 'Event not found.' });
    // Check admin rights
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    const isSuperAdmin = allUserRoles.some(
      (uer: any) => uer.role.name === 'SuperAdmin',
    );
    if (!isSuperAdmin) {
      const userRoles = allUserRoles.filter((uer: any) => uer.eventId === eventId);
      const hasRole = userRoles.some((uer: any) => uer.role.name === 'Admin');
      if (!hasRole)
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    const invites = await prisma.eventInviteLink.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: { role: true },
    });
    const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3001';
    const invitesWithUrl = invites.map((invite: any) => ({
      ...invite,
      url: `${baseUrl}/invite/${invite.code}`,
    }));
    res.json({ invites: invitesWithUrl });
  } catch (err: any) {
    res
      .status(500)
      .json({ error: 'Failed to list invites.', details: err.message });
  }
});

// Create a new invite link for an event (admin only)
app.post('/events/slug/:slug/invites', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { slug } = req.params;
  const { maxUses, expiresAt, note, role } = req.body;
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) return res.status(404).json({ error: 'Event not found.' });
    // Check admin rights
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    const isSuperAdmin = allUserRoles.some(
      (uer: any) => uer.role.name === 'SuperAdmin',
    );
    if (!isSuperAdmin) {
      const userRoles = allUserRoles.filter((uer: any) => uer.eventId === eventId);
      const hasRole = userRoles.some((uer: any) => uer.role.name === 'Admin');
      if (!hasRole)
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    // Look up role
    const roleName = role || 'Reporter';
    const roleRecord = await prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!roleRecord) return res.status(400).json({ error: 'Invalid role' });
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
    const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3001';
    res.status(201).json({
      invite: {
        ...invite,
        url: `${baseUrl}/invite/${invite.code}`,
      },
    });
  } catch (err: any) {
    res
      .status(500)
      .json({ error: 'Failed to create invite.', details: err.message });
  }
});

// Disable (or update) an invite link (admin only)
app.patch('/events/slug/:slug/invites/:inviteId', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { slug, inviteId } = req.params;
  const { disabled, note, expiresAt, maxUses } = req.body;
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) return res.status(404).json({ error: 'Event not found.' });
    // Check admin rights
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    const isSuperAdmin = allUserRoles.some(
      (uer: any) => uer.role.name === 'SuperAdmin',
    );
    if (!isSuperAdmin) {
      const userRoles = allUserRoles.filter((uer: any) => uer.eventId === eventId);
      const hasRole = userRoles.some((uer: any) => uer.role.name === 'Admin');
      if (!hasRole)
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    const updateData: any = {};
    if (typeof disabled === 'boolean') updateData.disabled = disabled;
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
  } catch (err: any) {
    if ((err as any).code === 'P2025') {
      return res.status(404).json({ error: 'Invite not found.' });
    }
    res
      .status(500)
      .json({ error: 'Failed to update invite.', details: err.message });
  }
});

// ============================================================================
// EVENT LOGO ROUTES
// ============================================================================

// Upload a new logo for an event (Admins/SuperAdmins only)
app.post('/events/slug/:slug/logo', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { slug } = req.params;
  try {
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    // RBAC: allow SuperAdmin or Admin for this event
    const allUserRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    const isSuperAdmin = allUserRoles.some(
      (uer: any) => uer.role.name === 'SuperAdmin',
    );
    let isEventAdmin = false;
    if (!isSuperAdmin) {
      const userRoles = allUserRoles.filter((uer: any) => uer.eventId === event.id);
      isEventAdmin = userRoles.some((uer: any) => uer.role.name === 'Admin');
      if (!isEventAdmin) {
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
      }
    }
    uploadLogo.single('logo')(req, res, async function (err: any) {
      if (err) {
        return res
          .status(400)
          .json({ error: 'File upload failed', details: err.message });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
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
  } catch (err: any) {
    console.error('Failed to upload logo:', err);
    res.status(500).send(`Failed to upload logo: ${err.message}`);
  }
});

// Serve the event logo by slug (public)
app.get('/events/slug/:slug/logo', async (req: any, res: any) => {
  const { slug } = req.params;
  try {
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return res.status(404).send('Event not found');
    const logo = await prisma.eventLogo.findUnique({
      where: { eventId: event.id },
    });
    if (!logo) return res.status(404).send('Logo not found');
    res.setHeader('Content-Type', logo.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${logo.filename}"`);
    res.send(logo.data);
  } catch (err: any) {
    console.error('Failed to fetch logo:', err);
    res.status(500).send(`Failed to fetch logo: ${err.message}`);
  }
});

// ============================================================================
// PROFILE MANAGEMENT ROUTES
// ============================================================================

// Update user profile
app.patch('/users/me/profile', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { name, email } = req.body;

  try {
    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      // Check if email is already in use by another user
      const normalizedEmail = email.toLowerCase();
      const existingUser = await prisma.user.findUnique({ 
        where: { email: normalizedEmail } 
      });
      
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(409).json({ error: 'This email address is already in use.' });
      }
    }

    // Update user profile
    const updateData: any = {};
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
      avatarUrl: avatar ? `/users/${req.user.id}/avatar` : null
    };

    res.json({ 
      message: 'Profile updated successfully!',
      user: userResponse 
    });
  } catch (err: any) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Change user password
app.patch('/users/me/password', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  try {
    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify current password
    let isCurrentPasswordValid;
    try {
      isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash || '');
    } catch (err) {
      console.error('Error comparing passwords:', err);
      return res.status(400).json({ error: 'Unable to verify current password.' });
    }

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'New password must meet all security requirements: at least 8 characters, uppercase letter, lowercase letter, number, and special character.' 
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash }
    });

    res.json({ message: 'Password updated successfully!' });
  } catch (err: any) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// Get user's events with roles
app.get('/api/users/me/events', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
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
      if (!uer.event) return; // Skip if event is null
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
      eventsMap.get(eventId)?.roles.push(uer.role.name);
    });

    const events = Array.from(eventsMap.values());

    res.json({ events });
  } catch (err: any) {
    console.error('Error fetching user events:', err);
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
});

// Get user's reports across all accessible events
app.get('/api/users/me/reports', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
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
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ error: 'Invalid pagination parameters. Page and limit must be positive integers.' });
    }
    
    if (limitNum > 100) {
      return res.status(400).json({ error: 'Limit cannot exceed 100 items per page.' });
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
      if (!uer.event) return; // Skip if event is null
      const eventId = uer.event.id;
      if (!eventRoles.has(eventId)) {
        eventRoles.set(eventId, {
          event: uer.event,
          roles: []
        });
      }
      eventRoles.get(eventId)?.roles.push(uer.role.name);
    });

    // Build where clause based on user's access
    const eventIds = Array.from(eventRoles.keys());
    let whereClause: any = {
      eventId: { in: eventIds }
    };

    // Role-based filtering: Reporters only see their own reports
    const reporterOnlyEvents: string[] = [];
    const responderAdminEvents: string[] = [];
    
    eventRoles.forEach((eventData: any, eventId: string) => {
      const roles = eventData.roles;
      const hasResponderOrAdmin = roles.some((r: string) => ['Responder', 'Admin', 'SuperAdmin'].includes(r));
      
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
          { title: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ]
      });
    }

    if (status) {
      filters.push({ state: status });
    }

    if (eventFilter) {
      // Filter by specific event slug
      const targetEvent = Array.from(eventRoles.values()).find((e: any) => e.event.slug === eventFilter);
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
    const sortField = validSortFields.includes(sort as string) ? sort as string : 'createdAt';
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

  } catch (err: any) {
    console.error('Error fetching user reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// Leave an event
app.delete('/users/me/events/:eventId', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
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
      return res.status(404).json({ error: 'You are not a member of this event.' });
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
          error: 'You cannot leave this event as you are the only admin. Please assign another admin first.' 
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

    const eventName = userRoles[0]?.event?.name || 'the event';
    res.json({ message: `Successfully left ${eventName}.` });
  } catch (err: any) {
    console.error('Error leaving event:', err);
    res.status(500).json({ error: 'Failed to leave event.' });
  }
});

// Redeem an invite link (for logged-in users to join an event)
app.post('/invites/:code/redeem', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { code } = req.params;
  
  try {
    const invite = await prisma.eventInviteLink.findUnique({ where: { code } });
    if (!invite || invite.disabled) {
      return res.status(400).json({ error: 'Invalid or disabled invite link.' });
    }
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Invite link has expired.' });
    }
    if (invite.maxUses && invite.useCount >= invite.maxUses) {
      return res.status(400).json({ error: 'Invite link has reached its maximum uses.' });
    }
    
    // Check if user is already a member of the event
    const existing = await prisma.userEventRole.findFirst({
      where: {
        userId: req.user.id,
        eventId: invite.eventId,
      },
    });
    if (existing) {
      return res.status(409).json({ error: 'You are already a member of this event.' });
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
    res.status(200).json({ message: 'Joined event successfully!', eventSlug: event?.slug });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to join event.', details: err.message });
  }
});

// Get quick stats for the current user
app.get('/api/users/me/quickstats', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
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
    const adminEventIds = userEventRoles
      .filter(uer => uer.role.name === 'Admin' && uer.eventId)
      .map(uer => uer.eventId!)
      .filter((id): id is string => id !== null);
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
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch quick stats', details: err.message });
  }
});

// Get recent activity for the current user (placeholder with mock data)
app.get('/api/users/me/activity', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Mock data for now - TODO: Replace with real AuditLog queries when implemented
  const mockActivity = [
    {
      type: 'report_submitted',
      message: 'You submitted a new report in DuckCon.',
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      eventSlug: 'duckcon',
      reportId: 'rpt1',
    },
    {
      type: 'report_assigned',
      message: 'A report was assigned to you in TechFest.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      eventSlug: 'techfest',
      reportId: 'rpt2',
    },
    {
      type: 'invited',
      message: 'You were invited to PyData Chicago.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      eventSlug: 'pydata-chicago',
    },
    {
      type: 'status_changed',
      message: 'A report you submitted was marked as resolved.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      eventSlug: 'duckcon',
      reportId: 'rpt3',
    },
  ];
  
  res.json({ activity: mockActivity });
});

// ============================================================================
// NOTIFICATION ROUTES
// ============================================================================

// Get user's notifications with pagination and filtering
app.get('/api/users/me/notifications', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
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
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 per page
    
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const whereClause: any = { userId: req.user.id };
    
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

  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// Mark notification as read
app.patch('/api/notifications/:notificationId/read', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { notificationId } = req.params;

  try {
    // Check if notification belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to access this notification' });
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

    res.json({ message: 'Notification marked as read' });

  } catch (err: any) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

// Get notification statistics for user
app.get('/api/users/me/notifications/stats', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
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

    const typeStats: any = {};
    typeCounts.forEach((item: any) => {
      typeStats[item.type] = item._count.type;
    });

    const priorityStats: any = {};
    priorityCounts.forEach((item: any) => {
      priorityStats[item.priority] = item._count.priority;
    });

    res.json({
      total: totalCount,
      unread: unreadCount,
      byType: typeStats,
      byPriority: priorityStats
    });

  } catch (err: any) {
    console.error('Error fetching notification stats:', err);
    res.status(500).json({ error: 'Failed to fetch notification statistics.' });
  }
});

// TEST ROUTE: Create a test notification (remove this in production)
app.post('/api/test/create-notification', async (req: any, res: any) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const notification = await createNotification({
      userId: req.user.id,
      type: 'system_announcement',
      priority: 'normal',
      title: 'Test Notification',
      message: 'This is a test notification to verify the notification system is working.',
      actionUrl: '/dashboard'
    });

    res.json({ 
      message: 'Test notification created successfully!',
      notification: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        createdAt: notification.createdAt
      }
    });
  } catch (err: any) {
    console.error('Error creating test notification:', err);
    res.status(500).json({ error: 'Failed to create test notification.' });
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
}: {
  userId: string;
  type: 'report_submitted' | 'report_assigned' | 'report_status_changed' | 'report_comment_added' | 'event_invitation' | 'event_role_changed' | 'system_announcement';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  message: string;
  eventId?: string | null;
  reportId?: string | null;
  actionData?: any;
  actionUrl?: string | null;
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
  } catch (err: any) {
    console.error('Error creating notification:', err);
    throw err;
  }
}

// Helper function to notify users about report events
async function notifyReportEvent(reportId: string, type: string, excludeUserId: string | null = null) {
  console.log(`[DEBUG] notifyReportEvent called:`, { reportId, type, excludeUserId });
  
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        event: true,
        reporter: true,
        assignedResponder: true
      }
    });

    if (!report) {
      console.log(`[DEBUG] Report not found: ${reportId}`);
      return;
    }
    
    console.log(`[DEBUG] Report found:`, {
      id: report.id,
      title: report.title,
      eventName: report.event.name,
      reporterId: report.reporterId,
      assignedResponderId: report.assignedResponderId
    });

    const notifications: Promise<any>[] = [];

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
        console.log(`[DEBUG] Processing report_assigned notification:`, {
          assignedResponderId: report.assignedResponderId,
          excludeUserId,
          shouldNotify: report.assignedResponderId && report.assignedResponderId !== excludeUserId
        });
        
        if (report.assignedResponderId && report.assignedResponderId !== excludeUserId) {
          console.log(`[DEBUG] Creating assignment notification for user: ${report.assignedResponderId}`);
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
        } else {
          console.log(`[DEBUG] Skipping assignment notification - no assignee or assignee is excludeUserId`);
        }
        break;

      case 'report_status_changed':
        // Notify reporter and assigned responder
        const usersToNotify: string[] = [];
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
        const interestedUsers = new Set<string>();
        if (report.reporterId) interestedUsers.add(report.reporterId);
        if (report.assignedResponderId) interestedUsers.add(report.assignedResponderId);

        // Add event admins
        const admins = await prisma.userEventRole.findMany({
          where: {
            eventId: report.eventId,
            role: { name: 'Admin' }
          }
        });
        admins.forEach((admin: any) => interestedUsers.add(admin.userId));

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
    console.log(`[DEBUG] Creating ${notifications.length} notifications`);
    const results = await Promise.all(notifications);
    console.log(`[DEBUG] Successfully created ${results.length} notifications`);

  } catch (err: any) {
    console.error('Error creating report notifications:', err);
  }
}

// Startup check for required environment variables
const requiredEnv = ['DATABASE_URL', 'SESSION_SECRET', 'FRONTEND_BASE_URL'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(', ')}.\nPlease set them in your .env file.`
  );
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend server listening on port ${PORT}`);
  });
}

// Export the app for testing (CommonJS for compatibility with existing tests)
module.exports = app; 