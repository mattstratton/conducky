import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ServiceResult } from '../types';
import { emailService } from '../utils/email';
import { UnifiedRBACService } from './unified-rbac.service';
import { logAudit } from '../utils/audit';
import logger from '../config/logger';

export interface PasswordValidation {
  isValid: boolean;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
    noCommonPatterns: boolean;
    noPersonalInfo: boolean;
  };
  score: number;
  strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
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
  private rbacService: UnifiedRBACService;

  // Rate limiting for password reset attempts
  // Uses database for persistence across server restarts
  constructor(private prisma: PrismaClient) {
    this.rbacService = new UnifiedRBACService(prisma);
  }

  /**
   * Validate password strength requirements
   * Enhanced with additional security checks and detailed feedback
   */
  validatePassword(password: string, userEmail?: string, userName?: string): PasswordValidation {
    const feedback: string[] = [];
    
    // Common weak patterns to avoid - simplified for better performance
    const commonPatterns = [
      /(.)\1{3,}/,           // Repeated characters (aaaa, 1111) - increased threshold
      /123456|234567|345678|456789|567890/,  // Sequential numbers (longer sequences)
      /abcdef|qwerty|asdfgh|zxcvbn|fedcba/i, // Common keyboard/sequential patterns
      /^password$|^pass$|^pwd$|^secret$|^login$|^admin$|^user$|^test$|^qwerty$|^asdf$|^zxcv$/i,  // Exact matches only
      /^[0-9]+$/,            // Only numbers
      /^[a-z]+$/,            // Only lowercase
      /^[A-Z]+$/,            // Only uppercase
    ];

    // Basic requirements
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
      noCommonPatterns: !commonPatterns.some(pattern => pattern.test(password)),
      noPersonalInfo: true // Default to true, will check below
    };

    // Enhanced personal info validation
    const lowerPassword = password.toLowerCase();
    
    // Check for email parts
    if (userEmail && userEmail.trim()) {
      const emailLower = userEmail.toLowerCase().trim();
      const username = emailLower.split('@')[0];
      const domain = emailLower.split('@')[1]?.split('.')[0];
      
      if (username && username.length >= 3 && lowerPassword.includes(username)) {
        requirements.noPersonalInfo = false;
        feedback.push('Password should not contain parts of your email address');
      }
      
      if (domain && domain.length >= 3 && lowerPassword.includes(domain)) {
        requirements.noPersonalInfo = false;
        feedback.push('Password should not contain parts of your email domain');
      }
    }
    
    // Check for name parts with improved robustness
    if (userName && userName.trim()) {
      const nameParts = userName.toLowerCase().trim().split(/\s+/).filter(part => part.length > 0);
      for (const part of nameParts) {
        if (part.length >= 4 && lowerPassword.includes(part)) {
          requirements.noPersonalInfo = false;
          feedback.push('Password should not contain your name');
          break; // Only add the message once
        }
      }
    }

    // Add specific feedback for missing requirements
    if (!requirements.length) {
      feedback.push('Password must be at least 8 characters long');
    }
    if (!requirements.uppercase) {
      feedback.push('Password must contain at least one uppercase letter');
    }
    if (!requirements.lowercase) {
      feedback.push('Password must contain at least one lowercase letter');
    }
    if (!requirements.number) {
      feedback.push('Password must contain at least one number');
    }
    if (!requirements.special) {
      feedback.push('Password must contain at least one special character');
    }
    if (!requirements.noCommonPatterns) {
      feedback.push('Password contains common patterns that are easy to guess');
    }

    // Calculate score and strength
    const score = Object.values(requirements).filter(Boolean).length;
    const isValid = score === Object.keys(requirements).length;

    let strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
    if (score <= 2) strength = 'very-weak';
    else if (score <= 3) strength = 'weak';
    else if (score <= 4) strength = 'fair';
    else if (score <= 5) strength = 'good';
    else strength = 'strong';

    // Add suggestions for better security
    if (password.length < 12 && isValid) {
      feedback.push('Consider using a longer password (12+ characters) for better security');
    }

    return {
      isValid,
      requirements,
      score,
      strength,
      feedback
    };
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
      if (process.env.NODE_ENV !== 'test') {
        logger().error('[Auth] Rate limit check error:', error);
      }
      // On error, allow the request to prevent blocking legitimate users
      return { allowed: true, timeRemaining: 0 };
    }
  }

  /**
   * Register a new user
   */
  async registerUser(data: RegistrationData): Promise<ServiceResult<{ user: any; madeSystemAdmin: boolean }>> {
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
      const passwordValidation = this.validatePassword(password, email, name);
      if (!passwordValidation.isValid) {
        const errorMessage = passwordValidation.feedback.length > 0 
          ? passwordValidation.feedback.join('; ')
          : "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character, and be at least 8 characters long.";
        return {
          success: false,
          error: errorMessage
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

      // If this is the first user, assign system_admin role using unified RBAC
      let madeSystemAdmin = false;
      if (userCount === 0) {
        madeSystemAdmin = await this.rbacService.grantRole(
          user.id, 
          'system_admin', 
          'system', 
          ''
        );
      }

      // Log user registration
      await logAudit({
        action: 'user_registered',
        targetType: 'User',
        targetId: user.id,
        userId: user.id
      });

      return {
        success: true,
        data: {
          user: { id: user.id, email: user.email, name: user.name },
          madeSystemAdmin
        }
      };
    } catch (error: any) {
      logger().error("Registration error:", error);
      return {
        success: false,
        error: "Registration failed.",
        details: error.message
      };
    }
  }

  /**
   * Check if email is available for registration
   * Modified to prevent user enumeration attacks by being less revealing
   */
  async checkEmailAvailability(email: string): Promise<ServiceResult<{ available: boolean }>> {
    try {
      if (!email) {
        return {
          success: false,
          error: "Email parameter is required."
        };
      }

      // Validate email format first - using safer regex pattern
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        return {
          success: false,
          error: "Please enter a valid email address."
        };
      }

      const existing = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      
      // Always return a consistent response structure
      // In production, we might want to be even less revealing
      const available = !existing;
      
      // Log potential enumeration attempts for security monitoring
      if (!available) {
        logger().warn('Email availability check for existing email', {
          email: email.toLowerCase(),
          timestamp: new Date().toISOString(),
          context: 'email_enumeration_attempt'
        });
      }
      
      return {
        success: true,
        data: { available }
      };
    } catch (error: any) {
      logger().error('Error checking email availability:', error);
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
        // Create rate limit attempt record for tracking
        const rateLimitKey = `reset_attempt_${email.toLowerCase()}`;
        await this.prisma.rateLimitAttempt.create({
          data: {
            key: rateLimitKey,
            type: 'password_reset',
            identifier: email.toLowerCase(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
          }
        });

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
            logger().error('[Auth] Failed to send reset email:', emailError);
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
      if (process.env.NODE_ENV !== 'test') {
        logger().error('[Auth] Forgot password error:', error);
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
        include: { user: { select: { email: true, name: true } } }
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
      if (process.env.NODE_ENV !== 'test') {
        logger().error('[Auth] Validate reset token error:', error);
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

      // Find valid token first (validate token before password)
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

      // Validate password strength after token validation (include user data for personal info checking)
      const passwordValidation = this.validatePassword(password, resetToken.user.email, resetToken.user.name || undefined);
      if (!passwordValidation.isValid) {
        const errorMessage = passwordValidation.feedback.length > 0 
          ? passwordValidation.feedback.join('; ')
          : "Password must meet all security requirements: at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.";
        return {
          success: false,
          error: errorMessage
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
        logger().error('[Auth] Reset password error:', error);
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
      // Fetch user roles using unified RBAC service
      const userRoles = await this.rbacService.getUserRoles(userId);

      // Flatten roles to a list of role names (unified role names)
      const roles = userRoles.map((ur: any) => ur.role.name);

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
      logger().error('[Auth] Get session data error:', error);
      return {
        success: false,
        error: "Failed to get session data."
      };
    }
  }
} 