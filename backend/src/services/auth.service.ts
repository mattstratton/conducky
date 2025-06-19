import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ServiceResult } from '../types';
import { emailService } from '../utils/email';

export interface PasswordValidation {
  isValid: boolean;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
  score: number;
}

export interface RegistrationData {
  email: string;
  password: string;
  name: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetData {
  token: string;
  password: string;
}

export interface SessionData {
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    avatarUrl: string | null;
  };
}

export interface RateLimitResult {
  allowed: boolean;
  timeRemaining: number;
}

export class AuthService {
  // Rate limiting for password reset attempts
  // Uses database for persistence across server restarts
  constructor(private prisma: PrismaClient) {}

  /**
   * Validate password strength requirements
   */
  validatePassword(password: string): PasswordValidation {
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

  /**
   * Check if user can request password reset (rate limiting)
   */
  async checkResetRateLimit(email: string): Promise<RateLimitResult> {
    try {
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      
      // Clean up expired rate limit attempts
      await this.prisma.rateLimitAttempt.deleteMany({
        where: {
          expiresAt: { lt: now }
        }
      });
      
      // Count recent rate limit attempts for this email
      const rateLimitKey = `reset_attempt_${email.toLowerCase()}`;
      const recentAttempts = await this.prisma.rateLimitAttempt.count({
        where: {
          key: rateLimitKey,
          type: 'password_reset',
          createdAt: { gte: fifteenMinutesAgo }
        }
      });
      
      const maxAttempts = 3;
      const allowed = recentAttempts < maxAttempts;
      
      if (!allowed) {
        // Find the oldest attempt to calculate time remaining
        const oldestAttempt = await this.prisma.rateLimitAttempt.findFirst({
          where: {
            key: rateLimitKey,
            type: 'password_reset',
            createdAt: { gte: fifteenMinutesAgo }
          },
          orderBy: { createdAt: 'asc' }
        });
        
        const timeRemaining = oldestAttempt 
          ? Math.max(0, 15 * 60 * 1000 - (now.getTime() - oldestAttempt.createdAt.getTime()))
          : 0;
          
        return { allowed: false, timeRemaining };
      }
      
      return { allowed: true, timeRemaining: 0 };
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Auth] Rate limit check error:', error);
      }
      // On error, allow the request to prevent blocking legitimate users
      return { allowed: true, timeRemaining: 0 };
    }
  }

  /**
   * Register a new user
   */
  async registerUser(data: RegistrationData): Promise<ServiceResult<{ user: any; madeSuperAdmin: boolean }>> {
    try {
      const { email, password, name } = data;

      // Validate input
      if (!email || !password || !name) {
        return {
          success: false,
          error: "Name, email, and password are required."
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          success: false,
          error: "Please enter a valid email address."
        };
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: "Password must meet all security requirements: at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character."
        };
      }

      // Validate name length
      if (name.trim().length < 1) {
        return {
          success: false,
          error: "Name is required."
        };
      }

      // Check if email already exists
      const existing = await this.prisma.user.findUnique({ 
        where: { email: email.toLowerCase() } 
      });
      if (existing) {
        return {
          success: false,
          error: "Email already registered."
        };
      }

      // Create user
      const userCount = await this.prisma.user.count();
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await this.prisma.user.create({
        data: { 
          email: email.toLowerCase(), 
          passwordHash, 
          name: name.trim() 
        },
      });

      // If this is the first user, assign SuperAdmin role globally (eventId: null)
      let madeSuperAdmin = false;
      if (userCount === 0) {
        let superAdminRole = await this.prisma.role.findUnique({
          where: { name: "SuperAdmin" },
        });
        if (!superAdminRole) {
          superAdminRole = await this.prisma.role.create({
            data: { name: "SuperAdmin" },
          });
        }
        await this.prisma.userEventRole.create({
          data: {
            userId: user.id,
            eventId: null, // Global role assignment
            roleId: superAdminRole.id,
          },
        });
        madeSuperAdmin = true;
      }

      return {
        success: true,
        data: {
          user: { id: user.id, email: user.email, name: user.name },
          madeSuperAdmin
        }
      };
    } catch (error: any) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: "Registration failed.",
        details: error.message
      };
    }
  }

  /**
   * Check if email is available for registration
   */
  async checkEmailAvailability(email: string): Promise<ServiceResult<{ available: boolean }>> {
    try {
      if (!email) {
        return {
          success: false,
          error: "Email parameter is required."
        };
      }

      const existing = await this.prisma.user.findUnique({ where: { email } });
      return {
        success: true,
        data: { available: !existing }
      };
    } catch (error: any) {
      return {
        success: false,
        error: "Failed to check email availability.",
        details: error.message
      };
    }
  }

  /**
   * Request password reset (send reset email)
   */
  async requestPasswordReset(data: PasswordResetRequest): Promise<ServiceResult<{ message: string }>> {
    try {
      const { email } = data;

      if (!email) {
        return {
          success: false,
          error: "Email is required."
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          success: false,
          error: "Please enter a valid email address."
        };
      }

      // Check rate limiting FIRST, before finding user
      const rateCheck = await this.checkResetRateLimit(email.toLowerCase());
      if (!rateCheck.allowed) {
        const minutesRemaining = Math.ceil(rateCheck.timeRemaining / (60 * 1000));
        return {
          success: false,
          error: `Too many password reset attempts. Please try again in ${minutesRemaining} minutes.`
        };
      }

      const user = await this.prisma.user.findUnique({ 
        where: { email: email.toLowerCase() } 
      });

      // Always return success to prevent email enumeration
      // but only send email if user exists
      if (user) {
        // Generate secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

        // Clean up only expired tokens (keep recent ones for rate limiting)
        await this.prisma.passwordResetToken.deleteMany({
          where: {
            expiresAt: { lt: new Date() }
          }
        });

        // Create new reset token (this also serves as rate limiting record)
        await this.prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            token: resetToken,
            expiresAt
          }
        });

        // Send password reset email
        try {
          await emailService.sendPasswordReset(user.email, user.name || 'User', resetToken);
        } catch (emailError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[Auth] Failed to send reset email:', emailError);
          }
          // Continue - don't expose email sending errors to user
        }
      } else {
        // For non-existent users, we still enforce rate limiting without creating dummy users
        // This prevents email enumeration while maintaining data integrity
        const rateLimitKey = `reset_attempt_${email.toLowerCase()}`;
        
        // Store rate limit data in the new RateLimitAttempt table
        await this.prisma.rateLimitAttempt.create({
          data: {
            key: rateLimitKey,
            type: 'password_reset',
            identifier: email.toLowerCase(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
          }
        });
      }

      // Always return the same response to prevent email enumeration
      return {
        success: true,
        data: { 
          message: "If an account with that email exists, we've sent a password reset link." 
        }
      };
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Auth] Forgot password error:', error);
      }
      return {
        success: false,
        error: "Failed to process password reset request."
      };
    }
  }

  /**
   * Validate password reset token
   */
  async validateResetToken(token: string): Promise<ServiceResult<{ valid: boolean; email?: string; expiresAt?: Date; error?: string }>> {
    try {
      if (!token || typeof token !== 'string') {
        return {
          success: false,
          error: "Token is required."
        };
      }

      // Find the token
      const resetToken = await this.prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: { select: { email: true } } }
      });

      if (!resetToken) {
        return {
          success: true,
          data: { 
            valid: false, 
            error: "Invalid reset token." 
          }
        };
      }

      if (resetToken.used) {
        return {
          success: true,
          data: { 
            valid: false, 
            error: "Reset token has already been used." 
          }
        };
      }

      if (new Date() > resetToken.expiresAt) {
        return {
          success: true,
          data: { 
            valid: false, 
            error: "Reset token has expired." 
          }
        };
      }

      // Token is valid
      return {
        success: true,
        data: { 
          valid: true, 
          email: resetToken.user.email,
          expiresAt: resetToken.expiresAt
        }
      };
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Auth] Validate reset token error:', error);
      }
      return {
        success: false,
        error: "Failed to validate reset token."
      };
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: PasswordResetData): Promise<ServiceResult<{ message: string }>> {
    try {
      const { token, password } = data;

      if (!token || !password) {
        return {
          success: false,
          error: "Token and password are required."
        };
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: "Password must meet all security requirements: at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character."
        };
      }

      // Find valid token
      const resetToken = await this.prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!resetToken) {
        return {
          success: false,
          error: "Invalid or expired reset token."
        };
      }

      if (resetToken.used) {
        return {
          success: false,
          error: "Reset token has already been used."
        };
      }

      if (new Date() > resetToken.expiresAt) {
        return {
          success: false,
          error: "Reset token has expired."
        };
      }

      // Hash the new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update user password and mark token as used
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash }
        }),
        this.prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { used: true }
        })
      ]);

      return {
        success: true,
        data: { 
          message: "Password has been reset successfully. You can now login with your new password." 
        }
      };
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Auth] Reset password error:', error);
      }
      return {
        success: false,
        error: "Failed to reset password."
      };
    }
  }

  /**
   * Get session data for authenticated user
   */
  async getSessionData(userId: string): Promise<ServiceResult<SessionData>> {
    try {
      // Fetch user roles
      const userEventRoles = await this.prisma.userEventRole.findMany({
        where: { userId },
        include: { role: true },
      });

      // Flatten roles to a list of role names
      const roles = userEventRoles.map((uer: any) => uer.role.name);

      // Check for avatar
      const avatar = await this.prisma.userAvatar.findUnique({
        where: { userId },
      });

      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true }
      });

      if (!user) {
        return {
          success: false,
          error: "User not found."
        };
      }

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name || '',
            roles,
            avatarUrl: avatar ? `/users/${user.id}/avatar` : null,
          }
        }
      };
    } catch (error: any) {
      console.error('[Auth] Get session data error:', error);
      return {
        success: false,
        error: "Failed to get session data."
      };
    }
  }
} 