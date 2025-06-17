// Load environment variables first, especially for test environment
if (process.env.NODE_ENV === 'test') {
  try {
    require('dotenv').config({ path: '.env.test', override: true });
  } catch (error) {
    console.warn('Failed to load .env.test file:', error);
  }
}

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

// Import route modules
import { 
  authRoutes, 
  userRoutes, 
  eventRoutes, 
  inviteRoutes, 
  reportRoutes,
  notificationRoutes
} from './src/routes';

// Import middleware
import { testAuthMiddleware } from './src/middleware/auth';
import { getSessionConfig } from './src/config/session';

// Initialize Prisma client (after environment is loaded)
const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 4000;

// Global request logger
app.use((req: any, _res: any, next: any) => {
  console.log('[GLOBAL] Incoming request:', req.method, req.url);
  next();
});

// Add test-only authentication middleware for tests
if (process.env.NODE_ENV === 'test') {
  app.use(testAuthMiddleware);
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

// Mount route modules
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/users', userRoutes); // Backward compatibility for tests
app.use('/api/events', eventRoutes);
app.use('/events', eventRoutes); // Backward compatibility for tests (slug routes)
app.use('/api/invites', inviteRoutes);
app.use('/invites', inviteRoutes); // Backward compatibility for tests
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

// Missing API routes that frontend expects
// Session route (frontend expects /api/session)
app.get('/api/session', async (req: any, res: any) => {
  if (req.user) {
    try {
      // Get avatar if exists
      const avatar = await prisma.userAvatar.findUnique({
        where: { userId: req.user.id }
      });

      res.json({ 
        authenticated: true, 
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          avatarUrl: avatar ? `/users/${req.user.id}/avatar` : null
        }
      });
    } catch (err: any) {
      console.error('Error fetching user avatar for session:', err);
      res.status(500).json({ error: 'Failed to fetch session data' });
    }
  } else {
    res.json({ authenticated: false });
  }
});

// System settings route (frontend expects /api/system/settings)
app.get('/api/system/settings', async (_req: any, res: any) => {
  try {
    // Get system settings from database
    const settings = await prisma.systemSetting.findMany();
    
    // Convert array to object for easier frontend usage
    const settingsObj: Record<string, string> = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    
    res.json({ settings: settingsObj });
  } catch (err: any) {
    console.error('Error fetching system settings:', err);
    res.status(500).json({ error: 'Failed to fetch system settings', details: err.message });
  }
});

// Evidence download route (standalone for public access)
app.get('/api/evidence/:evidenceId/download', async (req: any, res: any) => {
  try {
    const { evidenceId } = req.params;
    
    const evidence = await prisma.evidenceFile.findUnique({
      where: { id: evidenceId },
    });
    
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence file not found.' });
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${evidence.filename}"`);
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

// Session route for backward compatibility (keep this one for now since frontend uses it)
app.get('/session', async (req: any, res: any) => {
  if (req.user) {
    try {
      // Get avatar if exists
      const avatar = await prisma.userAvatar.findUnique({
        where: { userId: req.user.id }
      });

      res.json({ 
        authenticated: true, 
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          avatarUrl: avatar ? `/users/${req.user.id}/avatar` : null
        }
      });
    } catch (err: any) {
      console.error('Error fetching user avatar for session:', err);
      res.status(500).json({ error: 'Failed to fetch session data' });
    }
  } else {
    res.json({ authenticated: false });
  }
});

// Testing/utility routes
app.get('/audit-test', async (req: any, res: any) => {
  try {
    // Import the audit utility
    const { logAudit } = await import('./src/utils/audit');
    await logAudit({
      eventId: 'test-event',
      userId: null,
      action: 'audit-test',
      targetType: 'System',
      targetId: 'test'
    });
    res.json({ message: 'Audit event logged!' });
  } catch (error: any) {
    res.status(500).json({ error: 'Audit test failed', details: error.message });
  }
});

app.get('/admin-only', async (req: any, res: any) => {
  try {
    const { requireSuperAdmin } = await import('./src/utils/rbac');
    // Apply RBAC middleware inline for testing
    requireSuperAdmin()(req, res, () => {
      res.json({ message: 'SuperAdmin access granted!' });
    });
  } catch (error: any) {
    res.status(500).json({ error: 'RBAC test failed', details: error.message });
  }
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// 404 handler
app.use((req: any, res: any) => {
  res.status(404).json({ error: 'Route not found' });
});

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app; 