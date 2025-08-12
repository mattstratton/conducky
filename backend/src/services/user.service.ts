import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { ServiceResult } from '../types';
import { UnifiedRBACService } from './unified-rbac.service';
import { AuthService } from './auth.service';
import logger from '../config/logger';

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

export interface UserIncident {
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
  relatedFiles: {
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

export interface UserIncidentsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  severity?: string;
  event?: string;
  assigned?: string;
  sort?: string;
  order?: string;
}

export interface QuickStats {
  eventCount: number;
  incidentCount: number;
  needsResponseCount: number;
}

export interface ActivityItem {
  type: string;
  message: string;
  timestamp: string;
  eventSlug?: string;
  incidentId?: string;
}

export interface AvatarUpload {
  filename: string;
  mimetype: string;
  size: number;
  data: Buffer;
}

export class UserService {
  private unifiedRBAC: UnifiedRBACService;
  private authService: AuthService;

  constructor(private prisma: PrismaClient) {
    this.unifiedRBAC = new UnifiedRBACService(prisma);
    this.authService = new AuthService(prisma);
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
      logger().error('Error updating profile:', error);
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
        logger().error('Error comparing passwords:', err);
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
      const passwordValidation = this.authService.validatePassword(newPassword, user.email, user.name || undefined);
      if (!passwordValidation.isValid) {
        const errorMessage = passwordValidation.feedback.length > 0 
          ? passwordValidation.feedback.join('; ')
          : 'New password must meet all security requirements: at least 8 characters, uppercase letter, lowercase letter, number, and special character.';
        return {
          success: false,
          error: errorMessage
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
      logger().error('Error changing password:', error);
      return {
        success: false,
        error: 'Failed to change password.'
      };
    }
  }

  /**
   * Get user's events with roles (includes organization events for org admins)
   */
  async getUserEvents(userId: string): Promise<ServiceResult<{ events: UserEvent[]; globalRoles: string[] }>> {
    try {
      // Get all user roles using unified RBAC
      const allUserRoles = await this.unifiedRBAC.getAllUserRoles(userId);

      // Process system-level roles for globalRoles
      const globalRoles = allUserRoles.system;

      // Get events map to track roles per event
      const eventsMap = new Map();

      // Process direct event roles
      for (const eventId of Object.keys(allUserRoles.events)) {
        const eventRoles = allUserRoles.events[eventId];
        
        // Get event details
        const event = await this.prisma.event.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true
          }
        });

        if (event) {
          eventsMap.set(eventId, {
            id: event.id,
            name: event.name,
            slug: event.slug,
            description: event.description,
            roles: eventRoles
          });
        }
      }

      // Process organization events (org admins get event admin access)
      for (const orgId of Object.keys(allUserRoles.organizations)) {
        const orgRoles = allUserRoles.organizations[orgId];
        
        // Check if user is org admin
        if (orgRoles.includes('org_admin')) {
          // Get organization events
          const orgEvents = await this.prisma.event.findMany({
            where: { organizationId: orgId },
            select: {
              id: true,
              name: true,
              slug: true,
              description: true
            }
          });

          // Add org events with event_admin role
          orgEvents.forEach(event => {
            const eventId = event.id;
            if (!eventsMap.has(eventId)) {
              eventsMap.set(eventId, {
                id: event.id,
                name: event.name,
                slug: event.slug,
                description: event.description,
                roles: []
              });
            }
            
            // Org admins get event_admin role on organization events
            const eventData = eventsMap.get(eventId);
            if (eventData && !eventData.roles.includes('event_admin')) {
              eventData.roles.push('event_admin');
            }
          });
        }
      }

      const events = Array.from(eventsMap.values());

      return {
        success: true,
        data: { events, globalRoles }
      };
    } catch (error: any) {
      logger().error('Error fetching user events:', error);
      return {
        success: false,
        error: 'Failed to fetch events.'
      };
    }
  }

  /**
   * Get user's reports across all accessible events
   */
  async getUserIncidents(userId: string, query: UserIncidentsQuery): Promise<ServiceResult<{ 
    incidents: UserIncident[]; 
    total: number; 
    page: number; 
    limit: number; 
    totalPages: number;
    canViewAssignments: boolean;
  }>> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        severity,
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

      // Get user's roles using unified RBAC to determine access
      const allUserRoles = await this.unifiedRBAC.getAllUserRoles(userId);
      
      // Build event roles map for access control
      const eventRoles = new Map();
      
      // Process direct event roles
      for (const eventId of Object.keys(allUserRoles.events)) {
        const eventRoles_list = allUserRoles.events[eventId];
        
        // Get event details
        const event = await this.prisma.event.findUnique({
          where: { id: eventId },
          select: { id: true, name: true, slug: true }
        });

        if (event) {
          eventRoles.set(eventId, {
            event: event,
            roles: eventRoles_list
          });
        }
      }

      // Process organization events (org admins get access to organization events)
      for (const orgId of Object.keys(allUserRoles.organizations)) {
        const orgRoles = allUserRoles.organizations[orgId];
        
        if (orgRoles.includes('org_admin')) {
          // Get organization events
          const orgEvents = await this.prisma.event.findMany({
            where: { organizationId: orgId },
            select: { id: true, name: true, slug: true }
          });

          // Add org events with event_admin access
          orgEvents.forEach(event => {
            const eventId = event.id;
            if (!eventRoles.has(eventId)) {
              eventRoles.set(eventId, {
                event: event,
                roles: []
              });
            }
            
            // Org admins get event_admin role on organization events
            const eventData = eventRoles.get(eventId);
            if (eventData && !eventData.roles.includes('event_admin')) {
              eventData.roles.push('event_admin');
            }
          });
        }
      }

      if (eventRoles.size === 0) {
        return {
          success: true,
          data: { incidents: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0, canViewAssignments: false }
        };
      }

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
        const hasResponderOrAdmin = roles.some((r: string) => ['responder', 'event_admin', 'system_admin'].includes(r));
        
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

      if (severity) {
        filters.push({ severity });
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
            data: { incidents: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0, canViewAssignments: false }
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
      const total = await this.prisma.incident.count({ where: whereClause });

      // Get reports with pagination
      const incidents = await this.prisma.incident.findMany({
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
          relatedFiles: {
            select: { id: true, filename: true, mimetype: true, size: true }
          },
          comments: {
            select: {
              id: true,
              visibility: true
            }
          }
        },
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limitNum
      });

      // Add user's role in each event to the response and calculate visible comment count
      const reportsWithRoles = incidents.map(incident => {
        const userRoles = eventRoles.get(incident.eventId)?.roles || [];
        const isResponderOrAbove = userRoles.some((r: string) => ['responder', 'event_admin', 'system_admin'].includes(r));
        
        // Calculate comment count based on user permissions
        let visibleCommentCount = 0;
        if (incident.comments && Array.isArray(incident.comments)) {
          if (isResponderOrAbove) {
            // Responders and above can see all comments
            visibleCommentCount = incident.comments.length;
          } else {
            // Reporters can only see public comments (and internal if they're assigned to the report)
            const isAssignedToReport = incident.assignedResponderId === userId;
            visibleCommentCount = incident.comments.filter(comment => 
              comment.visibility === 'public' || (comment.visibility === 'internal' && isAssignedToReport)
            ).length;
          }
        }

        // Remove the comments array and add the count
        const { comments, ...incidentWithoutComments } = incident;
        return {
          ...incidentWithoutComments,
          _count: {
            comments: visibleCommentCount
          },
          userRoles
        };
      });

      const canViewAssignments = responderAdminEvents.length > 0;

      return {
        success: true,
        data: {
          incidents: reportsWithRoles,
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
          canViewAssignments
        }
      };
    } catch (error: any) {
      logger().error('Error fetching user reports:', error);
      return {
        success: false,
        error: 'Failed to fetch incidents.'
      };
    }
  }

  /**
   * Leave an event
   */
  async leaveEvent(userId: string, eventId: string): Promise<ServiceResult<{ message: string }>> {
    try {
      // Check if user has any roles for this event using unified RBAC
      const userEventRoles = await this.unifiedRBAC.getUserRoles(userId, 'event', eventId);

      if (userEventRoles.length === 0) {
        return {
          success: false,
          error: 'You are not a member of this event.'
        };
      }

      // Check if user is the only event admin
      const isAdmin = userEventRoles.some((ur: any) => ur.role.name === 'event_admin');
      if (isAdmin) {
        // Count how many event admins exist for this event by checking all users with event roles
        const allEventUsers = await (this.prisma as any).userRole.findMany({
          where: {
            scopeType: 'event',
            scopeId: eventId,
            role: { name: 'event_admin' }
          },
          include: { role: true }
        });
        const adminCount = allEventUsers.length;

        if (adminCount === 1) {
          return {
            success: false,
            error: 'You cannot leave this event as you are the only admin. Please assign another admin first.'
          };
        }
      }

      // Remove all user roles for this event using unified RBAC
      const roleNames = userEventRoles.map((ur: any) => ur.role.name);
      for (const roleName of roleNames) {
        await this.unifiedRBAC.revokeRole(userId, roleName, 'event', eventId);
      }

      // Get event name for response
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: { name: true }
      });
      const eventName = event?.name || 'the event';

      return {
        success: true,
        data: { message: `Successfully left ${eventName}.` }
      };
    } catch (error: any) {
      logger().error('Error leaving event:', error);
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
      // Get all user roles using unified RBAC
      const allUserRoles = await this.unifiedRBAC.getAllUserRoles(userId);
      
      // Count unique events from direct event roles and organization events
      const eventIds = new Set(Object.keys(allUserRoles.events));
      
      // Add organization events for org admins
      for (const orgId of Object.keys(allUserRoles.organizations)) {
        const orgRoles = allUserRoles.organizations[orgId];
        if (orgRoles.includes('org_admin')) {
          const orgEvents = await this.prisma.event.findMany({
            where: { organizationId: orgId },
            select: { id: true }
          });
          orgEvents.forEach(event => eventIds.add(event.id));
        }
      }
      
      const eventCount = eventIds.size;

      // Get unique report IDs to avoid double counting when user has multiple roles for same report
      const reporterIds = await this.prisma.incident.findMany({ 
        where: { reporterId: userId }, 
        select: { id: true } 
      });
      const responderIds = await this.prisma.incident.findMany({ 
        where: { assignedResponderId: userId }, 
        select: { id: true } 
      });
      
      // Count reports where user is event admin or org admin
      const adminEventIds = Array.from(eventIds);
      const adminIds = adminEventIds.length > 0 ? await this.prisma.incident.findMany({ 
        where: { eventId: { in: adminEventIds } }, 
        select: { id: true } 
      }) : [];

      // Use Set to get unique report IDs across all roles
      const uniqueReportIds = new Set([
        ...reporterIds.map(r => r.id),
        ...responderIds.map(r => r.id),
        ...adminIds.map(r => r.id)
      ]);
      const incidentCount = uniqueReportIds.size;

      // Needs response: reports assigned to user as responder and not closed/resolved
      const needsResponseCount = await this.prisma.incident.count({
        where: {
          assignedResponderId: userId,
          state: { in: ['submitted', 'acknowledged', 'investigating'] },
        },
      });

      return {
        success: true,
        data: { eventCount, incidentCount, needsResponseCount }
      };
    } catch (error: any) {
      logger().error('Error fetching quick stats:', error);
      return {
        success: false,
        error: 'Failed to fetch quick stats.'
      };
    }
  }

  /**
   * Get recent activity for the current user
   */
  async getActivity(userId: string): Promise<ServiceResult<{ activity: ActivityItem[] }>> {
    try {
      // Get user's event IDs for filtering activity
      const userEventRoles = await this.unifiedRBAC.getUserRoles(userId, 'event');
      const eventIds = userEventRoles.map((role: any) => role.scopeId);

      // Get recent reports submitted by user
      const recentReports = await this.prisma.incident.findMany({
        where: { reporterId: userId },
        include: {
          event: { select: { name: true, slug: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Get recent reports assigned to user
      const assignedReports = await this.prisma.incident.findMany({
        where: { assignedResponderId: userId },
        include: {
          event: { select: { name: true, slug: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      });

      // Get recent comments by user
      const recentComments = await this.prisma.incidentComment.findMany({
        where: { 
          authorId: userId,
          incident: {
            eventId: { in: eventIds }
          }
        },
        include: {
          incident: {
            select: { 
              title: true, 
              event: { select: { name: true, slug: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      // Get recent audit logs for user
      const recentAuditLogs = await this.prisma.auditLog.findMany({
        where: {
          userId: userId,
          eventId: { in: eventIds }
        },
        include: {
          event: { select: { name: true, slug: true } }
        },
        orderBy: { timestamp: 'desc' },
        take: 10
      });

      // Convert to activity items
      const activities: ActivityItem[] = [];

      // Add report submissions
      recentReports.forEach(incident => {
        activities.push({
          type: 'incident_submitted',
          message: `You submitted a new report in ${incident.event.name}`,
          timestamp: incident.createdAt.toISOString(),
          eventSlug: incident.event.slug,
          incidentId: incident.id
        });
      });

      // Add report assignments
      assignedReports.forEach(incident => {
        activities.push({
          type: 'incident_assigned',
          message: `A report was assigned to you in ${incident.event.name}`,
          timestamp: incident.updatedAt.toISOString(),
          eventSlug: incident.event.slug,
          incidentId: incident.id
        });
      });

      // Add comments
      recentComments.forEach(comment => {
        activities.push({
          type: 'comment_posted',
          message: `You commented on "${comment.incident.title}" in ${comment.incident.event.name}`,
          timestamp: comment.createdAt.toISOString(),
          eventSlug: comment.incident.event.slug,
          incidentId: comment.incidentId
        });
      });

      // Add audit log activities
      recentAuditLogs.forEach(log => {
        let message = '';
        switch (log.action) {
          case 'incident_state_changed':
          case 'report_state_changed':
            message = `Incident status was updated in ${log.event?.name || 'an event'}`;
            break;
          case 'user_invited':
            message = `You were invited to ${log.event?.name || 'an event'}`;
            break;
          case 'role_assigned':
            message = `Your role was updated in ${log.event?.name || 'an event'}`;
            break;
          case 'incident_created':
          case 'report_created':
            message = `A new incident was created in ${log.event?.name || 'an event'}`;
            break;
          default:
            message = `${log.action.replace('_', ' ')} in ${log.event?.name || 'an event'}`;
        }

        activities.push({
          type: log.action,
          message: message,
          timestamp: log.timestamp.toISOString(),
          eventSlug: log.event?.slug,
          incidentId: (log.targetType === 'Incident' || log.targetType === 'Report') ? log.targetId : undefined
        });
      });

      // Sort all activities by timestamp (most recent first) and take top 20
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20);

      return {
        success: true,
        data: { activity: sortedActivities }
      };
    } catch (error: any) {
      logger().error('Error fetching activity:', error);
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
      logger().error('Failed to upload avatar:', error);
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
      logger().error('Failed to delete avatar:', error);
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
      logger().error('Failed to fetch avatar:', error);
      return {
        success: false,
        error: 'Failed to fetch avatar.'
      };
    }
  }
} 