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
          data: logo.data
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
} 