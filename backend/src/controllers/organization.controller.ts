import { Request, Response } from 'express';
import { OrganizationService } from '../services/organization.service';
import { EventService } from '../services/event.service';
import { logAudit } from '../utils/audit';
import { UserResponse } from '../types';
import { PrismaClient } from '@prisma/client';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: UserResponse;
}

const organizationService = new OrganizationService();
const prisma = new PrismaClient();
const eventService = new EventService(prisma);

export class OrganizationController {
  /**
   * Create a new organization (SuperAdmin only)
   */
  async createOrganization(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, slug, description, website, logoUrl, settings } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!name || !slug) {
        res.status(400).json({ error: 'Name and slug are required' });
        return;
      }

      const result = await organizationService.createOrganization(
        { name, slug, description, website, logoUrl, settings },
        userId
      );

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      // Log audit event
      await logAudit({
        eventId: '', // No specific event for org creation
        userId,
        action: 'create_organization',
        targetType: 'organization',
        targetId: result.data!.organization.id,
      });

      res.status(201).json(result.data);
    } catch (error: any) {
      console.error('Error creating organization:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganization(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await organizationService.getOrganizationById(organizationId);

      if (!result.success) {
        res.status(404).json({ error: result.error });
        return;
      }

      // Check if user has access to this organization
      const hasAccess = await organizationService.hasOrganizationRole(
        userId,
        organizationId
      );

      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Error getting organization:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orgSlug } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await organizationService.getOrganizationBySlug(orgSlug);

      if (!result.success) {
        res.status(404).json({ error: result.error });
        return;
      }

      // Check if user has access to this organization
      const organization = result.data?.organization;
      if (!organization) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      const hasAccess = await organizationService.hasOrganizationRole(
        userId,
        (organization as any).id
      );

      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Error getting organization by slug:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update organization
   */
  async updateOrganization(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { name, slug, description, website, logoUrl, settings } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Check if user is org admin
      const isOrgAdmin = await organizationService.hasOrganizationRole(
        userId,
        organizationId,
        'org_admin'
      );

      if (!isOrgAdmin) {
        res.status(403).json({ error: 'Organization admin access required' });
        return;
      }

      const result = await organizationService.updateOrganization(organizationId, {
        name,
        slug,
        description,
        website,
        logoUrl,
        settings,
      });

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      // Log audit event
      await logAudit({
        eventId: '',
        userId,
        action: 'update_organization',
        targetType: 'organization',
        targetId: organizationId,
      });

      res.json(result.data);
    } catch (error: any) {
      console.error('Error updating organization:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete organization (SuperAdmin only)
   */
  async deleteOrganization(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await organizationService.deleteOrganization(organizationId);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      // Log audit event
      await logAudit({
        eventId: '',
        userId,
        action: 'delete_organization',
        targetType: 'organization',
        targetId: organizationId,
      });

      res.json(result.data);
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * List all organizations (SuperAdmin only)
   */
  async listOrganizations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await organizationService.listOrganizations();

      if (!result.success) {
        res.status(500).json({ error: result.error });
        return;
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Error listing organizations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Add member to organization
   */
  async addMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { userId: targetUserId, role } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!targetUserId || !role) {
        res.status(400).json({ error: 'User ID and role are required' });
        return;
      }

      // Check if user is org admin
      const isOrgAdmin = await organizationService.hasOrganizationRole(
        userId,
        organizationId,
        'org_admin'
      );

      if (!isOrgAdmin) {
        res.status(403).json({ error: 'Organization admin access required' });
        return;
      }

      const result = await organizationService.addMember(
        organizationId,
        targetUserId,
        role,
        userId
      );

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      // Log audit event
      await logAudit({
        eventId: '',
        userId,
        action: 'add_organization_member',
        targetType: 'organization_membership',
        targetId: result.data!.membership.id,
      });

      res.status(201).json(result.data);
    } catch (error: any) {
      console.error('Error adding organization member:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId, userId: targetUserId } = req.params;
      const { role } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!role) {
        res.status(400).json({ error: 'Role is required' });
        return;
      }

      // Check if user is org admin
      const isOrgAdmin = await organizationService.hasOrganizationRole(
        userId,
        organizationId,
        'org_admin'
      );

      if (!isOrgAdmin) {
        res.status(403).json({ error: 'Organization admin access required' });
        return;
      }

      const result = await organizationService.updateMemberRole(
        organizationId,
        targetUserId,
        role
      );

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      // Log audit event
      await logAudit({
        eventId: '',
        userId,
        action: 'update_organization_member_role',
        targetType: 'organization_membership',
        targetId: result.data!.membership.id,
      });

      res.json(result.data);
    } catch (error: any) {
      console.error('Error updating member role:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Remove member from organization
   */
  async removeMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId, userId: targetUserId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Check if user is org admin
      const isOrgAdmin = await organizationService.hasOrganizationRole(
        userId,
        organizationId,
        'org_admin'
      );

      if (!isOrgAdmin) {
        res.status(403).json({ error: 'Organization admin access required' });
        return;
      }

      const result = await organizationService.removeMember(organizationId, targetUserId);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      // Log audit event
      await logAudit({
        eventId: '',
        userId,
        action: 'remove_organization_member',
        targetType: 'organization_membership',
        targetId: targetUserId,
      });

      res.json(result.data);
    } catch (error: any) {
      console.error('Error removing organization member:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await organizationService.getUserOrganizations(userId);

      if (!result.success) {
        res.status(500).json({ error: result.error });
        return;
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Error getting user organizations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Create event in organization (Org Admin only)
   */
  async createEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { 
        name, 
        slug, 
        description, 
        startDate, 
        endDate, 
        website, 
        contactEmail,
        codeOfConduct 
      } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!name || !slug) {
        res.status(400).json({ error: 'Name and slug are required' });
        return;
      }

      // Check if user is org admin
      const isOrgAdmin = await organizationService.hasOrganizationRole(
        userId,
        organizationId,
        'org_admin'
      );

      if (!isOrgAdmin) {
        res.status(403).json({ error: 'Organization admin access required' });
        return;
      }

      // Create event with organization ID
      const event = await prisma.event.create({
        data: {
          name,
          slug,
          description: description || null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          website: website || null,
          contactEmail: contactEmail || null,
          codeOfConduct: codeOfConduct || null,
          organizationId,
        } as any,
      });

      // Automatically assign the creator as event admin
      const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });
      if (adminRole) {
        await prisma.userEventRole.create({
          data: {
            userId,
            eventId: event.id,
            roleId: adminRole.id,
          },
        });
      }

      // Log audit event
      await logAudit({
        eventId: event.id,
        userId,
        action: 'create_event',
        targetType: 'event',
        targetId: event.id,
      });

      res.status(201).json({ event });
    } catch (error: any) {
      console.error('Error creating event:', error);
      if (error.code === 'P2002') {
        res.status(400).json({ error: 'Event slug already exists' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Get organization events
   */
  async getEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Check if user has access to this organization
      const hasAccess = await organizationService.hasOrganizationRole(
        userId,
        organizationId
      );

      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const events = await prisma.event.findMany({
        where: { organizationId } as any,
        include: {
          _count: {
            select: {
              reports: true,
              userEventRoles: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ events });
    } catch (error: any) {
      console.error('Error getting organization events:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
} 