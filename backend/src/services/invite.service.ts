import { PrismaClient } from '@prisma/client';
import { ServiceResult } from '../types';

export interface InviteCreateData {
  eventId: string;
  createdByUserId: string;
  roleId: string;
  maxUses?: number | null;
  expiresAt?: Date | null;
  note?: string | null;
}

export interface InviteUpdateData {
  disabled?: boolean;
  note?: string | null;
  expiresAt?: Date | null;
  maxUses?: number | null;
}

export interface InviteWithDetails {
  id: string;
  eventId: string;
  code: string;
  createdByUserId: string;
  createdAt: Date;
  expiresAt?: Date | null;
  maxUses?: number | null;
  useCount: number;
  disabled: boolean;
  note?: string | null;
  roleId: string;
  role?: {
    id: string;
    name: string;
  };
  url?: string;
}

export interface InviteRedemptionData {
  userId: string;
  code: string;
}

export interface RegistrationWithInviteData {
  inviteCode: string;
  email: string;
  password: string;
  name?: string;
}

export class InviteService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate a unique invite code
   */
  private generateInviteCode(length = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get invite details by code
   */
  async getInviteByCode(code: string): Promise<ServiceResult<{ invite: InviteWithDetails; event: any }>> {
    try {
      const invite = await this.prisma.eventInviteLink.findUnique({
        where: { code },
        include: {
          role: {
            select: { id: true, name: true }
          }
        }
      });

      if (!invite) {
        return {
          success: false,
          error: 'Invite not found.'
        };
      }

      const event = await this.prisma.event.findUnique({
        where: { id: invite.eventId }
      });

      if (!event) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      return {
        success: true,
        data: { invite, event }
      };
    } catch (error: any) {
      console.error('Error fetching invite details:', error);
      return {
        success: false,
        error: 'Failed to fetch invite details.'
      };
    }
  }

  /**
   * List all invites for an event
   */
  async getEventInvites(eventId: string): Promise<ServiceResult<{ invites: InviteWithDetails[] }>> {
    try {
      const invites = await this.prisma.eventInviteLink.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' },
        include: {
          role: {
            select: { id: true, name: true }
          }
        }
      });

      const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3001';
      const invitesWithUrl = invites.map(invite => ({
        ...invite,
        url: `${baseUrl}/invite/${invite.code}`
      }));

      return {
        success: true,
        data: { invites: invitesWithUrl }
      };
    } catch (error: any) {
      console.error('Error listing invites:', error);
      return {
        success: false,
        error: 'Failed to list invites.'
      };
    }
  }

  /**
   * Create a new invite link
   */
  async createInvite(data: InviteCreateData): Promise<ServiceResult<{ invite: InviteWithDetails }>> {
    try {
      const { eventId, createdByUserId, roleId, maxUses, expiresAt, note } = data;

      // Verify role exists
      const role = await this.prisma.role.findUnique({
        where: { id: roleId }
      });

      if (!role) {
        return {
          success: false,
          error: 'Invalid role'
        };
      }

      // Generate unique code
      let code: string;
      let attempts = 0;
      do {
        code = this.generateInviteCode(8);
        const existing = await this.prisma.eventInviteLink.findUnique({
          where: { code }
        });
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        return {
          success: false,
          error: 'Failed to generate unique invite code'
        };
      }

      const invite = await this.prisma.eventInviteLink.create({
        data: {
          eventId,
          code,
          createdByUserId,
          expiresAt: expiresAt || null,
          maxUses: maxUses || null,
          note: note || null,
          roleId
        },
        include: {
          role: {
            select: { id: true, name: true }
          }
        }
      });

      const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3001';
      const inviteWithUrl = {
        ...invite,
        url: `${baseUrl}/invite/${invite.code}`
      };

      return {
        success: true,
        data: { invite: inviteWithUrl }
      };
    } catch (error: any) {
      console.error('Error creating invite:', error);
      return {
        success: false,
        error: 'Failed to create invite.'
      };
    }
  }

  /**
   * Update an invite link
   */
  async updateInvite(inviteId: string, data: InviteUpdateData): Promise<ServiceResult<{ invite: InviteWithDetails }>> {
    try {
      const updateData: any = {};

      if (typeof data.disabled === 'boolean') {
        updateData.disabled = data.disabled;
      }
      if (data.note !== undefined) {
        updateData.note = data.note;
      }
      if (data.expiresAt !== undefined) {
        updateData.expiresAt = data.expiresAt;
      }
      if (data.maxUses !== undefined) {
        updateData.maxUses = data.maxUses;
      }

      const invite = await this.prisma.eventInviteLink.update({
        where: { id: inviteId },
        data: updateData,
        include: {
          role: {
            select: { id: true, name: true }
          }
        }
      });

      return {
        success: true,
        data: { invite }
      };
    } catch (error: any) {
      if ((error as any).code === 'P2025') {
        return {
          success: false,
          error: 'Invite not found.'
        };
      }
      console.error('Error updating invite:', error);
      return {
        success: false,
        error: 'Failed to update invite.'
      };
    }
  }

  /**
   * Delete an invite link
   */
  async deleteInvite(inviteId: string): Promise<ServiceResult<{ message: string }>> {
    try {
      await this.prisma.eventInviteLink.delete({
        where: { id: inviteId }
      });

      return {
        success: true,
        data: { message: 'Invite deleted successfully' }
      };
    } catch (error: any) {
      if ((error as any).code === 'P2025') {
        return {
          success: false,
          error: 'Invite not found.'
        };
      }
      console.error('Error deleting invite:', error);
      return {
        success: false,
        error: 'Failed to delete invite.'
      };
    }
  }

  /**
   * Redeem an invite (for existing users)
   */
  async redeemInvite(data: InviteRedemptionData): Promise<ServiceResult<{ message: string; eventSlug?: string }>> {
    try {
      const { userId, code } = data;

      const invite = await this.prisma.eventInviteLink.findUnique({
        where: { code }
      });

      if (!invite || invite.disabled) {
        return {
          success: false,
          error: 'Invalid or disabled invite link.'
        };
      }

      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return {
          success: false,
          error: 'Invite link has expired.'
        };
      }

      if (invite.maxUses && invite.useCount >= invite.maxUses) {
        return {
          success: false,
          error: 'Invite link has reached its maximum uses.'
        };
      }

      // Check if user is already a member of the event
      const existing = await this.prisma.userEventRole.findFirst({
        where: {
          userId,
          eventId: invite.eventId
        }
      });

      if (existing) {
        return {
          success: false,
          error: 'You are already a member of this event.'
        };
      }

      // Assign role for the event from invite
      await this.prisma.userEventRole.create({
        data: {
          userId,
          eventId: invite.eventId,
          roleId: invite.roleId
        }
      });

      // Increment useCount
      await this.prisma.eventInviteLink.update({
        where: { code },
        data: { useCount: { increment: 1 } }
      });

      // Get event slug for response
      const event = await this.prisma.event.findUnique({
        where: { id: invite.eventId }
      });

      return {
        success: true,
        data: {
          message: 'Joined event successfully!',
          ...(event?.slug && { eventSlug: event.slug })
        }
      };
    } catch (error: any) {
      console.error('Error redeeming invite:', error);
      return {
        success: false,
        error: 'Failed to join event.'
      };
    }
  }

  /**
   * Register a new user with an invite
   */
  async registerWithInvite(data: RegistrationWithInviteData): Promise<ServiceResult<{ message: string; user: any }>> {
    try {
      const { inviteCode, email, password, name } = data;

      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required.'
        };
      }

      const invite = await this.prisma.eventInviteLink.findUnique({
        where: { code: inviteCode }
      });

      if (!invite || invite.disabled) {
        return {
          success: false,
          error: 'Invalid or disabled invite link.'
        };
      }

      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return {
          success: false,
          error: 'Invite link has expired.'
        };
      }

      if (invite.maxUses && invite.useCount >= invite.maxUses) {
        return {
          success: false,
          error: 'Invite link has reached its maximum uses.'
        };
      }

      // Check if user already exists
      const existing = await this.prisma.user.findUnique({
        where: { email }
      });

      if (existing) {
        return {
          success: false,
          error: 'Email already registered.'
        };
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: 'Password must meet all security requirements: at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.'
        };
      }

      // Hash password and create user
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(password, 10);
      
      const user = await this.prisma.user.create({
        data: { email, passwordHash, name: name || null }
      });

      // Assign role for the event from invite
      await this.prisma.userEventRole.create({
        data: {
          userId: user.id,
          eventId: invite.eventId,
          roleId: invite.roleId
        }
      });

      // Increment useCount
      await this.prisma.eventInviteLink.update({
        where: { code: inviteCode },
        data: { useCount: { increment: 1 } }
      });

      return {
        success: true,
        data: {
          message: 'Registration successful!',
          user: { id: user.id, email: user.email, name: user.name }
        }
      };
    } catch (error: any) {
      console.error('Error registering with invite:', error);
      return {
        success: false,
        error: 'Failed to register with invite.'
      };
    }
  }

  /**
   * Check if an invite is valid (without redeeming it)
   */
  async validateInvite(code: string): Promise<ServiceResult<{ valid: boolean; reason?: string; invite?: InviteWithDetails }>> {
    try {
      const invite = await this.prisma.eventInviteLink.findUnique({
        where: { code },
        include: {
          role: {
            select: { id: true, name: true }
          }
        }
      });

      if (!invite) {
        return {
          success: true,
          data: { valid: false, reason: 'Invite not found' }
        };
      }

      if (invite.disabled) {
        return {
          success: true,
          data: { valid: false, reason: 'Invite is disabled' }
        };
      }

      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return {
          success: true,
          data: { valid: false, reason: 'Invite has expired' }
        };
      }

      if (invite.maxUses && invite.useCount >= invite.maxUses) {
        return {
          success: true,
          data: { valid: false, reason: 'Invite has reached maximum uses' }
        };
      }

      return {
        success: true,
        data: { valid: true, invite }
      };
    } catch (error: any) {
      console.error('Error validating invite:', error);
      return {
        success: false,
        error: 'Failed to validate invite.'
      };
    }
  }

  /**
   * Get invite statistics for an event
   */
  async getInviteStats(eventId: string): Promise<ServiceResult<{ stats: any }>> {
    try {
      const [
        totalInvites,
        activeInvites,
        expiredInvites,
        disabledInvites,
        totalUses
      ] = await Promise.all([
        this.prisma.eventInviteLink.count({ where: { eventId } }),
        this.prisma.eventInviteLink.count({
          where: {
            eventId,
            disabled: false,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
        }),
        this.prisma.eventInviteLink.count({
          where: {
            eventId,
            expiresAt: { lt: new Date() }
          }
        }),
        this.prisma.eventInviteLink.count({
          where: { eventId, disabled: true }
        }),
        this.prisma.eventInviteLink.aggregate({
          where: { eventId },
          _sum: { useCount: true }
        })
      ]);

      const stats = {
        total: totalInvites,
        active: activeInvites,
        expired: expiredInvites,
        disabled: disabledInvites,
        totalUses: totalUses._sum.useCount || 0
      };

      return {
        success: true,
        data: { stats }
      };
    } catch (error: any) {
      console.error('Error getting invite stats:', error);
      return {
        success: false,
        error: 'Failed to get invite statistics.'
      };
    }
  }
} 