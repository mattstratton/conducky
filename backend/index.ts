// Load environment variables first, especially for test environment
if (process.env.NODE_ENV === 'test') {
  try {
    require('dotenv').config({ path: '.env.test', override: true });
  } catch (error) {
    // Silently handle missing .env.test file
  }
}

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import helmet from 'helmet';

// Import passport configuration
import './src/config/passport';

// Import route modules
import { 
  authRoutes, 
  userRoutes, 
  eventRoutes, 
  inviteRoutes, 
  reportRoutes,
  notificationRoutes,
  adminRoutes,
  userNotificationSettingsRoutes,
  configRoutes,
  organizationRoutes
} from './src/routes';

// Import middleware
import { testAuthMiddleware } from './src/middleware/auth';
import { getSessionConfig } from './src/config/session';

// Import Swagger configuration
import { setupSwagger } from './src/config/swagger';

// Initialize Prisma client (after environment is loaded)
const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 4000;

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// CRITICAL SECURITY: Add comprehensive security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Next.js dev
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for file uploads
  crossOriginResourcePolicy: false, // Allow cross-origin access to avatars/images
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Request logger (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use((req: any, _res: any, next: any) => {
    console.log('[DEV] Request:', req.method, req.url);
    next();
  });
}

// Add test-only authentication middleware for tests
if (process.env.NODE_ENV === 'test') {
  app.use(testAuthMiddleware);
}

// CORS middleware (allow frontend dev server)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Cookie',
      ...(process.env.NODE_ENV === 'test' ? ['x-test-user-id', 'x-test-disable-auth'] : [])
    ],
  }),
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(getSessionConfig());

// Passport.js setup
app.use(passport.initialize());
app.use(passport.session());

// Passport strategies are configured in ./src/config/passport

// Setup Swagger API documentation (only in development or when explicitly enabled)
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_SWAGGER === 'true') {
  setupSwagger(app);
}

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
app.use('/api/admin', adminRoutes);
app.use('/api/user/notification-settings', userNotificationSettingsRoutes); // Fix 404 error for /api/user/notification-settings
app.use('/api/config', configRoutes); // Mount configRoutes at /api/config
app.use('/api/organizations', organizationRoutes); // Organization management routes

// Missing API routes that frontend expects
// Session route (frontend expects /api/session)
app.get('/api/session', async (req: any, res: any) => {
  if (req.user) {
    try {
      // Get user roles (same pattern as RBAC middleware)
      const userEventRoles = await prisma.userEventRole.findMany({
        where: { userId: req.user.id },
        include: { role: true },
      });
      const roles = userEventRoles.map((uer: any) => uer.role.name);

      // Get avatar if exists
      const avatar = await prisma.userAvatar.findUnique({
        where: { userId: req.user.id }
      });

      const response = { 
        authenticated: true, 
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          roles: roles,
          avatarUrl: avatar ? `/users/${req.user.id}/avatar` : null
        }
      };
      res.json(response);
    } catch (err: any) {
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
    res.status(500).json({ error: 'Failed to fetch system settings', details: err.message });
  }
});

// Evidence download route (with proper access control)
app.get('/api/evidence/:evidenceId/download', async (req: any, res: any) => {
  try {
    const { evidenceId } = req.params;
    
    // Check authentication
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const evidence = await prisma.evidenceFile.findUnique({
      where: { id: evidenceId },
      include: {
        report: {
          include: {
            event: true
          }
        }
      }
    });
    
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence file not found.' });
    }

    // Check if user has access to this evidence file's report
    const { ReportService } = await import('./src/services/report.service');
    const reportService = new ReportService(prisma);
    const accessResult = await reportService.checkReportAccess(req.user.id, evidence.reportId, evidence.report.eventId);
    
    if (!accessResult.success) {
      return res.status(500).json({ error: accessResult.error });
    }

    if (!accessResult.data?.hasAccess) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions to access this evidence file' });
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${evidence.filename}"`);
    res.setHeader('Content-Type', evidence.mimetype || 'application/octet-stream');
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
      res.status(500).json({ error: 'Failed to fetch session data' });
    }
  } else {
    res.json({ authenticated: false });
  }
});

// Email config status endpoint
import { EmailService } from './src/utils/email';

app.get('/api/config/email-enabled', (_req, res) => {
  try {
    const emailService = new EmailService();
    const config = (emailService as any).config;
    let enabled = false;
    if (config.provider === 'smtp') {
      enabled = !!(config.smtp && config.smtp.host && config.smtp.port && config.smtp.auth && config.smtp.auth.user && config.smtp.auth.pass);
    } else if (config.provider === 'sendgrid') {
      enabled = !!(config.sendgrid && config.sendgrid.apiKey);
    } else if (config.provider === 'console') {
      enabled = true; // Console provider is valid for testing
    }
    res.json({ enabled });
  } catch (err) {
    res.status(500).json({ enabled: false, error: 'Could not determine email configuration.' });
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
  // Log errors only in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Unhandled error:', err);
  }
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

export default app;
module.exports = app;