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

// Slug-based: List users and their roles for an event
app.get('/events/slug/:slug/users', async (req: any, res: any) => {
  const { slug } = req.params;
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        role: { select: { id: true, name: true } },
      },
    });
    
    const users = userEventRoles.map((uer: any) => ({
      ...uer.user,
      role: uer.role,
    }));
    
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

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