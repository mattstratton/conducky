import { Router, Request, Response } from 'express';
import passport from 'passport';
import { AuthService } from '../services/auth.service';
import { AuthController } from '../controllers/auth.controller';
import { loginMiddleware, logoutMiddleware } from '../middleware/auth';
import { createPrismaClient } from '../config/prisma-client';
import logger from '../config/logger';
import bcrypt from 'bcrypt';
import validator from 'validator';
import { EmailVerificationService, isGated } from '../services/email-verification.service';
import { emailService } from '../utils/email';
import { logAudit } from '../utils/audit';

// Import security middleware
import { authRateLimit, passwordResetRateLimit, emailCheckRateLimit } from '../middleware/rate-limit';
import { validateUser, handleValidationErrors } from '../middleware/validation';

// Extend session interface to include OAuth state
declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
  }
}

// Temporary store for OAuth state (in production, use Redis or database)
const oauthStateStore = new Map<string, { nextUrl: string; timestamp: number }>();

// Clean up expired state entries (older than 10 minutes)
let cleanupInterval: NodeJS.Timeout | null = null;

// Only start cleanup interval in non-test environments
if (process.env.NODE_ENV !== 'test') {
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of oauthStateStore.entries()) {
      if (now - value.timestamp > 10 * 60 * 1000) { // 10 minutes
        oauthStateStore.delete(key);
      }
    }
  }, 60 * 1000); // Clean up every minute
}

// Export cleanup function for tests
export const cleanupOAuthInterval = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
};

const router = Router();
const prisma = createPrismaClient();
const authService = new AuthService(prisma);
const authController = new AuthController(authService);

// Registration route
router.post('/register', authRateLimit, authController.register.bind(authController));

// Register with invite code
router.post('/register/invite/:inviteCode', authRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { inviteCode } = req.params;
    const { email, password, name } = req.body;
      if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    
    // Import invite service
    const { InviteService } = await import('../services/invite.service');
    const inviteService = new InviteService(prisma);
    
    const result = await inviteService.registerWithInvite({
      inviteCode,
      email,
      password,
      name
    });
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json(result.data);  } catch (error: any) {
    logger().error('Register with invite error:', error);
    res.status(500).json({ error: 'Registration with invite failed.' });
  }
});

// Login route
router.post('/login', authRateLimit, loginMiddleware);

// Email verification (public; the token or password is the credential)
const verification = new EmailVerificationService(prisma);
const DUMMY_HASH = '$2b$10$K7L1OJ45/4Y.aKqyudyeNu.oQ8fP3WXAoVLYU2aEXCLWHuCrTyHqS';
const normEmail = (v: unknown): string => (typeof v === 'string' ? v.trim().toLowerCase() : '');

router.post('/verify-email', authRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body ?? {};
    const result = typeof token === 'string' ? await verification.verifyToken(token) : { status: 'invalid' as const };
    if (result.status === 'invalid') {
      res.status(400).json({ error: 'This verification link is invalid or has expired.' });
      return;
    }
    res.json({ status: result.status });
  } catch (error: any) {
    logger().error('Verify email error:', { error: error?.message });
    res.status(500).json({ error: 'Email verification failed.' });
  }
});

// Always the same 200, and the send is not awaited, so neither body nor timing reveals the account state.
router.post('/resend-verification', authRateLimit, (req: Request, res: Response): void => {
  const email = normEmail(req.body?.email);
  if (email) {
    verification.resendFor(email).catch((error: any) => {
      logger().error('Resend verification failed', { error: error?.message });
    });
  }
  res.json({ message: 'If that account is awaiting verification, a new email is on its way.' });
});

router.post('/correct-email', authRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const email = normEmail(req.body?.email);
    const newEmail = normEmail(req.body?.newEmail);
    const password = req.body?.password;
    if (!email || typeof password !== 'string' || !password) {
      res.status(400).json({ error: 'Email, password and new email are required.' });
      return;
    }
    if (!newEmail || newEmail.length > 254 || !validator.isEmail(newEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    // Unknown accounts still pay for a bcrypt compare so timing does not reveal them.
    const passwordOk = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH) && !!user?.passwordHash;
    if (!user || !passwordOk) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (!isGated(user) || !(await emailService.isConfigured())) {
      res.status(400).json({ error: 'This account does not need email verification.' });
      return;
    }
    if (newEmail === email) {
      await verification.resendFor(email);
      res.json({ email });
      return;
    }
    // All validation done; only now touch anything destructive.
    const holder = await prisma.user.findUnique({ where: { email: newEmail } });
    if (holder && !(await verification.releaseUnverifiedAddress(newEmail))) {
      res.status(409).json({ error: 'Email already registered.' });
      return;
    }
    try {
      await prisma.user.update({ where: { id: user.id }, data: { email: newEmail } });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        res.status(409).json({ error: 'Email already registered.' });
        return;
      }
      throw err;
    }
    const verificationEmailSent = await verification.sendVerification({ id: user.id, email: newEmail, name: user.name });
    await logAudit({ action: 'verification_email_corrected', targetType: 'User', targetId: user.id, userId: user.id });
    res.json({ email: newEmail, verificationEmailSent });
  } catch (error: any) {
    logger().error('Correct email error:', { error: error?.message });
    res.status(500).json({ error: 'Email correction failed.' });
  }
});

// Logout route  
router.post('/logout', logoutMiddleware);

// Get session status
router.get('/session', async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user) {
      // Return basic user info without additional database queries
      // This prevents potential database-related auth failures in production
      res.json({ 
        authenticated: true, 
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name
        }
      });
    } else {
      res.json({ authenticated: false });
    }  } catch (error: any) {
    logger().error('Session check error:', error);
    res.status(500).json({ error: 'Failed to check session.' });
  }
});

// Diagnostic endpoint to test database queries (temporary)
router.get('/session-debug', async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.json({ error: 'Authentication required' });
      return;
    }

    const diagnostics: any = {
      userId: req.user.id,
      queries: {}
    };

    try {
      // Test Unified RBAC query
      const unifiedRBAC = new (await import('../services/unified-rbac.service')).UnifiedRBACService(prisma);
      const userRoles = await unifiedRBAC.getUserRoles(req.user.id);
      diagnostics.queries.unifiedRoles = {
        success: true,
        count: userRoles.length,
        data: userRoles
      };
    } catch (error: any) {
      diagnostics.queries.unifiedRoles = {
        success: false,
        error: error.message
      };
    }

    try {
      // Test UserAvatar query
      const avatar = await prisma.userAvatar.findUnique({
        where: { userId: req.user.id }
      });
      diagnostics.queries.userAvatar = {
        success: true,
        found: !!avatar,
        data: avatar ? { id: avatar.id, filename: avatar.filename } : null
      };
    } catch (error: any) {
      diagnostics.queries.userAvatar = {
        success: false,
        error: error.message
      };
    }

    res.json(diagnostics);  } catch (error: any) {
    logger().error('Session debug error:', error);
    res.status(500).json({ error: 'Debug failed', details: error.message });
  }
});

// Check email availability
router.get('/check-email', emailCheckRateLimit, authController.checkEmail.bind(authController));

// Forgot password
router.post('/forgot-password', passwordResetRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }
    
    const result = await authService.requestPasswordReset({ email });
    
    if (!result.success) {
      // Check if it's a rate limiting error
      if (result.error && result.error.startsWith('Too many password reset attempts')) {
        res.status(429).json({ error: result.error });
        return;
      }
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ message: result.data?.message });  } catch (error: any) {
    logger().error('Forgot password error:', error);
    res.status(500).json({ error: 'Password reset request failed.' });
  }
});

// Reset password
router.post('/reset-password', passwordResetRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;
      if (!token || !password) {
      res.status(400).json({ error: 'Token and password are required.' });
      return;
    }

    const result = await authService.resetPassword({ token, password });
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ message: result.data?.message });  } catch (error: any) {
    logger().error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed.' });
  }
});

// Validate reset token
router.get('/validate-reset-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;
    
    if (!token) {
      res.status(400).json({ error: 'Token is required.' });
      return;
    }

    const result = await authService.validateResetToken(token as string);
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    // If token is invalid, return 400 with error details
    if (!result.data?.valid) {
      res.status(400).json({ 
        valid: false,
        error: result.data?.error 
      });
      return;
    }

    res.json({ 
      valid: result.data.valid,
      email: result.data.email,
      expiresAt: result.data.expiresAt
    });  } catch (error: any) {
    logger().error('Token validation error:', error);
    res.status(500).json({ error: 'Token validation failed.' });
  }
});

// Google OAuth routes
router.get('/google', (req: Request, res: Response, next: Function) => {
  // Generate a unique state ID for this OAuth flow
  const stateId = `oauth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store the next URL in our temporary store
  if (req.query.state && typeof req.query.state === 'string') {
    oauthStateStore.set(stateId, {
      nextUrl: req.query.state,
      timestamp: Date.now()
    });
  }
  
  // Also store in session as backup (though this may not survive)
  if (req.query.state && typeof req.query.state === 'string') {
    req.session.oauthState = req.query.state;
  }
  
  // Pass the state ID to Google OAuth
  const authOptions: any = { 
    scope: ['profile', 'email'],
    state: stateId
  };
  
  passport.authenticate('google', authOptions)(req, res, next);
});

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_BASE_URL || 'http://localhost:3001'}/login?error=oauth_failed` }),
  (req: Request, res: Response) => {
    // Successful authentication, redirect based on stored state
    const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3001';
    let nextUrl = '/dashboard'; // default
    
    // Try to get the next URL from our temporary store using the state ID
    if (req.query.state && typeof req.query.state === 'string') {
      const stateData = oauthStateStore.get(req.query.state);
      if (stateData) {
        nextUrl = stateData.nextUrl;
        // Clean up the state from our store
        oauthStateStore.delete(req.query.state);
      }
    }
    
    // Fallback to session state (if it survived)
    if (nextUrl === '/dashboard' && req.session.oauthState) {
      nextUrl = decodeURIComponent(req.session.oauthState as string);
    }
    
    // Validate nextUrl to prevent open redirect attacks
    if (nextUrl && !nextUrl.startsWith('/')) {
      // Only allow relative URLs starting with /
      nextUrl = '/dashboard';
    }
    
    // Clear the state from session
    delete req.session.oauthState;
      // Save session before redirect to ensure persistence
    req.session.save((err) => {
      if (err) {
        logger().error('Google OAuth session save error:', err);
      }
      res.redirect(`${frontendUrl}${nextUrl}`);
    });
  }
);

// GitHub OAuth routes
router.get('/github', (req: Request, res: Response, next: Function) => {
  // Generate a unique state ID for this OAuth flow
  const stateId = `oauth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store the next URL in our temporary store
  if (req.query.state && typeof req.query.state === 'string') {
    oauthStateStore.set(stateId, {
      nextUrl: req.query.state,
      timestamp: Date.now()
    });
  }
  
  // Also store in session as backup (though this may not survive)
  if (req.query.state && typeof req.query.state === 'string') {
    req.session.oauthState = req.query.state;
  }
  
  // Pass the state ID to GitHub OAuth
  const authOptions: any = { 
    scope: ['user:email'],
    state: stateId
  };
  
  passport.authenticate('github', authOptions)(req, res, next);
});

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: `${process.env.FRONTEND_BASE_URL || 'http://localhost:3001'}/login?error=oauth_failed` }),
  (req: Request, res: Response) => {
    // Successful authentication, redirect based on stored state
    const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3001';
    let nextUrl = '/dashboard'; // default
    
    // Try to get the next URL from our temporary store using the state ID
    if (req.query.state && typeof req.query.state === 'string') {
      const stateData = oauthStateStore.get(req.query.state);
      if (stateData) {
        nextUrl = stateData.nextUrl;
        // Clean up the state from our store
        oauthStateStore.delete(req.query.state);
      }
    }
    
    // Fallback to session state (if it survived)
    if (nextUrl === '/dashboard' && req.session.oauthState) {
      nextUrl = decodeURIComponent(req.session.oauthState as string);
    }
    
    // Validate nextUrl to prevent open redirect attacks
    if (nextUrl && !nextUrl.startsWith('/')) {
      // Only allow relative URLs starting with /
      nextUrl = '/dashboard';
    }
    
    // Clear the state from session
    delete req.session.oauthState;
      // Save session before redirect to ensure persistence
    req.session.save((err) => {
      if (err) {
        logger().error('GitHub OAuth session save error:', err);
      }
      res.redirect(`${frontendUrl}${nextUrl}`);
    });
  }
);

export default router; 