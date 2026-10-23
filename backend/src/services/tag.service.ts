import { PrismaClient } from '../generated/prisma/client';
import { logger } from '../utils/logger';
import { UnifiedRBACService } from './unified-rbac.service';

export interface TagCreateData {
  name: string;
  color: string;
  eventId: string;
}

export interface TagUpdateData {
  name?: string;
  color?: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TagWithIncidentCount {
  id: string;
  name: string;
  color: string;
  eventId: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    incidents: number;
  };
}

export class TagService {
  private unifiedRBAC: UnifiedRBACService;

  constructor(private prisma: PrismaClient) {
    this.unifiedRBAC = new UnifiedRBACService(prisma);
  }

  /**
   * Check if user has responder or above permissions for the event
   */
  private async hasTagManagementPermission(userId: string, eventId: string): Promise<boolean> {
    return await this.unifiedRBAC.hasEventRole(userId, eventId, ['responder', 'event_admin', 'system_admin']);
  }

  /**
   * Create a new tag for an event
   */
  async createTag(data: TagCreateData, userId: string): Promise<ServiceResult<{ tag: any }>> {
    try {
      const { name, color, eventId } = data;

      // Validate required fields
      if (!name || !color || !eventId) {
        return {
          success: false,
          error: 'Missing required fields: name, color, eventId'
        };
      }

      // Check permissions
      const hasPermission = await this.hasTagManagementPermission(userId, eventId);
      if (!hasPermission) {
        return {
          success: false,
          error: 'Insufficient permissions. Only responders and above can manage tags.'
        };
      }

      // Validate color format (hex color)
      const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!colorRegex.test(color)) {
        return {
          success: false,
          error: 'Invalid color format. Must be a valid hex color (e.g., #FF0000).'
        };
      }

      // Validate tag name
      if (name.trim().length < 1 || name.trim().length > 50) {
        return {
          success: false,
          error: 'Tag name must be between 1 and 50 characters.'
        };
      }

             // Check if tag name already exists for this event (case-insensitive)
             const existingTag = await this.prisma.tag.findFirst({
               where: {
                 name: {
                   equals: name.trim(),
                   mode: 'insensitive'
                 },
                 eventId
        }
      });

      if (existingTag) {
        return {
          success: false,
          error: 'A tag with this name already exists for this event.'
        };
      }

      // Create the tag
      const tag = await this.prisma.tag.create({
        data: {
          name: name.trim(),
          color,
          eventId
        }
      });

      return {
        success: true,
        data: { tag }
      };
    } catch (error: any) {
      logger.error('Error creating tag:', error);
      return {
        success: false,
        error: 'Failed to create tag.'
      };
    }
  }

    /**
   * Get all tags for an event
   */
  async getTagsByEvent(eventId: string, userId: string): Promise<ServiceResult<{ tags: TagWithIncidentCount[] }>> {
    try {
      // Check if user has access to the event
      const hasAccess = await this.unifiedRBAC.hasEventRole(userId, eventId, ['reporter', 'responder', 'event_admin', 'system_admin']);
      if (!hasAccess) {
        return {
          success: false,
          error: 'No access to this event.'
        };
      }

      const tags = await this.prisma.tag.findMany({
        where: { eventId },
        include: {
          _count: {
            select: {
              incidents: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });



      return {
        success: true,
        data: { tags }
      };
    } catch (error: any) {
      logger.error('Error fetching tags:', error);
      return {
        success: false,
        error: 'Failed to fetch tags.'
      };
    }
  }

  /**
   * Update a tag
   */
  async updateTag(tagId: string, data: TagUpdateData, userId: string): Promise<ServiceResult<{ tag: any }>> {
    try {
      // Get the tag to check permissions
      const existingTag = await this.prisma.tag.findUnique({
        where: { id: tagId }
      });

      if (!existingTag) {
        return {
          success: false,
          error: 'Tag not found.'
        };
      }

      // Check permissions
      const hasPermission = await this.hasTagManagementPermission(userId, existingTag.eventId);
      if (!hasPermission) {
        return {
          success: false,
          error: 'Insufficient permissions. Only responders and above can manage tags.'
        };
      }

      const updateData: any = {};

      // Validate and set name if provided
      if (data.name !== undefined) {
        if (data.name.trim().length < 1 || data.name.trim().length > 50) {
          return {
            success: false,
            error: 'Tag name must be between 1 and 50 characters.'
          };
        }

        // Check if new name already exists for this event (excluding current tag)
        const existingTagWithName = await this.prisma.tag.findFirst({
          where: {
            name: data.name.trim(),
            eventId: existingTag.eventId,
            id: { not: tagId }
          }
        });

        if (existingTagWithName) {
          return {
            success: false,
            error: 'A tag with this name already exists for this event.'
          };
        }

        updateData.name = data.name.trim();
      }

      // Validate and set color if provided
      if (data.color !== undefined) {
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!colorRegex.test(data.color)) {
          return {
            success: false,
            error: 'Invalid color format. Must be a valid hex color (e.g., #FF0000).'
          };
        }
        updateData.color = data.color;
      }

      // Update the tag
      const tag = await this.prisma.tag.update({
        where: { id: tagId },
        data: updateData
      });

      return {
        success: true,
        data: { tag }
      };
    } catch (error: any) {
      logger.error('Error updating tag:', error);
      return {
        success: false,
        error: 'Failed to update tag.'
      };
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(tagId: string, userId: string): Promise<ServiceResult<{ message: string }>> {
    try {
      // Get the tag to check permissions
      const existingTag = await this.prisma.tag.findUnique({
        where: { id: tagId },
        include: {
          _count: {
            select: {
              incidents: true
            }
          }
        }
      });

      if (!existingTag) {
        return {
          success: false,
          error: 'Tag not found.'
        };
      }

      // Check permissions
      const hasPermission = await this.hasTagManagementPermission(userId, existingTag.eventId);
      if (!hasPermission) {
        return {
          success: false,
          error: 'Insufficient permissions. Only responders and above can manage tags.'
        };
      }

      // Check if tag is in use
      if (existingTag._count.incidents > 0) {
        return {
          success: false,
          error: `Cannot delete tag. It is currently used by ${existingTag._count.incidents} incident(s).`
        };
      }

      // Delete the tag
      await this.prisma.tag.delete({
        where: { id: tagId }
      });

      return {
        success: true,
        data: { message: 'Tag deleted successfully.' }
      };
    } catch (error: any) {
      logger.error('Error deleting tag:', error);
      return {
        success: false,
        error: 'Failed to delete tag.'
      };
    }
  }

  /**
   * Add tags to an incident
   */
  async addTagsToIncident(incidentId: string, tagIds: string[], userId: string): Promise<ServiceResult<{ message: string }>> {
    try {
      // Get the incident to check event and permissions
      const incident = await this.prisma.incident.findUnique({
        where: { id: incidentId },
        select: { id: true, eventId: true }
      });

      if (!incident) {
        return {
          success: false,
          error: 'Incident not found.'
        };
      }

      // Check permissions
      const hasPermission = await this.hasTagManagementPermission(userId, incident.eventId);
      if (!hasPermission) {
        return {
          success: false,
          error: 'Insufficient permissions. Only responders and above can manage incident tags.'
        };
      }

      // Verify all tags belong to the same event
      const tags = await this.prisma.tag.findMany({
        where: {
          id: { in: tagIds },
          eventId: incident.eventId
        }
      });

      if (tags.length !== tagIds.length) {
        return {
          success: false,
          error: 'Some tags do not exist or do not belong to this event.'
        };
      }

      // Create incident-tag associations
      const incidentTagData = tagIds.map(tagId => ({
        incidentId,
        tagId
      }));

      await this.prisma.incidentTag.createMany({
        data: incidentTagData,
        skipDuplicates: true
      });

      return {
        success: true,
        data: { message: 'Tags added to incident successfully.' }
      };
    } catch (error: any) {
      logger.error('Error adding tags to incident:', error);
      return {
        success: false,
        error: 'Failed to add tags to incident.'
      };
    }
  }

  /**
   * Remove tags from an incident
   */
  async removeTagsFromIncident(incidentId: string, tagIds: string[], userId: string): Promise<ServiceResult<{ message: string }>> {
    try {
      // Get the incident to check permissions
      const incident = await this.prisma.incident.findUnique({
        where: { id: incidentId },
        select: { id: true, eventId: true }
      });

      if (!incident) {
        return {
          success: false,
          error: 'Incident not found.'
        };
      }

      // Check permissions
      const hasPermission = await this.hasTagManagementPermission(userId, incident.eventId);
      if (!hasPermission) {
        return {
          success: false,
          error: 'Insufficient permissions. Only responders and above can manage incident tags.'
        };
      }

      // Remove incident-tag associations
      await this.prisma.incidentTag.deleteMany({
        where: {
          incidentId,
          tagId: { in: tagIds }
        }
      });

      return {
        success: true,
        data: { message: 'Tags removed from incident successfully.' }
      };
    } catch (error: any) {
      logger.error('Error removing tags from incident:', error);
      return {
        success: false,
        error: 'Failed to remove tags from incident.'
      };
    }
  }

  /**
   * Get all incidents with a specific tag
   */
  async getIncidentsByTag(tagId: string, userId: string): Promise<ServiceResult<{ incidents: any[] }>> {
    try {
      // Get the tag to check permissions
      const tag = await this.prisma.tag.findUnique({
        where: { id: tagId }
      });

      if (!tag) {
        return {
          success: false,
          error: 'Tag not found.'
        };
      }

             // Check permissions
       const hasAccess = await this.unifiedRBAC.hasEventRole(userId, tag.eventId, ['reporter', 'responder', 'event_admin', 'system_admin']);
       if (!hasAccess) {
         return {
           success: false,
           error: 'No access to this event.'
         };
       }

      const incidentTags = await this.prisma.incidentTag.findMany({
        where: { tagId },
        include: {
          incident: {
            include: {
              reporter: {
                select: { id: true, name: true, email: true }
              },
              assignedResponder: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      });

      const incidents = incidentTags.map(it => it.incident);

      return {
        success: true,
        data: { incidents }
      };
    } catch (error: any) {
      logger.error('Error fetching incidents by tag:', error);
      return {
        success: false,
        error: 'Failed to fetch incidents by tag.'
      };
    }
  }
} 