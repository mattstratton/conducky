const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cors = require('cors');
const app = express();
const PORT = 4000;
const { logAudit } = require('./utils/audit');
const { requireRole, requireSuperAdmin } = require('./utils/rbac');

// Global request logger
app.use((req, res, next) => {
  console.log('[GLOBAL] Incoming request:', req.method, req.url);
  next();
});

// Multer setup for evidence uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// CORS middleware (allow frontend dev server)
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'changeme',
  resave: false,
  saveUninitialized: false,
}));

// Passport.js setup
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
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
  }
));

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
app.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    const userCount = await prisma.user.count();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });
    // If this is the first user, assign SuperAdmin role globally (eventId: null)
    let madeSuperAdmin = false;
    if (userCount === 0) {
      let superAdminRole = await prisma.role.findUnique({ where: { name: 'SuperAdmin' } });
      if (!superAdminRole) {
        superAdminRole = await prisma.role.create({ data: { name: 'SuperAdmin' } });
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
      message: 'Registration successful!',
      user: { id: user.id, email: user.email, name: user.name },
      madeSuperAdmin,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Registration failed.', details: err.message });
  }
});

// Login route
app.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'Logged in!', user: { id: req.user.id, email: req.user.email, name: req.user.name } });
});

// Logout route
app.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).json({ error: 'Logout failed.' });
    res.json({ message: 'Logged out!' });
  });
});

// Session check route
app.get('/session', async (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    // Fetch user roles
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true }
    });
    // Flatten roles to a list of role names
    const roles = userEventRoles.map(uer => uer.role.name);
    res.json({ user: { id: req.user.id, email: req.user.email, name: req.user.name, roles } });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.get('/', async (req, res) => {
  // Check if any users exist
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    return res.json({ firstUserNeeded: true });
  }
  res.json({ message: 'Backend API is running!' });
});

app.get('/audit-test', async (req, res) => {
  // Example usage: log a test audit event
  try {
    await logAudit({
      eventId: '902288b2-388a-4292-83b6-4c30e566a413',
      userId: null, // or a real user ID if available
      action: 'test_action',
      targetType: 'Test',
      targetId: '123',
    });
    res.json({ message: 'Audit event logged!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log audit event', details: err.message });
  }
});

// Example protected route
app.get('/admin-only', requireRole(['Admin']), (req, res) => {
  res.json({ message: 'You are an admin for this event!', user: { id: req.user.id, email: req.user.email } });
});

// Super Admin: Create Event
app.post('/events', requireSuperAdmin(), async (req, res) => {
  const { name, slug } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: 'Name and slug are required.' });
  }
  // Slug validation: lowercase, url-safe (letters, numbers, hyphens), no spaces
  const slugPattern = /^[a-z0-9-]+$/;
  if (!slugPattern.test(slug)) {
    return res.status(400).json({ error: 'Slug must be all lowercase, URL-safe (letters, numbers, hyphens only, no spaces).' });
  }
  try {
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: 'Slug already exists.' });
    }
    const event = await prisma.event.create({ data: { name, slug } });
    res.status(201).json({ event });
  } catch (err) {
    res.status(500).json({ error: 'Event creation failed.', details: err.message });
  }
});

// Super Admin: List all events
app.get('/events', requireSuperAdmin(), async (req, res) => {
  try {
    const events = await prisma.event.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list events.', details: err.message });
  }
});

// Get event details (Admins or SuperAdmins for that event)
app.get('/events/:eventId', requireRole(['Admin', 'SuperAdmin']), async (req, res) => {
  const { eventId } = req.params;
  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    res.json({ event });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get event details.', details: err.message });
  }
});

// Assign a role to a user for an event
app.post('/events/:eventId/roles', requireRole(['Admin', 'SuperAdmin']), async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign role.', details: err.message });
  }
});

// Remove a role from a user for an event
app.delete('/events/:eventId/roles', requireRole(['Admin', 'SuperAdmin']), async (req, res) => {
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
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove role.', details: err.message });
  }
});

// List all users and their roles for an event
app.get('/events/:eventId/users', async (req, res) => {
  console.log('[ROUTE] /events/:eventId/users handler', { url: req.url, params: req.params, query: req.query });
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
    const isSuperAdmin = allUserRoles.some(uer => uer.role.name === 'SuperAdmin');
    if (!isSuperAdmin) {
      // Otherwise, check for allowed roles for this event
      const userRoles = allUserRoles.filter(uer => uer.eventId === eventId);
      const hasRole = userRoles.some(uer => ['Admin', 'SuperAdmin'].includes(uer.role.name));
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
    const users = {};
    userEventRoles.forEach(uer => {
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
    res.status(500).json({ error: 'Failed to list users for event.', details: err.message });
  }
});

// Submit a report for an event (anonymous or authenticated, with evidence upload)
app.post('/events/:eventId/reports', upload.single('evidence'), async (req, res) => {
  console.log('Received report submission:', req.body, req.file);
  const { eventId } = req.params;
  const { type, description } = req.body;
  let evidencePath = null;
  if (req.file) {
    evidencePath = path.relative(__dirname, req.file.path);
  }
  if (!type || !description) {
    return res.status(400).json({ error: 'type and description are required.' });
  }
  try {
    // Check event exists
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    // If authenticated, use req.user.id as reporterId; else null
    const reporterId = req.isAuthenticated && req.isAuthenticated() && req.user ? req.user.id : null;
    const report = await prisma.report.create({
      data: {
        eventId,
        reporterId,
        type,
        description,
        state: 'submitted',
        evidence: evidencePath,
      },
    });
    res.status(201).json({ report });
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Failed to submit report.', details: err.message });
  }
});

// Admin: List all users (Super Admin only)
app.get('/admin/users', requireSuperAdmin(), async (req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list users.', details: err.message });
  }
});

// Admin: List all roles (Super Admin only)
app.get('/admin/roles', requireSuperAdmin(), async (req, res) => {
  try {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    res.json({ roles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list roles.', details: err.message });
  }
});

// Admin: Search users by email or name (Super Admin only)
app.get('/admin/users/search', requireSuperAdmin(), async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required.' });
  }
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to search users.', details: err.message });
  }
});

// Admin: Create/invite a new user (Super Admin only)
app.post('/admin/users', requireSuperAdmin(), async (req, res) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    const user = await prisma.user.create({ data: { email, name } });
    // In a real system, send invite email here
    res.status(201).json({ message: 'User created/invited.', user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create/invite user.', details: err.message });
  }
});

// List all reports for an event
app.get('/events/:eventId/reports', async (req, res) => {
  const { eventId } = req.params;
  try {
    const reports = await prisma.report.findMany({
      where: { eventId },
      include: { reporter: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports', details: err.message });
  }
});

// Get a single report for an event by report ID
app.get('/events/:eventId/reports/:reportId', async (req, res) => {
  const { eventId, reportId } = req.params;
  if (!eventId || !reportId) {
    return res.status(400).json({ error: 'eventId and reportId are required.' });
  }
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { reporter: true },
    });
    if (!report || report.eventId !== eventId) {
      return res.status(404).json({ error: 'Report not found for this event.' });
    }
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch report', details: err.message });
  }
});

// Change the state of a report (Responder/Admin/SuperAdmin only)
app.patch('/events/:eventId/reports/:reportId/state', requireRole(['Responder', 'Admin', 'SuperAdmin']), async (req, res) => {
  const { eventId, reportId } = req.params;
  const { state } = req.body;
  const validStates = ['submitted', 'acknowledged', 'investigating', 'resolved', 'closed'];
  if (!state || !validStates.includes(state)) {
    return res.status(400).json({ error: 'Invalid or missing state.' });
  }
  try {
    // Check report exists and belongs to event
    const report = await prisma.report.findUnique({ where: { id: reportId } });
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
  } catch (err) {
    res.status(500).json({ error: 'Failed to update report state', details: err.message });
  }
});

// Utility: resolve event slug to eventId
async function getEventIdBySlug(slug) {
  const event = await prisma.event.findUnique({ where: { slug } });
  return event ? event.id : null;
}

// Get event details by slug (public, for routing)
app.get('/event/slug/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    res.json({ event });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event by slug.', details: err.message });
  }
});

// Slug-based: List all reports for an event
app.get('/events/slug/:slug/reports', async (req, res) => {
  const { slug } = req.params;
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    const reports = await prisma.report.findMany({
      where: { eventId },
      include: { reporter: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports', details: err.message });
  }
});

// Slug-based: Submit a report for an event (anonymous or authenticated, with evidence upload)
app.post('/events/slug/:slug/reports', upload.single('evidence'), async (req, res) => {
  const { slug } = req.params;
  const { type, description } = req.body;
  let evidencePath = null;
  if (req.file) {
    evidencePath = path.relative(__dirname, req.file.path);
  }
  if (!type || !description) {
    return res.status(400).json({ error: 'type and description are required.' });
  }
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    // If authenticated, use req.user.id as reporterId; else null
    const reporterId = req.isAuthenticated && req.isAuthenticated() && req.user ? req.user.id : null;
    const report = await prisma.report.create({
      data: {
        eventId,
        reporterId,
        type,
        description,
        state: 'submitted',
        evidence: evidencePath,
      },
    });
    res.status(201).json({ report });
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Failed to submit report.', details: err.message });
  }
});

// Slug-based: Get a single report for an event by report ID
app.get('/events/slug/:slug/reports/:reportId', async (req, res) => {
  const { slug, reportId } = req.params;
  if (!slug || !reportId) {
    return res.status(400).json({ error: 'slug and reportId are required.' });
  }
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { reporter: true },
    });
    if (!report || report.eventId !== eventId) {
      return res.status(404).json({ error: 'Report not found for this event.' });
    }
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch report', details: err.message });
  }
});

// Slug-based: Change the state of a report (Responder/Admin/SuperAdmin only)
app.patch('/events/slug/:slug/reports/:reportId/state', requireRole(['Responder', 'Admin', 'SuperAdmin']), async (req, res) => {
  const { slug, reportId } = req.params;
  const { state } = req.body;
  const validStates = ['submitted', 'acknowledged', 'investigating', 'resolved', 'closed'];
  if (!state || !validStates.includes(state)) {
    return res.status(400).json({ error: 'Invalid or missing state.' });
  }
  try {
    const eventId = await getEventIdBySlug(slug);
    if (!eventId) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    // Check report exists and belongs to event
    const report = await prisma.report.findUnique({ where: { id: reportId } });
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
  } catch (err) {
    res.status(500).json({ error: 'Failed to update report state', details: err.message });
  }
});

// Slug-based: List all users and their roles for an event
app.get('/events/slug/:slug/users', async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { slug } = req.params;
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
    const isSuperAdmin = allUserRoles.some(uer => uer.role.name === 'SuperAdmin');
    if (!isSuperAdmin) {
      // Otherwise, check for allowed roles for this event
      const userRoles = allUserRoles.filter(uer => uer.eventId === eventId);
      const hasRole = userRoles.some(uer => ['Admin', 'SuperAdmin'].includes(uer.role.name));
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
    const users = {};
    userEventRoles.forEach(uer => {
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
    res.status(500).json({ error: 'Failed to list users for event.', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
}); 