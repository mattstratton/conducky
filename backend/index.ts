// Load environment variables first, especially for test environment
// comment to kcik off pr
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
import morgan from 'morgan';

// Import logger configuration
import logger, { initializeLoggingService } from './src/config/logger';

// Import comprehensive security middleware
import { securityHeaders, apiSecurityHeaders, corsSecurityOptions, inputSecurityCheck, requestSizeLimit } from './src/middleware/security';
import { generalRateLimit } from './src/middleware/rate-limit';
import { databaseMonitoringMiddleware, performanceReportMiddleware } from './src/middleware/database-monitoring.middleware';

// Import passport configuration
import './src/config/passport';

// Validate encryption key at startup
import { validateEncryptionKey } from './src/utils/encryption';

// Skip encryption validation in test environment unless specifically needed
if (process.env.NODE_ENV !== 'test') {
  try {
    logger().info('🔐 Validating encryption key...');
    validateEncryptionKey(process.env.ENCRYPTION_KEY || '');
    logger().info('✅ Encryption key validation passed');
  } catch (error) {
    logger().error('❌ Encryption key validation failed:', (error as Error).message);
    logger().error('🔧 Please set a valid ENCRYPTION_KEY environment variable');
    logger().error('📖 See documentation for encryption key requirements');
    process.exit(1);
  }
}

// Import route modules
import { 
  authRoutes, 
  userRoutes, 
  eventRoutes, 
  inviteRoutes, 
  notificationRoutes,
  adminRoutes,
  userNotificationSettingsRoutes,
  configRoutes,
  organizationRoutes,
  auditRoutes,
  logsRoutes,
  oauthRoutes
} from './src/routes';
import tagRoutes from './src/routes/tag.routes';

// Import middleware
import { testAuthMiddleware } from './src/middleware/auth';
import { getSessionConfig } from './src/config/session';

// Import Swagger configuration
import { setupSwagger } from './src/config/swagger';

// Initialize Prisma client (after environment is loaded)
const prisma = new PrismaClient();

// Initialize configurable logging service
(async () => {
  await initializeLoggingService(prisma);
})().catch(error => {
  console.error('Failed to initialize logging service:', error);
});

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

// Trust proxy in production (required for Railway and other cloud platforms)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger().info('🛑 SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger().info('🛑 SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// CORS should be applied as early as possible so that even rejected requests include CORS headers
app.use(cors(corsSecurityOptions));

// CRITICAL SECURITY: Add comprehensive security headers
// Replace basic helmet configuration with comprehensive security middleware
app.use(securityHeaders);

// Apply API security headers to all API routes
app.use('/api', apiSecurityHeaders);

// Add request size limiting
app.use(requestSizeLimit);

// Add input security checks to all routes
app.use(inputSecurityCheck);

// Remove global general rate limit to avoid throttling normal navigation.
// Rate limiting is applied at sensitive routes (auth, report creation, uploads, etc.).
// app.use(generalRateLimit);

// HTTP request logging with Morgan
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined', { stream: (logger as any).stream }));
} else {
  app.use(morgan('combined', { 
    stream: (logger as any).stream,
    skip: (req: any, res: any) => res.statusCode < 400 // Only log errors in production
  }));
}

// Database performance monitoring
app.use(databaseMonitoringMiddleware);

// Add performance report endpoint for admin users
app.use(performanceReportMiddleware);

// Add test-only authentication middleware for tests
if (process.env.NODE_ENV === 'test') {
  app.use(testAuthMiddleware);
}

// (CORS already applied above)

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
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user/notification-settings', userNotificationSettingsRoutes); // Fix 404 error for /api/user/notification-settings
app.use('/api/config', configRoutes); // Mount configRoutes at /api/config
app.use('/api/organizations', organizationRoutes); // Organization management routes
app.use('/api/audit', auditRoutes); // Audit log routes
app.use('/api/tags', tagRoutes); // Tag management routes
app.use('/api', logsRoutes); // Frontend logging endpoint
app.use('/api', oauthRoutes); // Public OAuth providers endpoint

// Download related file (was evidence file)
// This route is not behind /api/events/:eventId/incidents/:incidentId to avoid deep nesting
// and because file IDs are unique. Access is checked within the service.
app.get('/files/:relatedFileId/download', async (req, res) => {
  const { relatedFileId } = req.params;
  const { IncidentService } = await import('./src/services/incident.service');
  const incidentService = new IncidentService(prisma);

  // Use IncidentService.getRelatedFile to fetch the file
  try {
    const result = await incidentService.getRelatedFile(relatedFileId);

    if (result.success && result.data) {
      res.setHeader('Content-Type', result.data.mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${result.data.filename}"`);
      res.send(result.data.data);
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error: any) {
          logger().error(`Failed to download related file ${relatedFileId}:`, error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Missing API routes that frontend expects
// Session route (frontend expects /api/session)
app.get('/api/session', async (req: any, res: any) => {
  if (req.user) {
    try {
      // Get user roles using unified RBAC
      const { UnifiedRBACService } = await import('./src/services/unified-rbac.service');
      const unifiedRBAC = new UnifiedRBACService(prisma);
      const systemRoles = await unifiedRBAC.getUserRoles(req.user.id, 'system', 'SYSTEM');
      const roles = systemRoles.map((userRole: { role: { name: string } }) => userRole.role.name);

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

// Public system settings that can be exposed without authentication
const PUBLIC_SETTINGS = ['showPublicEventList'];

// Public system settings route (only safe settings, no authentication required)
app.get('/api/system/settings/public', async (_req: any, res: any) => {
  try {
    // Only expose safe, public settings
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: PUBLIC_SETTINGS } }
    });
    
    // Convert array to object for easier frontend usage
    const settingsObj: Record<string, string> = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    
    res.json({ settings: settingsObj });
  } catch (err: any) {
    console.error('Error fetching public system settings:', err);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// Legacy system settings route (now returns only public settings for backward compatibility)
app.get('/api/system/settings', async (_req: any, res: any) => {
  try {
    // Only expose safe, public settings (same as /public endpoint for security)
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: PUBLIC_SETTINGS } }
    });
    
    // Convert array to object for easier frontend usage
    const settingsObj: Record<string, string> = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    
    res.json({ settings: settingsObj });
  } catch (err: any) {
    console.error('Error fetching system settings:', err);
    res.status(500).json({ error: 'Failed to fetch system settings' });
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
    // Use IncidentService.getRelatedFile to fetch the file
    const { IncidentService } = await import('./src/services/incident.service');
    const incidentService = new IncidentService(prisma);
    const result = await incidentService.getRelatedFile(evidenceId);
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }
    const relatedFile = result.data;
    if (!relatedFile) {
      return res.status(404).json({ error: 'Related file not found.' });
    }
    
    // Check if user has access to this file's incident
    const accessResult = await incidentService.checkIncidentAccess(req.user.id, relatedFile.incidentId, relatedFile.incident?.eventId);
    if (!accessResult.success || !accessResult.data?.hasAccess) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions to access this file' });
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${relatedFile.filename}"`);
    res.setHeader('Content-Type', relatedFile.mimetype || 'application/octet-stream');
    res.setHeader('Content-Length', relatedFile.size);
    res.send(relatedFile.data);
  } catch (err: any) {
    res.status(500).json({
      error: 'Failed to download related file.',
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
    const { requireSystemAdmin } = await import('./src/utils/rbac');
    // Apply RBAC middleware inline for testing
    requireSystemAdmin()(req, res, () => {
      res.json({ message: 'System Admin access granted!' });
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
  const host = '0.0.0.0'; // Always bind to 0.0.0.0 for container compatibility
  app.listen(PORT, host, () => {
    logger().info(`Server running on ${host}:${PORT}`);
logger().info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
module.exports = app;
