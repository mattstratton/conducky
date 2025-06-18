import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { ServiceResult } from '../types';

export interface ProfileUpdateData {
  name?: string;
  email?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

export interface UserEvent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  roles: string[];
}

export interface UserReport {
  id: string;
  title: string;
  description: string;
  state: string;
  createdAt: Date;
  updatedAt: Date;
  event: {
    id: string;
    name: string;
    slug: string;
  };
  reporter: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  assignedResponder: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  evidenceFiles: {
    id: string;
    filename: string;
    mimetype: string;
    size: number;
  }[];
  _count: {
    comments: number;
  };
  userRoles: string[];
}

export interface UserReportsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  event?: string;
  assigned?: string;
  sort?: string;
  order?: string;
}

export interface QuickStats {
  eventCount: number;
  reportCount: number;
  needsResponseCount: number;
}

export interface ActivityItem {
  type: string;
  message: string;
  timestamp: string;
  eventSlug?: string;
  reportId?: string;
}

export interface AvatarUpload {
  filename: string;
  mimetype: string;
  size: number;
  data: Buffer;
}

export class UserService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Validate password strength requirements
   */
  private validatePassword(password: string) {
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
   * Update user profile (name and/or email)
   */
  async updateProfile(userId: string, data: ProfileUpdateData): Promise<ServiceResult<{ user: any; message: string }>> {
    try {
      const { name, email } = data;

      // Validate email format if provided
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return {
            success: false,
            error: 'Please enter a valid email address.'
          };
        }

        // Check if email is already in use by another user
        const normalizedEmail = email.toLowerCase();
        const existingUser = await this.prisma.user.findUnique({ 
          where: { email: normalizedEmail } 
        });
        
        if (existingUser && existingUser.id !== userId) {
          return {
            success: false,
            error: 'This email address is already in use.'
          };
        }
      }

      // Update user profile
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email.toLowerCase();

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      // Get avatar if exists
      const avatar = await this.prisma.userAvatar.findUnique({
        where: { userId }
      });

      const userResponse = {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatarUrl: avatar ? `/users/${userId}/avatar` : null
      };

      return {
        success: true,
        data: {
          message: 'Profile updated successfully!',
          user: userResponse
        }
      };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        error: 'Failed to update profile.'
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, data: PasswordChangeData): Promise<ServiceResult<{ message: string }>> {
    try {
      const { currentPassword, newPassword } = data;

      if (!currentPassword || !newPassword) {
        return {
          success: false,
          error: 'Current password and new password are required.'
        };
      }

      // Get user with password hash
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found.'
        };
      }

      // Verify current password
      let isCurrentPasswordValid;
      try {
        isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash || '');
      } catch (err) {
        console.error('Error comparing passwords:', err);
        return {
          success: false,
          error: 'Unable to verify current password.'
        };
      }

      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: 'Current password is incorrect.'
        };
      }

      // Validate new password strength
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: 'New password must meet all security requirements: at least 8 characters, uppercase letter, lowercase letter, number, and special character.'
        };
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      });

      return {
        success: true,
        data: { message: 'Password updated successfully!' }
      };
    } catch (error: any) {
      console.error('Error changing password:', error);
      return {
        success: false,
        error: 'Failed to change password.'
      };
    }
  }

  /**
   * Get user's events with roles
   */
  async getUserEvents(userId: string): Promise<ServiceResult<{ events: UserEvent[]; globalRoles: string[] }>> {
    try {
      const userEventRoles = await this.prisma.userEventRole.findMany({
        where: { userId },
        include: {
          event: true,
          role: true
        }
      });

      // Group by event and collect roles
      const eventsMap = new Map();
      const globalRoles: string[] = [];
      
      userEventRoles.forEach(uer => {
        if (!uer.event) {
          // This is a global role (eventId is null)
          globalRoles.push(uer.role.name);
          return;
        }
        
        const eventId = uer.event.id;
        if (!eventsMap.has(eventId)) {
          eventsMap.set(eventId, {
            id: uer.event.id,
            name: uer.event.name,
            slug: uer.event.slug,
            description: uer.event.description,
            roles: []
          });
        }
        eventsMap.get(eventId)?.roles.push(uer.role.name);
      });

      const events = Array.from(eventsMap.values());

      return {
        success: true,
        data: { events, globalRoles }
      };
    } catch (error: any) {
      console.error('Error fetching user events:', error);
      return {
        success: false,
        error: 'Failed to fetch events.'
      };
    }
  }

  /**
   * Get user's reports across all accessible events
   */
  async getUserReports(userId: string, query: UserReportsQuery): Promise<ServiceResult<{ 
    reports: UserReport[]; 
    total: number; 
    page: number; 
    limit: number; 
    totalPages: number; 
  }>> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        event: eventFilter,
        assigned,
        sort = 'createdAt',
        order = 'desc'
      } = query;

      // Validate and parse pagination
      const pageNum = parseInt(page.toString());
      const limitNum = parseInt(limit.toString());
      
      if (pageNum < 1 || limitNum < 1) {
        return {
          success: false,
          error: 'Invalid pagination parameters. Page and limit must be positive integers.'
        };
      }
      
      if (limitNum > 100) {
        return {
          success: false,
          error: 'Limit cannot exceed 100 items per page.'
        };
      }
      
      const skip = (pageNum - 1) * limitNum;

      // Get user's event roles to determine access
      const userEventRoles = await this.prisma.userEventRole.findMany({
        where: { userId },
        include: {
          event: true,
          role: true
        }
      });

      if (userEventRoles.length === 0) {
        return {
          success: true,
          data: { reports: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 }
        };
      }

      // Group roles by event for access control
      const eventRoles = new Map();
      userEventRoles.forEach(uer => {
        if (!uer.event) return; // Skip if event is null
        const eventId = uer.event.id;
        if (!eventRoles.has(eventId)) {
          eventRoles.set(eventId, {
            event: uer.event,
            roles: []
          });
        }
        eventRoles.get(eventId)?.roles.push(uer.role.name);
      });

      // Build where clause based on user's access
      const eventIds = Array.from(eventRoles.keys());
      let whereClause: any = {
        eventId: { in: eventIds }
      };

      // Role-based filtering: Reporters only see their own reports
      const reporterOnlyEvents: string[] = [];
      const responderAdminEvents: string[] = [];
      
      eventRoles.forEach((eventData: any, eventId: string) => {
        const roles = eventData.roles;
        const hasResponderOrAdmin = roles.some((r: string) => ['Responder', 'Admin', 'SuperAdmin'].includes(r));
        
        if (hasResponderOrAdmin) {
          responderAdminEvents.push(eventId);
        } else {
          reporterOnlyEvents.push(eventId);
        }
      });

      // Build complex where clause for role-based access
      if (reporterOnlyEvents.length > 0 && responderAdminEvents.length > 0) {
        whereClause = {
          OR: [
            // Reports in events where user is responder/admin (all reports)
            { eventId: { in: responderAdminEvents } },
            // Reports in events where user is only reporter (only their reports)
            { 
              AND: [
                { eventId: { in: reporterOnlyEvents } },
                { reporterId: userId }
              ]
            }
          ]
        };
      } else if (reporterOnlyEvents.length > 0) {
        // User is only reporter in all events
        whereClause = {
          eventId: { in: reporterOnlyEvents },
          reporterId: userId
        };
      } else {
        // User is responder/admin in all events
        whereClause = {
          eventId: { in: responderAdminEvents }
        };
      }

      // Apply filters while preserving access control
      const filters = [];
      
      // Preserve the original access control as the base
      const baseAccessControl = { ...whereClause };
      
      if (search) {
        filters.push({
          OR: [
            { title: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } }
          ]
        });
      }

      if (status) {
        filters.push({ state: status });
      }

      if (eventFilter) {
        // Filter by specific event slug
        const targetEvent = Array.from(eventRoles.values()).find((e: any) => e.event.slug === eventFilter);
        if (targetEvent) {
          filters.push({ eventId: targetEvent.event.id });
        } else {
          // User doesn't have access to this event
          return {
            success: true,
            data: { reports: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 }
          };
        }
      }

      if (assigned === 'me') {
        filters.push({ assignedResponderId: userId });
      } else if (assigned === 'unassigned') {
        filters.push({ assignedResponderId: null });
      }

      // Combine base access control with filters using AND
      if (filters.length > 0) {
        whereClause = {
          AND: [
            baseAccessControl,
            ...filters
          ]
        };
      }

      // Build sort clause
      const validSortFields = ['createdAt', 'updatedAt', 'title', 'state'];
      const sortField = validSortFields.includes(sort as string) ? sort as string : 'createdAt';
      const sortOrder = order === 'asc' ? 'asc' : 'desc';

      // Get total count
      const total = await this.prisma.report.count({ where: whereClause });

      // Get reports with pagination
      const reports = await this.prisma.report.findMany({
        where: whereClause,
        include: {
          event: {
            select: { id: true, name: true, slug: true }
          },
          reporter: {
            select: { id: true, name: true, email: true }
          },
          assignedResponder: {
            select: { id: true, name: true, email: true }
          },
          evidenceFiles: {
            select: { id: true, filename: true, mimetype: true, size: true }
          },
          _count: {
            select: { comments: true }
          }
        },
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limitNum
      });

      // Add user's role in each event to the response
      const reportsWithRoles = reports.map(report => ({
        ...report,
        userRoles: eventRoles.get(report.eventId)?.roles || []
      }));

      return {
        success: true,
        data: {
          reports: reportsWithRoles,
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      };
    } catch (error: any) {
      console.error('Error fetching user reports:', error);
      return {
        success: false,
        error: 'Failed to fetch reports.'
      };
    }
  }

  /**
   * Leave an event
   */
  async leaveEvent(userId: string, eventId: string): Promise<ServiceResult<{ message: string }>> {
    try {
      // Check if user is a member of the event
      const userRoles = await this.prisma.userEventRole.findMany({
        where: { 
          userId, 
          eventId 
        },
        include: {
          event: true,
          role: true
        }
      });

      if (userRoles.length === 0) {
        return {
          success: false,
          error: 'You are not a member of this event.'
        };
      }

      // Check if user is the only admin
      const isAdmin = userRoles.some(ur => ur.role.name === 'Admin');
      if (isAdmin) {
        const adminCount = await this.prisma.userEventRole.count({
          where: {
            eventId,
            role: { name: 'Admin' }
          }
        });

        if (adminCount === 1) {
          return {
            success: false,
            error: 'You cannot leave this event as you are the only admin. Please assign another admin first.'
          };
        }
      }

      // Remove user from event
      await this.prisma.userEventRole.deleteMany({
        where: {
          userId,
          eventId
        }
      });

      const eventName = userRoles[0]?.event?.name || 'the event';
      return {
        success: true,
        data: { message: `Successfully left ${eventName}.` }
      };
    } catch (error: any) {
      console.error('Error leaving event:', error);
      return {
        success: false,
        error: 'Failed to leave event.'
      };
    }
  }

  /**
   * Get quick stats for the current user
   */
  async getQuickStats(userId: string): Promise<ServiceResult<QuickStats>> {
    try {
      // Get all event memberships
      const userEventRoles = await this.prisma.userEventRole.findMany({
        where: { userId },
        include: { event: true, role: true },
      });
      const eventIds = userEventRoles.map(uer => uer.eventId).filter(Boolean);
      const eventCount = new Set(eventIds).size;

      // Get unique report IDs to avoid double counting when user has multiple roles for same report
      const reporterIds = await this.prisma.report.findMany({ 
        where: { reporterId: userId }, 
        select: { id: true } 
      });
      const responderIds = await this.prisma.report.findMany({ 
        where: { assignedResponderId: userId }, 
        select: { id: true } 
      });
      
      // Count events where user is admin
      const adminEventIds = userEventRoles
        .filter(uer => uer.role.name === 'Admin' && uer.eventId)
        .map(uer => uer.eventId!)
        .filter((id): id is string => id !== null);
      const adminIds = adminEventIds.length > 0 ? await this.prisma.report.findMany({ 
        where: { eventId: { in: adminEventIds } }, 
        select: { id: true } 
      }) : [];

      // Use Set to get unique report IDs across all roles
      const uniqueReportIds = new Set([
        ...reporterIds.map(r => r.id),
        ...responderIds.map(r => r.id),
        ...adminIds.map(r => r.id)
      ]);
      const reportCount = uniqueReportIds.size;

      // Needs response: reports assigned to user as responder and not closed/resolved
      const needsResponseCount = await this.prisma.report.count({
        where: {
          assignedResponderId: userId,
          state: { in: ['submitted', 'acknowledged', 'investigating'] },
        },
      });

      return {
        success: true,
        data: { eventCount, reportCount, needsResponseCount }
      };
    } catch (error: any) {
      console.error('Error fetching quick stats:', error);
      return {
        success: false,
        error: 'Failed to fetch quick stats.'
      };
    }
  }

  /**
   * Get recent activity for the current user (placeholder with mock data)
   */
  async getActivity(userId: string): Promise<ServiceResult<{ activity: ActivityItem[] }>> {
    try {
      // Mock data for now - TODO: Replace with real AuditLog queries when implemented
      const mockActivity = [
        {
          type: 'report_submitted',
          message: 'You submitted a new report in DuckCon.',
          timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          eventSlug: 'duckcon',
          reportId: 'rpt1',
        },
        {
          type: 'report_assigned',
          message: 'A report was assigned to you in TechFest.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          eventSlug: 'techfest',
          reportId: 'rpt2',
        },
        {
          type: 'invited',
          message: 'You were invited to PyData Chicago.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
          eventSlug: 'pydata-chicago',
        },
        {
          type: 'status_changed',
          message: 'A report you submitted was marked as resolved.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          eventSlug: 'duckcon',
          reportId: 'rpt3',
        },
      ];
      
      return {
        success: true,
        data: { activity: mockActivity }
      };
    } catch (error: any) {
      console.error('Error fetching activity:', error);
      return {
        success: false,
        error: 'Failed to fetch activity.'
      };
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(userId: string, avatarData: AvatarUpload): Promise<ServiceResult<{ avatarId: string }>> {
    try {
      const { filename, mimetype, size, data } = avatarData;

      // Validate file type
      const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedMimeTypes.includes(mimetype)) {
        return {
          success: false,
          error: 'Invalid file type. Only PNG and JPEG are allowed.'
        };
      }

      // Validate file size (2MB limit)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (size > maxSize) {
        return {
          success: false,
          error: 'File too large. Maximum size is 2MB.'
        };
      }

      // Remove existing avatar
      await this.prisma.userAvatar.deleteMany({ where: { userId } });

      // Create new avatar
      const avatar = await this.prisma.userAvatar.create({
        data: {
          userId,
          filename,
          mimetype,
          size,
          data,
        },
      });

      return {
        success: true,
        data: { avatarId: avatar.id }
      };
    } catch (error: any) {
      console.error('Failed to upload avatar:', error);
      return {
        success: false,
        error: 'Failed to upload avatar.'
      };
    }
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(userId: string): Promise<ServiceResult<void>> {
    try {
      await this.prisma.userAvatar.deleteMany({ where: { userId } });
      return {
        success: true,
        data: undefined
      };
    } catch (error: any) {
      console.error('Failed to delete avatar:', error);
      return {
        success: false,
        error: 'Failed to delete avatar.'
      };
    }
  }

  /**
   * Get user avatar
   */
  async getAvatar(userId: string): Promise<ServiceResult<{ filename: string; mimetype: string; data: Buffer }>> {
    try {
      const avatar = await this.prisma.userAvatar.findUnique({
        where: { userId },
      });

      if (!avatar) {
        return {
          success: false,
          error: 'No avatar found'
        };
      }

      return {
        success: true,
        data: {
          filename: avatar.filename,
          mimetype: avatar.mimetype,
          data: Buffer.from(avatar.data)
        }
      };
    } catch (error: any) {
      console.error('Failed to fetch avatar:', error);
      return {
        success: false,
        error: 'Failed to fetch avatar.'
      };
    }
  }
} 