import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthController } from '../controllers/auth.controller';
import { loginMiddleware, logoutMiddleware } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const authService = new AuthService(prisma);
const authController = new AuthController(authService);

// Registration route
router.post('/register', authController.register.bind(authController));

// Register with invite code
router.post('/register/invite/:inviteCode', async (req: Request, res: Response): Promise<void> => {
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

    res.status(201).json(result.data);
  } catch (error: any) {
    console.error('Register with invite error:', error);
    res.status(500).json({ error: 'Registration with invite failed.' });
  }
});

// Login route
router.post('/login', loginMiddleware);

// Logout route  
router.post('/logout', logoutMiddleware);

// Get session status
router.get('/session', async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user) {
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
    }
  } catch (error: any) {
    console.error('Session check error:', error);
    res.status(500).json({ error: 'Failed to check session.' });
  }
});

// Check email availability
router.get('/check-email', authController.checkEmail.bind(authController));

// Forgot password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }
    
    const result = await authService.requestPasswordReset({ email });
    
    if (!result.success) {
      // Check if it's a rate limiting error
      if (result.error && result.error.includes('Too many password reset attempts')) {
        res.status(429).json({ error: result.error });
        return;
      }
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ message: result.data?.message });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Password reset request failed.' });
  }
});

// Reset password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
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

    res.json({ message: result.data?.message });
  } catch (error: any) {
    console.error('Reset password error:', error);
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
    });
  } catch (error: any) {
    console.error('Token validation error:', error);
    res.status(500).json({ error: 'Token validation failed.' });
  }
});

export default router; 