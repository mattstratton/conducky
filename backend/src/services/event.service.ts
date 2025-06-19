import { PrismaClient } from '@prisma/client';
import { ServiceResult } from '../types';

export interface EventCreateData {
  name: string;
  slug: string;
}

export interface EventUpdateData {
  name?: string;
  description?: string | null;
  contactEmail?: string | null;
  newSlug?: string;
  logo?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  website?: string | null;
  codeOfConduct?: string | null;
}

export interface EventUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  avatarUrl: string | null;
  joinDate: Date;
  lastActivity: Date;
}

export interface EventUsersQuery {
  search?: string;
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
  role?: string;
}

export interface RoleAssignment {
  userId: string;
  roleName: string;
}

export interface EventLogo {
  filename: string;
  mimetype: string;
  size: number;
  data: Buffer;
}

export class EventService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get event ID by slug
   */
  async getEventIdBySlug(slug: string): Promise<string | null> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { slug },
        select: { id: true }
      });
      return event?.id || null;
    } catch (error) {
      console.error('Error getting event ID by slug:', error);
      return null;
    }
  }

  /**
   * Get user's role for a specific event
   */
  async getUserRoleForEvent(userId: string, eventId: string): Promise<string | null> {
    try {
      const userEventRoles = await this.prisma.userEventRole.findMany({
        where: { userId, eventId },
        include: { role: true }
      });

      // Check for SuperAdmin role globally first
      const allUserRoles = await this.prisma.userEventRole.findMany({
        where: { userId },
        include: { role: true }
      });

      const isSuperAdmin = allUserRoles.some(uer => uer.role.name === 'SuperAdmin');
      if (isSuperAdmin) {
        return 'SuperAdmin';
      }

      // Return the highest role for this event
      const roleHierarchy = ['SuperAdmin', 'Admin', 'Responder', 'Reporter'];
      for (const role of roleHierarchy) {
        if (userEventRoles.some(uer => uer.role.name === role)) {
          return role;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting user role for event:', error);
      return null;
    }
  }

  /**
   * Create a new event (SuperAdmin only)
   */
  async createEvent(data: EventCreateData): Promise<ServiceResult<{ event: any }>> {
    try {
      const { name, slug } = data;

      if (!name || !slug) {
        return {
          success: false,
          error: 'Name and slug are required.'
        };
      }

      // Slug validation: lowercase, url-safe (letters, numbers, hyphens), no spaces
      const slugPattern = /^[a-z0-9-]+$/;
      if (!slugPattern.test(slug)) {
        return {
          success: false,
          error: 'Slug must be all lowercase, URL-safe (letters, numbers, hyphens only, no spaces).'
        };
      }

      const existing = await this.prisma.event.findUnique({ where: { slug } });
      if (existing) {
        return {
          success: false,
          error: 'Slug already exists.'
        };
      }

      const event = await this.prisma.event.create({ data: { name, slug } });
      
      return {
        success: true,
        data: { event }
      };
    } catch (error: any) {
      console.error('Error creating event:', error);
      return {
        success: false,
        error: 'Event creation failed.'
      };
    }
  }

  /**
   * List all events (SuperAdmin only)
   */
  async listAllEvents(): Promise<ServiceResult<{ events: any[] }>> {
    try {
      const events = await this.prisma.event.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: { events }
      };
    } catch (error: any) {
      console.error('Error listing events:', error);
      return {
        success: false,
        error: 'Failed to list events.'
      };
    }
  }

  /**
   * Get event details by ID
   */
  async getEventById(eventId: string): Promise<ServiceResult<{ event: any }>> {
    try {
      const event = await this.prisma.event.findUnique({ where: { id: eventId } });
      
      if (!event) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      return {
        success: true,
        data: { event }
      };
    } catch (error: any) {
      console.error('Error getting event details:', error);
      return {
        success: false,
        error: 'Failed to get event details.'
      };
    }
  }

  /**
   * Assign a role to a user for an event
   */
  async assignUserRole(eventId: string, assignment: RoleAssignment): Promise<ServiceResult<{ userEventRole: any; message: string }>> {
    try {
      const { userId, roleName } = assignment;

      if (!userId || !roleName) {
        return {
          success: false,
          error: 'userId and roleName are required.'
        };
      }

      const role = await this.prisma.role.findUnique({ where: { name: roleName } });
      if (!role) {
        return {
          success: false,
          error: 'Role does not exist.'
        };
      }

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return {
          success: false,
          error: 'User does not exist.'
        };
      }

      // Upsert the user-event-role
      const userEventRole = await this.prisma.userEventRole.upsert({
        where: {
          userId_eventId_roleId: {
            userId,
            eventId,
            roleId: role.id,
          },
        },
        update: {},
        create: { userId, eventId, roleId: role.id },
      });

      return {
        success: true,
        data: { message: 'Role assigned.', userEventRole }
      };
    } catch (error: any) {
      console.error('Error assigning role:', error);
      return {
        success: false,
        error: 'Failed to assign role.'
      };
    }
  }

  /**
   * Remove a role from a user for an event
   */
  async removeUserRole(eventId: string, assignment: RoleAssignment): Promise<ServiceResult<{ message: string }>> {
    try {
      const { userId, roleName } = assignment;

      if (!userId || !roleName) {
        return {
          success: false,
          error: 'userId and roleName are required.'
        };
      }

      const role = await this.prisma.role.findUnique({ where: { name: roleName } });
      if (!role) {
        return {
          success: false,
          error: 'Role does not exist.'
        };
      }

      await this.prisma.userEventRole.delete({
        where: {
          userId_eventId_roleId: {
            userId,
            eventId,
            roleId: role.id,
          },
        },
      });

      return {
        success: true,
        data: { message: 'Role removed.' }
      };
    } catch (error: any) {
      console.error('Error removing role:', error);
      return {
        success: false,
        error: 'Failed to remove role.'
      };
    }
  }

  /**
   * List all users and their roles for an event
   */
  async getEventUsers(eventId: string): Promise<ServiceResult<{ users: EventUser[] }>> {
    try {
      const userEventRoles = await this.prisma.userEventRole.findMany({
        where: { eventId },
        include: {
          user: true,
          role: true,
        },
      });

      // Group roles by user
      const users: any = {};
      for (const uer of userEventRoles) {
        if (!users[uer.userId]) {
          // Fetch avatar for each user
          const avatar = await this.prisma.userAvatar.findUnique({
            where: { userId: uer.user.id },
          });
          users[uer.userId] = {
            id: uer.user.id,
            email: uer.user.email,
            name: uer.user.name,
            roles: [],
            avatarUrl: avatar ? `/users/${uer.user.id}/avatar` : null,
          };
        }
        users[uer.userId].roles.push(uer.role.name);
      }

      return {
        success: true,
        data: { users: Object.values(users) }
      };
    } catch (error: any) {
      console.error('Error listing users for event:', error);
      return {
        success: false,
        error: 'Failed to list users for event.'
      };
    }
  }

  /**
   * Get current user's roles for an event by slug
   */
  async getUserRolesBySlug(userId: string, slug: string): Promise<ServiceResult<{ roles: string[] }>> {
    try {
      const eventId = await this.getEventIdBySlug(slug);
      if (!eventId) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      const userEventRoles = await this.prisma.userEventRole.findMany({
        where: { userId, eventId },
        include: { role: true },
      });

      const roles = userEventRoles.map(uer => uer.role.name);

      return {
        success: true,
        data: { roles }
      };
    } catch (error: any) {
      console.error('Error fetching user roles for event:', error);
      return {
        success: false,
        error: 'Failed to fetch user roles for event.'
      };
    }
  }

  /**
   * List users and their roles for an event by slug with pagination and filtering
   */
  async getEventUsersBySlug(slug: string, query: EventUsersQuery): Promise<ServiceResult<{ users: EventUser[]; total: number }>> {
    try {
      const {
        search,
        sort = 'name',
        order = 'asc',
        page = 1,
        limit = 10,
        role,
      } = query;

      const pageNum = Math.max(1, parseInt(page.toString(), 10) || 1);
      const limitNum = Math.max(1, parseInt(limit.toString(), 10) || 10);

      const eventId = await this.getEventIdBySlug(slug);
      
      if (!eventId) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      // Build where clause
      const userEventRoleWhere: any = { eventId };
      if (role) {
        userEventRoleWhere.role = { name: role };
      }
      if (search) {
        userEventRoleWhere.user = {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        };
      }

      const userEventRoles = await this.prisma.userEventRole.findMany({
        where: userEventRoleWhere,
        include: { user: true, role: true },
        orderBy: [{ user: { [sort as string]: order } }],
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      });

      // Group roles by user
      const users: any = {};
      for (const uer of userEventRoles) {
        if (!users[uer.userId]) {
          // Fetch avatar for each user
          const avatar = await this.prisma.userAvatar.findUnique({
            where: { userId: uer.user.id },
          });
          users[uer.userId] = {
            id: uer.user.id,
            email: uer.user.email,
            name: uer.user.name,
            roles: [],
            avatarUrl: avatar ? `/users/${uer.user.id}/avatar` : null,
            joinDate: uer.user.createdAt,
            lastActivity: uer.user.updatedAt,
          };
        }
        users[uer.userId].roles.push(uer.role.name);
      }

      // For pagination: count total matching users
      const total = await this.prisma.userEventRole.count({
        where: userEventRoleWhere,
      });

      return {
        success: true,
        data: { users: Object.values(users), total }
      };
    } catch (error: any) {
      console.error('Error listing users for event:', error);
      return {
        success: false,
        error: 'Failed to list users for event.'
      };
    }
  }

  /**
   * Update a user's name, email, and role for a specific event
   */
  async updateEventUser(slug: string, userId: string, updateData: { name?: string; email?: string; role: string }): Promise<ServiceResult<{ message: string }>> {
    try {
      const { name, email, role } = updateData;

      if (!role) {
        return {
          success: false,
          error: 'Role is required.'
        };
      }

      const eventId = await this.getEventIdBySlug(slug);
      if (!eventId) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      // Update user name/email if provided
      if (name !== undefined || email !== undefined) {
        const userData: any = {};
        if (name !== undefined) userData.name = name;
        if (email !== undefined) userData.email = email;

        await this.prisma.user.update({
          where: { id: userId },
          data: userData,
        });
      }

      // Update role for this event: remove old roles, add new one
      const eventRoles = await this.prisma.userEventRole.findMany({
        where: { userId, eventId },
      });

      for (const er of eventRoles) {
        await this.prisma.userEventRole.delete({ where: { id: er.id } });
      }

      const roleRecord = await this.prisma.role.findUnique({ where: { name: role } });
      if (!roleRecord) {
        return {
          success: false,
          error: 'Invalid role.'
        };
      }

      await this.prisma.userEventRole.create({
        data: {
          userId,
          eventId,
          roleId: roleRecord.id,
        },
      });

      return {
        success: true,
        data: { message: 'User updated.' }
      };
    } catch (error: any) {
      console.error('Error updating user for event:', error);
      return {
        success: false,
        error: 'Failed to update user for event.'
      };
    }
  }

  /**
   * Remove all roles for a user for a specific event
   */
  async removeEventUser(slug: string, userId: string): Promise<ServiceResult<{ message: string }>> {
    try {
      const eventId = await this.getEventIdBySlug(slug);
      if (!eventId) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      // Check if user is the only admin
      const userRoles = await this.prisma.userEventRole.findMany({
        where: { userId, eventId },
        include: { role: true }
      });

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
            error: 'Cannot remove the only admin from this event.'
          };
        }
      }

      // Remove all roles for this user in this event
      await this.prisma.userEventRole.deleteMany({
        where: { userId, eventId },
      });

      return {
        success: true,
        data: { message: 'User removed from event.' }
      };
    } catch (error: any) {
      console.error('Error removing user from event:', error);
      return {
        success: false,
        error: 'Failed to remove user from event.'
      };
    }
  }

  /**
   * Update event metadata
   */
  async updateEvent(slug: string, updateData: EventUpdateData): Promise<ServiceResult<{ event: any }>> {
    try {
      const { 
        name, 
        description, 
        contactEmail, 
        newSlug, 
        logo, 
        startDate, 
        endDate, 
        website, 
        codeOfConduct 
      } = updateData;
      
      // Check if there's anything to update
      if (!name && !description && !contactEmail && !newSlug && !logo && !startDate && !endDate && !website && !codeOfConduct) {
        return {
          success: false,
          error: 'Nothing to update.'
        };
      }
      
      const eventId = await this.getEventIdBySlug(slug);
      if (!eventId) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }
      
      // Check if newSlug already exists (if provided)
      if (newSlug && newSlug !== slug) {
        const existingEvent = await this.prisma.event.findUnique({ where: { slug: newSlug } });
        if (existingEvent) {
          return {
            success: false,
            error: 'Slug already exists.'
          };
        }
      }
      
      const updateEventData: any = {};
      if (name) updateEventData.name = name;
      if (newSlug) updateEventData.slug = newSlug;
      if (description !== undefined) updateEventData.description = description;
      if (logo !== undefined) updateEventData.logo = logo;
      if (startDate !== undefined) updateEventData.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) updateEventData.endDate = endDate ? new Date(endDate) : null;
      if (website !== undefined) updateEventData.website = website;
      if (codeOfConduct !== undefined) updateEventData.codeOfConduct = codeOfConduct;
      if (contactEmail !== undefined) updateEventData.contactEmail = contactEmail;
      
      const event = await this.prisma.event.update({
        where: { id: eventId },
        data: updateEventData,
      });
      
      return {
        success: true,
        data: { event }
      };
    } catch (error: any) {
      console.error('Error updating event:', error);
      return {
        success: false,
        error: 'Failed to update event.'
      };
    }
  }

  /**
   * Upload event logo
   */
  async uploadEventLogo(slug: string, logoData: EventLogo): Promise<ServiceResult<{ event: any }>> {
    try {
      const event = await this.prisma.event.findUnique({ where: { slug } });
      if (!event) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      const { filename, mimetype, size, data } = logoData;

      // Remove any existing logo for this event
      await this.prisma.eventLogo.deleteMany({ where: { eventId: event.id } });

      // Store new logo in DB
      await this.prisma.eventLogo.create({
        data: {
          eventId: event.id,
          filename,
          mimetype,
          size,
          data,
        },
      });

      return {
        success: true,
        data: { event }
      };
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      return {
        success: false,
        error: 'Failed to upload logo.'
      };
    }
  }

  /**
   * Get event logo
   */
  async getEventLogo(slug: string): Promise<ServiceResult<{ filename: string; mimetype: string; data: Buffer }>> {
    try {
      const event = await this.prisma.event.findUnique({ where: { slug } });
      if (!event) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      const logo = await this.prisma.eventLogo.findUnique({
        where: { eventId: event.id },
      });

      if (!logo) {
        return {
          success: false,
          error: 'Logo not found.'
        };
      }

      return {
        success: true,
        data: {
          filename: logo.filename,
          mimetype: logo.mimetype,
          data: Buffer.from(logo.data)
        }
      };
    } catch (error: any) {
      console.error('Error fetching logo:', error);
      return {
        success: false,
        error: 'Failed to fetch logo.'
      };
    }
  }

  /**
   * Get individual user profile for an event
   */
  async getEventUserProfile(slug: string, userId: string): Promise<ServiceResult<{ user: any; roles: string[]; joinDate: Date; lastActivity: Date | null }>> {
    try {
      const eventId = await this.getEventIdBySlug(slug);
      if (!eventId) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      // Get user details with their roles in this event
      const userEventRoles = await this.prisma.userEventRole.findMany({
        where: { userId, eventId },
        select: {
          id: true,
          role: {
            select: {
              id: true,
              name: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
              avatar: true
            }
          }
        }
      });

      if (userEventRoles.length === 0) {
        return {
          success: false,
          error: 'User not found in this event.'
        };
      }

      const user = userEventRoles[0].user;
      const roles = userEventRoles.map(uer => uer.role.name);
      // Use user's createdAt as join date since UserEventRole doesn't have createdAt
      const joinDate = user.createdAt;

      // Get last activity (most recent report, comment, or audit log)
      const [lastReport, lastComment, lastAuditLog] = await Promise.all([
        this.prisma.report.findFirst({
          where: { reporterId: userId, eventId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        }),
        this.prisma.reportComment.findFirst({
          where: { 
            authorId: userId,
            report: { eventId }
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        }),
        this.prisma.auditLog.findFirst({
          where: { userId, eventId },
          orderBy: { timestamp: 'desc' },
          select: { timestamp: true }
        })
      ]);

      const activities = [
        lastReport?.createdAt,
        lastComment?.createdAt,
        lastAuditLog?.timestamp
      ].filter((date): date is Date => date !== null && date !== undefined);

      const lastActivity = activities.length > 0 ? new Date(Math.max(...activities.map(d => d.getTime()))) : null;

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar
          },
          roles,
          joinDate,
          lastActivity
        }
      };
    } catch (error: any) {
      console.error('Error getting user profile:', error);
      return {
        success: false,
        error: 'Failed to get user profile.'
      };
    }
  }

  /**
   * Get user activity timeline for an event
   */
  async getUserActivity(slug: string, userId: string, options: { page: number; limit: number }): Promise<ServiceResult<{ activities: any[]; total: number }>> {
    try {
      const eventId = await this.getEventIdBySlug(slug);
      if (!eventId) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      const { page, limit } = options;
      const offset = (page - 1) * limit;

      // Get various activity types
      const [reports, comments, auditLogs] = await Promise.all([
        this.prisma.report.findMany({
          where: { reporterId: userId, eventId },
          select: {
            id: true,
            title: true,
            type: true,
            state: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.reportComment.findMany({
          where: { 
            authorId: userId,
            report: { eventId }
          },
          select: {
            id: true,
            body: true,
            createdAt: true,
            report: {
              select: {
                id: true,
                title: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.auditLog.findMany({
          where: { userId, eventId },
          select: {
            id: true,
            action: true,
            targetType: true,
            targetId: true,
            timestamp: true
          },
          orderBy: { timestamp: 'desc' }
        })
      ]);

      // Combine and sort all activities
      const activities = [
        ...reports.map(r => ({
          id: r.id,
          type: 'report',
          action: 'submitted',
          title: r.title,
          details: { type: r.type, state: r.state },
          timestamp: r.createdAt
        })),
        ...comments.map(c => ({
          id: c.id,
          type: 'comment',
          action: 'commented',
          title: `Comment on "${c.report.title}"`,
          details: { body: c.body.substring(0, 100) + (c.body.length > 100 ? '...' : '') },
          timestamp: c.createdAt
        })),
        ...auditLogs.map(a => ({
          id: a.id,
          type: 'audit',
          action: a.action,
          title: `${a.action} ${a.targetType}`,
          details: { targetType: a.targetType, targetId: a.targetId },
          timestamp: a.timestamp
        }))
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      const total = activities.length;
      const paginatedActivities = activities.slice(offset, offset + limit);

      return {
        success: true,
        data: {
          activities: paginatedActivities,
          total
        }
      };
    } catch (error: any) {
      console.error('Error getting user activity:', error);
      return {
        success: false,
        error: 'Failed to get user activity.'
      };
    }
  }

  /**
   * Get user's reports for an event
   */
  async getUserReports(slug: string, userId: string, options: { page: number; limit: number; type?: string }): Promise<ServiceResult<{ reports: any[]; total: number }>> {
    try {
      const eventId = await this.getEventIdBySlug(slug);
      if (!eventId) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      const { page, limit, type } = options;
      const offset = (page - 1) * limit;

      let whereClause: any = { eventId };

      if (type === 'submitted') {
        whereClause.reporterId = userId;
      } else if (type === 'assigned') {
        whereClause.assignedResponderId = userId;
      } else {
        // Default: both submitted and assigned
        whereClause.OR = [
          { reporterId: userId },
          { assignedResponderId: userId }
        ];
      }

      const [reports, total] = await Promise.all([
        this.prisma.report.findMany({
          where: whereClause,
          select: {
            id: true,
            title: true,
            type: true,
            state: true,
            severity: true,
            createdAt: true,
            updatedAt: true,
            reporter: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            assignedResponder: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        this.prisma.report.count({
          where: whereClause
        })
      ]);

      return {
        success: true,
        data: {
          reports,
          total
        }
      };
    } catch (error: any) {
      console.error('Error getting user reports:', error);
      return {
        success: false,
        error: 'Failed to get user reports.'
      };
    }
  }

  /**
   * Get enhanced event card statistics by slug - optimized for dashboard cards
   */
  async getEventCardStats(slug: string, userId: string): Promise<ServiceResult<{
    totalReports: number;
    urgentReports: number;
    assignedToMe: number;
    needsResponse: number;
    recentActivity: number;
    recentReports: Array<{
      id: string;
      title: string;
      state: string;
      severity: string | null;
      createdAt: string;
    }>;
  }>> {
    try {
      // Get event ID by slug
      const event = await this.prisma.event.findUnique({
        where: { slug },
        select: { id: true }
      });

      if (!event) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      const eventId = event.id;

      // Optimize queries by combining multiple counts into aggregation queries
      const [
        allReports,
        recentReports
      ] = await Promise.all([
        // Get all reports with necessary fields for aggregation
        this.prisma.report.findMany({
          where: { eventId },
          select: {
            id: true,
            severity: true,
            state: true,
            assignedResponderId: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        
        // Recent reports for preview (last 3)
        this.prisma.report.findMany({
          where: { eventId },
          select: {
            id: true,
            title: true,
            state: true,
            severity: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 3
        })
      ]);

      // Calculate stats from the single query result
      const now = Date.now();
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      
      const totalReports = allReports.length;
      
      const urgentReports = allReports.filter(report => 
        report.severity === 'high' || 
        (report.createdAt >= oneDayAgo && report.state === 'submitted')
      ).length;
      
      const assignedToMe = allReports.filter(report => 
        report.assignedResponderId === userId
      ).length;
      
      const needsResponse = allReports.filter(report => 
        ['submitted', 'acknowledged', 'investigating'].includes(report.state)
      ).length;
      
      const recentActivity = allReports.filter(report => 
        report.updatedAt >= sevenDaysAgo
      ).length;

      return {
        success: true,
        data: {
          totalReports,
          urgentReports,
          assignedToMe,
          needsResponse,
          recentActivity,
          recentReports: recentReports.map(report => ({
            id: report.id,
            title: report.title,
            state: report.state,
            severity: report.severity,
            createdAt: report.createdAt.toISOString()
          }))
        }
      };
    } catch (error: any) {
      console.error('Error getting event card stats:', error);
      return {
        success: false,
        error: 'Failed to get event card statistics.'
      };
    }
  }

  /**
   * Get event statistics by slug
   */
  async getEventStats(slug: string, userId?: string): Promise<ServiceResult<{
    totalReports: number;
    totalUsers: number;
    needsResponseCount: number;
    pendingInvites: number;
    assignedReports: number;
    resolvedReports: number;
  }>> {
    try {
      // Get event ID by slug
      const event = await this.prisma.event.findUnique({
        where: { slug },
        select: { id: true }
      });

      if (!event) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      const eventId = event.id;

      // Get total reports for this event
      const totalReports = await this.prisma.report.count({
        where: { eventId }
      });

      // Get total users for this event
      const totalUsers = await this.prisma.userEventRole.count({
        where: { eventId }
      });

      // Get reports that need response (submitted, acknowledged, investigating)
      const needsResponseCount = await this.prisma.report.count({
        where: {
          eventId,
          state: {
            in: ['submitted', 'acknowledged', 'investigating']
          }
        }
      });

      // Get reports assigned to the specific user (if userId provided) or all assigned reports
      const assignedReports = await this.prisma.report.count({
        where: {
          eventId,
          assignedResponderId: userId ? userId : { not: null }
        }
      });

      // Get resolved reports (resolved or closed state)
      const resolvedReports = await this.prisma.report.count({
        where: {
          eventId,
          state: {
            in: ['resolved', 'closed']
          }
        }
      });

      // Get pending invites for this event
      const pendingInvites = await this.prisma.eventInviteLink.count({
        where: {
          eventId,
          disabled: false
        }
      });

      return {
        success: true,
        data: {
          totalReports,
          totalUsers,
          needsResponseCount,
          pendingInvites,
          assignedReports,
          resolvedReports
        }
      };
    } catch (error: any) {
      console.error('Error getting event stats:', error);
      return {
        success: false,
        error: 'Failed to get event statistics.'
      };
    }
  }
} 