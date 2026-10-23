/**
 * Database-based Rate Limiting Service
 * Provides persistent rate limiting using PostgreSQL
 */

import { PrismaClient } from '../generated/prisma/client';
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  max: number;           // Maximum number of requests per window
  message?: string;      // Error message
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export class DatabaseRateLimiter {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create rate limiting middleware
   */
  createLimiter(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip rate limiting in test environment
        if (process.env.NODE_ENV === 'test') {
          return next();
        }

        const identifier = this.getIdentifier(req);
        const endpoint = this.getEndpoint(req);
        const now = new Date();
        const windowStart = new Date(now.getTime() - config.windowMs);

        // Clean up old rate limit records (older than window)
        await this.cleanup(windowStart);

        // Get current window's rate limit record
        const currentWindow = this.getCurrentWindow(now, config.windowMs);
        
        // Check existing attempts in current window
        const existingRecord = await this.prisma.rateLimit.findFirst({
          where: {
            identifier,
            endpoint,
            windowStart: {
              gte: windowStart
            }
          }
        });        if (existingRecord) {
          if (existingRecord.attempts >= config.max) {
            // Rate limit exceeded
            const retryAfterSeconds = Math.ceil(config.windowMs / 1000);
            res.set('Retry-After', retryAfterSeconds.toString());
            return res.status(429).json({
              error: 'Rate limit exceeded',
              message: config.message || 'Too many requests, please try again later.',
              retryAfter: retryAfterSeconds
            });
          }

          // Increment attempts
          await this.prisma.rateLimit.update({
            where: { id: existingRecord.id },
            data: { 
              attempts: existingRecord.attempts + 1,
              updatedAt: now
            }
          });
        } else {
          // Create new rate limit record
          await this.prisma.rateLimit.create({
            data: {
              identifier,
              endpoint,
              attempts: 1,
              windowStart: currentWindow,
              updatedAt: now
            }
          });
        }

        next();
      } catch (error) {
        // Log error but don't block request on rate limiting failure
        logger().error('Rate limiting error:', error);
        next();
      }
    };
  }

  /**
   * Get identifier for rate limiting (IP address or user ID)
   */
  private getIdentifier(req: Request): string {
    // Prefer user ID if authenticated, fallback to IP
    const user = (req as any).user;
    if (user?.id) {
      return `user:${user.id}`;
    }
    
    // Get IP address (handle proxies)
    const forwarded = req.get('X-Forwarded-For');
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip || req.socket.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Get endpoint identifier
   */
  private getEndpoint(req: Request): string {
    return `${req.method}:${req.route?.path || req.path}`;
  }

  /**
   * Get current window start time
   */
  private getCurrentWindow(now: Date, windowMs: number): Date {
    const windowSeconds = Math.floor(windowMs / 1000);
    const currentSeconds = Math.floor(now.getTime() / 1000);
    const windowStart = Math.floor(currentSeconds / windowSeconds) * windowSeconds;
    return new Date(windowStart * 1000);
  }

  /**
   * Clean up old rate limit records
   */
  private async cleanup(cutoffDate: Date): Promise<void> {
    try {
      await this.prisma.rateLimit.deleteMany({
        where: {
          windowStart: {
            lt: cutoffDate
          }
        }
      });
    } catch (error) {
      // Log cleanup errors but don't fail the request
      logger().error('Rate limit cleanup error:', error);
    }
  }

  /**
   * Reset rate limits for a specific identifier (useful for testing)
   */
  async resetLimits(identifier: string): Promise<void> {
    await this.prisma.rateLimit.deleteMany({
      where: { identifier }
    });
  }

  /**
   * Get current rate limit status for an identifier
   */
  async getStatus(identifier: string, endpoint: string, windowMs: number): Promise<{
    attempts: number;
    resetTime: Date;
  }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);
    
    const record = await this.prisma.rateLimit.findFirst({
      where: {
        identifier,
        endpoint,
        windowStart: { gte: windowStart }
      }
    });

    return {
      attempts: record?.attempts || 0,
      resetTime: new Date(now.getTime() + windowMs)
    };
  }
}
