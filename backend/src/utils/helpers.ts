/**
 * General Helper Utilities
 * 
 * This module contains general-purpose helper functions
 */

import crypto from 'crypto';
import { prisma } from '../config/database';

/**
 * Get event ID by slug
 * @param slug - The event slug
 * @returns Promise<string | null> - Event ID or null if not found
 */
export async function getEventIdBySlug(slug: string): Promise<string | null> {
  const event = await prisma.event.findUnique({ where: { slug } });
  return event?.id || null;
}

/**
 * Generate a random invite code
 * @param length - Length of the invite code (default: 16)
 * @returns string - Random invite code
 */
export function generateInviteCode(length = 16): string {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
}

/**
 * Get user's role for a specific event
 * @param userId - The user ID
 * @param eventId - The event ID
 * @returns Promise<string | null> - Role name or null if no role
 */
export async function getUserRoleForEvent(userId: string, eventId: string): Promise<string | null> {
  const userEventRole = await prisma.userEventRole.findFirst({
    where: { userId, eventId },
    include: { role: true },
  });
  return userEventRole?.role.name || null;
}



/**
 * Generate a secure random token
 * @param length - Length of the token in bytes (default: 32)
 * @returns string - Random token
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Sleep/delay function for testing or rate limiting
 * @param ms - Milliseconds to sleep
 * @returns Promise<void>
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
} 