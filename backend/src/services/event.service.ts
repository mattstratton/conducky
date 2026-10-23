import { PrismaClient, Organization, OrganizationRole, OrganizationLogo, OrganizationInviteLink } from '../generated/prisma/client';
import { ServiceResult } from '../types';
import { UnifiedRBACService } from './unified-rbac.service';
import { randomUUID } from 'crypto';
import { logAudit } from '../utils/audit';
import logger from '../config/logger';
import { encryptField, decryptField, isEncrypted } from '../utils/encryption';

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
  private unifiedRBAC: UnifiedRBACService;

  constructor(private prisma: PrismaClient) {
    this.unifiedRBAC = new UnifiedRBACService(prisma);
  }

  /**
   * Encrypt event data fields that contain sensitive information
   */
  private encryptEventData(eventData: any): any {
    const encrypted = { ...eventData };
    
    if (encrypted.contactEmail && typeof encrypted.contactEmail === 'string') {
      encrypted.contactEmail = encryptField(encrypted.contactEmail);
    }
    
    return encrypted;
  }

  /**
   * Decrypt event data fields that contain sensitive information
   */
  private decryptEventData(eventData: any): any {
    if (!eventData) return eventData;
    
    const decrypted = { ...eventData };
    
    if (decrypted.contactEmail && typeof decrypted.contactEmail === 'string' && isEncrypted(decrypted.contactEmail)) {
      try {
        decrypted.contactEmail = decryptField(decrypted.contactEmail);
      } catch (error) {
        logger().error('Error decrypting event contactEmail:', error);
        // Keep encrypted value if decryption fails
      }
    }
    
    return decrypted;
  }

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
      logger().error('Error getting event ID by slug:', error);
      return null;
    }
  }

  /**
   * Get user's role for a specific event
   */
  async getUserRoleForEvent(userId: string, eventId: string): Promise<string | null> {
    try {
      // Use unified RBAC service to check roles
      const roles = await this.unifiedRBAC.getUserRoles(userId, 'event', eventId);
      
      if (roles.length === 0) {
        return null;
      }

      // Return the highest role for this event
      const roleHierarchy = ['System Admin', 'Event Admin', 'Responder', 'Reporter'];
      for (const role of roleHierarchy) {
        if (roles.includes(role)) {
          return role;
        }
      }

      return roles[0]; // Return first role if no hierarchy match
    } catch (error) {
      logger().error('Error getting user role for event:', error);
      return null;
    }
  }

  /**
   * Create a new event (System Admin only)
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
      
      // Log event creation
      await logAudit({
        action: 'event_created',
        targetType: 'Event',
        targetId: event.id,
        eventId: event.id
      });
      
      // Decrypt event data before returning (though new events shouldn't have encrypted fields yet)
      const decryptedEvent = this.decryptEventData(event);
      
      return {
        success: true,
        data: { event: decryptedEvent }
      };
    } catch (error: any) {
      logger().error('Error creating event:', error);
      return {
        success: false,
        error: 'Event creation failed.'
      };
    }
  }

  /**
   * List all events (System Admin only)
   */
  async listAllEvents(): Promise<ServiceResult<{ events: any[] }>> {
    try {
      const events = await this.prisma.event.findMany({
        orderBy: { createdAt: 'desc' },
      });

      // Decrypt sensitive fields for all events
      const decryptedEvents = events.map(event => this.decryptEventData(event));

      return {
        success: true,
        data: { events: decryptedEvents }
      };
    } catch (error: any) {
      logger().error('Error listing events:', error);
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

      // Decrypt sensitive fields before returning
      const decryptedEvent = this.decryptEventData(event);

      return {
        success: true,
        data: { event: decryptedEvent }
      };
    } catch (error: any) {
      logger().error('Error getting event details:', error);
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

      // Check if user exists
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return {
          success: false,
          error: 'User or role not found'
        };
      }

      // Check if role exists in old system (with mapping)
      let roleToCheck = roleName;
      if (roleName === 'Admin') {
        roleToCheck = 'Event Admin'; // Map Admin to Event Admin for old system compatibility
      }
      
      // Map role names to unified format
      const unifiedRoleName = this.mapToUnifiedRoleName(roleName);
      
      // Use unified RBAC service to grant the role
      const success = await this.unifiedRBAC.grantRole(userId, unifiedRoleName, 'event', eventId);
      
      if (!success) {
        return {
          success: false,
          error: 'User or role not found'
        };
      }

      // Log role assignment
      await logAudit({
        action: 'user_role_assigned',
        targetType: 'UserRole',
        targetId: userId,
        userId: userId,
        eventId: eventId
      });

      // Create synthetic userEventRole for backward compatibility
      const userEventRole = {
        userId,
        eventId,
        roleId: randomUUID(),
        role: { name: unifiedRoleName },
        user: { id: userId }
      };

      return {
        success: true,
        data: { userEventRole, message: 'Role assigned.' }
      };
    } catch (error: any) {
      logger().error('Error assigning user role:', error);
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

      // Map role names to unified format
      const unifiedRoleName = this.mapToUnifiedRoleName(roleName);
      
      // Use unified RBAC service to revoke the role
      const success = await this.unifiedRBAC.revokeRole(userId, unifiedRoleName, 'event', eventId);
      
      if (!success) {
        return {
          success: false,
          error: 'Failed to remove role.'
        };
      }

      // Log role removal
      await logAudit({
        action: 'user_role_removed',
        targetType: 'UserRole',
        targetId: userId,
        userId: userId,
        eventId: eventId
      });

      // Note: Legacy system cleanup no longer needed as we're using unified RBAC

      return {
        success: true,
        data: { message: 'Role removed.' }
      };
    } catch (error: any) {
      logger().error('Error removing role:', error);
      return {
        success: false,
        error: 'Failed to remove role.'
      };
    }
  }

  /**
   * Helper method to map old role names to unified role names
   */
  private mapToUnifiedRoleName(roleName: string): string {
    switch (roleName) {
      case 'System Admin': return 'system_admin';
      case 'Event Admin': return 'event_admin';
      case 'Admin': return 'event_admin'; // Map "Admin" to "event_admin" for backward compatibility
      case 'Responder': return 'responder';
      case 'Reporter': return 'reporter';
      case 'Organization Admin': return 'org_admin';
      case 'Organization Viewer': return 'org_viewer';
      default: return roleName.toLowerCase().replace(' ', '_');
    }
  }

  /**
   * List all users and their roles for an event
   */
  async getEventUsers(eventId: string): Promise<ServiceResult<{ users: EventUser[] }>> {
    try {
      // Get all user roles for this event using unified RBAC
      // We need to query the database directly to get all users for an event
      const userRoles = await this.prisma.userRole.findMany({
        where: { 
          scopeType: 'event',
          scopeId: eventId 
        },
        include: {
          user: true,
          role: true
        }
      });
      
      // Also get organization admin roles that inherit event access
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: { organizationId: true }
      });
      
      let orgAdminRoles: any[] = [];
      if (event?.organizationId) {
        orgAdminRoles = await this.prisma.userRole.findMany({
          where: {
            scopeType: 'organization',
            scopeId: event.organizationId,
            role: { name: 'org_admin' }
          },
          include: {
            user: true,
            role: true
          }
        });
      }

      // Combine direct event roles and inherited org admin roles
      const allRoles = [...userRoles, ...orgAdminRoles];

      // Group roles by user
      const users: any = {};
      for (const userRole of allRoles) {
        const userId = userRole.userId;
        if (!userRole.user) {
          logger().warn(`User data missing for userRole:`, userRole);
          continue;
        }
        
        if (!users[userId]) {
          // Fetch avatar for each user
          const avatar = await this.prisma.userAvatar.findUnique({
            where: { userId },
          });
          users[userId] = {
            id: userRole.user.id,
            email: userRole.user.email,
            name: userRole.user.name,
            roles: [],
            avatarUrl: avatar ? `/users/${userRole.user.id}/avatar` : null,
          };
        }
        
        // Use unified role names directly (no more mapping to display names)
        const roleName = userRole.role.name;
        if (!users[userId].roles.includes(roleName)) {
          users[userId].roles.push(roleName);
        }
      }

      return {
        success: true,
        data: { users: Object.values(users) }
      };
    } catch (error: any) {
      logger().error('Error listing users for event:', error);
      return {
        success: false,
        error: 'Failed to list users for event.'
      };
    }
  }

  /**
   * Helper method to map unified role names back to display names
   */
  private mapFromUnifiedRoleName(roleName: string): string {
    switch (roleName) {
      case 'system_admin': return 'System Admin';
      case 'event_admin': return 'Event Admin';
      case 'responder': return 'Responder';
      case 'reporter': return 'Reporter';
      case 'org_admin': return 'Organization Admin';
      case 'org_viewer': return 'Organization Viewer';
      default: return roleName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
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

      // Use unified RBAC service to get user roles
      const userRoles = await this.unifiedRBAC.getUserRoles(userId, 'event', eventId);
      
      // Return unified role names directly (no more mapping to display names)
      const roles = userRoles.map((userRole: { role: { name: string } }) => userRole.role.name);

      return {
        success: true,
        data: { roles }
      };
    } catch (error: any) {
      logger().error('Error fetching user roles for event:', error);
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

      // Get all users with roles for this event using unified RBAC
      const allUserRoles = await this.prisma.userRole.findMany({
        where: {
          scopeType: 'event',
          scopeId: eventId
        },
        include: {
          user: true,
          role: true
        }
      });
      
      // Build user data with role filtering if specified
      const usersMap: any = {};
      for (const roleData of allUserRoles) {
        const userId = roleData.userId;
        const roleName = roleData.role.name;
        
        // Apply role filter if specified
        if (role && roleName !== role) {
          continue;
        }
        
        if (!usersMap[userId]) {
          // Get user details
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              email: true,
              name: true,
              createdAt: true,
              updatedAt: true
            }
          });
          
          if (!user) continue;
          
          // Apply search filter if specified
          if (search) {
            const searchLower = search.toLowerCase();
            if (!user.name?.toLowerCase().includes(searchLower) && 
                !user.email.toLowerCase().includes(searchLower)) {
              continue;
            }
          }
          
          // Fetch avatar for each user
          const avatar = await this.prisma.userAvatar.findUnique({
            where: { userId: user.id },
          });
          
          usersMap[userId] = {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: [],
            avatarUrl: avatar ? `/users/${user.id}/avatar` : null,
            joinDate: user.createdAt,
            lastActivity: user.updatedAt,
          };
        }
        
        usersMap[userId].roles.push(roleName);
      }
      
      // Convert to array and apply sorting
      const allUsers: EventUser[] = Object.values(usersMap);
      const sortField = sort as keyof EventUser || 'name';
      allUsers.sort((a: EventUser, b: EventUser) => {
        const aVal = a[sortField] || '';
        const bVal = b[sortField] || '';
        if (order === 'desc') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });
      
      // Apply pagination
      const total = allUsers.length;
      const paginatedUsers = allUsers.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      return {
        success: true,
        data: { users: paginatedUsers, total }
      };
    } catch (error: any) {
      logger().error('Error listing users for event:', error);
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

      // Update role for this event using unified RBAC: remove old roles, add new one
      const currentRoles = await this.unifiedRBAC.getUserRoles(userId, 'event', eventId);
      
      // Remove all current event roles for this user
      for (const currentRole of currentRoles) {
        await this.unifiedRBAC.revokeRole(userId, currentRole.role.name, 'event', eventId);
      }

      // Map legacy role name to unified role name
      const unifiedRoleName = this.mapToUnifiedRoleName(role);
      if (!unifiedRoleName) {
        return {
          success: false,
          error: 'Invalid role.'
        };
      }

      // Grant the new role using unified RBAC
      await this.unifiedRBAC.grantRole(userId, unifiedRoleName, 'event', eventId);

      return {
        success: true,
        data: { message: 'User updated.' }
      };
    } catch (error: any) {
      logger().error('Error updating user for event:', error);
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

      // Check if user is the only admin using unified RBAC
      const userRoles = await this.unifiedRBAC.getUserRoles(userId, 'event', eventId);
      
      const isAdmin = userRoles.some((ur: any) => ur.role.name === 'event_admin');
      if (isAdmin) {
        // Count how many event admins exist for this event
        const allEventUsers = await this.prisma.userRole.findMany({
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
            error: 'Cannot remove the only admin from this event.'
          };
        }
      }

      // Remove all roles for this user in this event using unified RBAC
      for (const userRole of userRoles) {
        await this.unifiedRBAC.revokeRole(userId, userRole.role.name, 'event', eventId);
      }

      return {
        success: true,
        data: { message: 'User removed from event.' }
      };
    } catch (error: any) {
      logger().error('Error removing user from event:', error);
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
      if (name === undefined && description === undefined && contactEmail === undefined && newSlug === undefined && logo === undefined && startDate === undefined && endDate === undefined && website === undefined && codeOfConduct === undefined) {
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
      
      // Encrypt sensitive fields before storing
      const encryptedUpdateData = this.encryptEventData(updateEventData);
      
      const event = await this.prisma.event.update({
        where: { id: eventId },
        data: encryptedUpdateData,
      });
      
      // Log event update
      await logAudit({
        action: 'event_updated',
        targetType: 'Event',
        targetId: eventId,
        eventId: eventId
      });
      
      // Decrypt the event data before returning
      const decryptedEvent = this.decryptEventData(event);
      
      return {
        success: true,
        data: { event: decryptedEvent }
      };
    } catch (error: any) {
      logger().error('Error updating event:', error);
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
          data: new Uint8Array(data),
        },
      });

      // Decrypt event data before returning
      const decryptedEvent = this.decryptEventData(event);

      return {
        success: true,
        data: { event: decryptedEvent }
      };
    } catch (error: any) {
      logger().error('Error uploading logo:', error);
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
      logger().error('Error fetching logo:', error);
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

      // Get user details with their roles in this event using unified RBAC
      const userRoles = await this.unifiedRBAC.getUserRoles(userId, 'event', eventId);
      
      if (userRoles.length === 0) {
        return {
          success: false,
          error: 'User not found in this event.'
        };
      }

      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          avatar: true
        }
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found.'
        };
      }

      const roles = userRoles.map((ur: any) => ur.role.name);
      // Use user's createdAt as join date since UserRole doesn't have createdAt
      const joinDate = user.createdAt;

      // Get last activity (most recent report, comment, or audit log)
      const [lastReport, lastComment, lastAuditLog] = await Promise.all([
        this.prisma.incident.findFirst({
          where: { reporterId: userId, eventId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        }),
        this.prisma.incidentComment.findFirst({
          where: { 
            authorId: userId,
            incident: { eventId }
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
      logger().error('Error getting user profile:', error);
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
        this.prisma.incident.findMany({
          where: { reporterId: userId, eventId },
          select: {
            id: true,
            title: true,
            state: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.incidentComment.findMany({
          where: { 
            authorId: userId,
            incident: { eventId }
          },
          select: {
            id: true,
            body: true,
            createdAt: true,
            incident: {
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
          details: { state: r.state },
          timestamp: r.createdAt
        })),
        ...comments.map(c => ({
          id: c.id,
          type: 'comment',
          action: 'commented',
          title: `Comment on "${c.incident.title}"`,
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
      logger().error('Error getting user activity:', error);
      return {
        success: false,
        error: 'Failed to get user activity.'
      };
    }
  }

  /**
   * Get user's reports for an event
   */
  async getUserIncidents(slug: string, userId: string, options: { page: number; limit: number; type?: string }): Promise<ServiceResult<{ reports: any[]; total: number }>> {
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
        this.prisma.incident.findMany({
          where: whereClause,
          select: {
            id: true,
            title: true,
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
        this.prisma.incident.count({
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
      logger().error('Error getting user reports:', error);
      return {
        success: false,
        error: 'Failed to get user incidents.'
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
        this.prisma.incident.findMany({
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
        this.prisma.incident.findMany({
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
      
      const urgentReports = allReports.filter(incident => 
        incident.severity === 'high' || 
        (incident.createdAt >= oneDayAgo && incident.state === 'submitted')
      ).length;
      
      const assignedToMe = allReports.filter(incident => incident.assignedResponderId === userId
      ).length;
      
      const needsResponse = allReports.filter(incident => 
        ['submitted', 'acknowledged', 'investigating'].includes(incident.state)
      ).length;
      
      const recentActivity = allReports.filter(incident => 
        incident.updatedAt >= sevenDaysAgo
      ).length;

      return {
        success: true,
        data: {
          totalReports,
          urgentReports,
          assignedToMe,
          needsResponse,
          recentActivity,
          recentReports: recentReports.map(incident => ({
            id: incident.id,
            title: incident.title,
            state: incident.state,
            severity: incident.severity,
            createdAt: incident.createdAt.toISOString()
          }))
        }
      };
    } catch (error: any) {
      logger().error('Error getting event card stats:', error);
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
      const totalReports = await this.prisma.incident.count({
        where: { eventId }
      });

      // Get total users for this event using unified RBAC
      const eventUserRoles = await this.prisma.userRole.findMany({
        where: { 
          scopeType: 'event',
          scopeId: eventId 
        },
        select: { userId: true }
      });
      
      // Also count organization admins who have inherited access
      const event_org = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: { organizationId: true }
      });
      
      let orgAdminCount = 0;
      if (event_org?.organizationId) {
        const orgAdmins = await this.prisma.userRole.findMany({
          where: {
            scopeType: 'organization',
            scopeId: event_org.organizationId,
            role: { name: 'org_admin' }
          },
          select: { userId: true }
        });
        orgAdminCount = orgAdmins.length;
      }
      
      // Get unique user count (in case user has multiple roles)
      const uniqueUserIds = new Set([
        ...eventUserRoles.map(ur => ur.userId),
        // Don't double count org admins who also have direct event roles
      ]);
      const totalUsers = uniqueUserIds.size + orgAdminCount;

      // Get reports that need response (submitted, acknowledged, investigating)
      const needsResponseCount = await this.prisma.incident.count({
        where: {
          eventId,
          state: {
            in: ['submitted', 'acknowledged', 'investigating']
          }
        }
      });

      // Get reports assigned to the specific user (if userId provided) or all assigned reports
      const assignedReports = await this.prisma.incident.count({
        where: {
          eventId,
          assignedResponderId: userId ? userId : { not: null }
        }
      });

      // Get resolved reports (resolved or closed state)
      const resolvedReports = await this.prisma.incident.count({
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
      logger().error('Error getting event stats:', error);
      return {
        success: false,
        error: 'Failed to get event statistics.'
      };
    }
  }
} 