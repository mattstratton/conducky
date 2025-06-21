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
// Use a singleton PrismaClient instance to avoid connection leaks
let prismaInstance: PrismaClient | null = null;
const getPrismaClient = () => {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
};
const prisma = getPrismaClient();
const eventService = new EventService(prisma);

// Helper function to check if user is SuperAdmin
async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const userRoles = await prisma.userEventRole.findMany({
      where: { userId },
      include: { role: true },
    });
    
    return userRoles.some(uer => uer.role.name === 'SuperAdmin');
  } catch (error) {
    console.error('Error checking SuperAdmin status:', error);
    return false;
  }
}

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
      if (result.data?.organization?.id) {
        await logAudit({
          eventId: undefined, // No specific event for org creation
          userId,
          action: 'create_organization',
          targetType: 'organization',
          targetId: result.data.organization.id,
        });
      }

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
        organization.id as string
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
        eventId: undefined,
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

      // Verify SuperAdmin permission (defense in depth)
      const isUserSuperAdmin = await isSuperAdmin(userId);
      if (!isUserSuperAdmin) {
        res.status(403).json({ error: 'SuperAdmin access required' });
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

      // Verify SuperAdmin permission (defense in depth)
      const isUserSuperAdmin = await isSuperAdmin(userId);
      if (!isUserSuperAdmin) {
        res.status(403).json({ error: 'SuperAdmin access required' });
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
      if (result.data?.membership?.id) {
        await logAudit({
          eventId: '',
          userId,
          action: 'add_organization_member',
          targetType: 'organization_membership',
          targetId: result.data.membership.id,
        });
      }

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
      if (result.data?.membership?.id) {
        await logAudit({
          eventId: '',
          userId,
          action: 'update_organization_member_role',
          targetType: 'organization_membership',
          targetId: result.data.membership.id,
        });
      }

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
        },
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

  /**
   * Upload organization logo
   */
  async uploadLogo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const logoFile = req.file;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!logoFile) {
        res.status(400).json({ error: 'No logo file uploaded.' });
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

      // Convert Multer File to OrganizationLogo format
      const logoData = {
        filename: logoFile.originalname,
        mimetype: logoFile.mimetype,
        size: logoFile.size,
        data: logoFile.buffer
      };

      const result = await organizationService.uploadOrganizationLogo(organizationId, logoData);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      // Log audit event
      await logAudit({
        eventId: '',
        userId,
        action: 'upload_organization_logo',
        targetType: 'organization',
        targetId: organizationId,
      });

      res.json(result.data);
    } catch (error: any) {
      console.error('Upload organization logo error:', error);
      res.status(500).json({ error: 'Failed to upload logo.' });
    }
  }

  /**
   * Upload organization logo by slug
   */
  async uploadLogoBySlug(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orgSlug } = req.params;
      const logoFile = req.file;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!logoFile) {
        res.status(400).json({ error: 'No logo file uploaded.' });
        return;
      }

      // Get organization by slug
      const orgResult = await organizationService.getOrganizationBySlug(orgSlug);
      if (!orgResult.success || !orgResult.data?.organization) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      const organizationId = orgResult.data.organization.id as string;

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

      // Convert Multer File to OrganizationLogo format
      const logoData = {
        filename: logoFile.originalname,
        mimetype: logoFile.mimetype,
        size: logoFile.size,
        data: logoFile.buffer
      };

      const result = await organizationService.uploadOrganizationLogo(organizationId, logoData);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      // Log audit event
      await logAudit({
        eventId: '',
        userId,
        action: 'upload_organization_logo',
        targetType: 'organization',
        targetId: organizationId,
      });

      res.json(result.data);
    } catch (error: any) {
      console.error('Upload organization logo by slug error:', error);
      res.status(500).json({ error: 'Failed to upload logo.' });
    }
  }

  /**
   * Get organization logo
   */
  async getLogo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      const result = await organizationService.getOrganizationLogo(organizationId);

      if (!result.success) {
        res.status(404).json({ error: result.error });
        return;
      }

      const logo = result.data;

      if (!logo) {
        res.status(404).json({ error: 'Logo not found.' });
        return;
      }

      res.setHeader('Content-Type', logo.mimetype);
      res.setHeader('Content-Disposition', `inline; filename="${logo.filename}"`);
      res.send(logo.data);
    } catch (error: any) {
      console.error('Get organization logo error:', error);
      res.status(500).json({ error: 'Failed to get logo.' });
    }
  }

  /**
   * Get organization logo by slug
   */
  async getLogoBySlug(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { orgSlug } = req.params;

      // Get organization by slug
      const orgResult = await organizationService.getOrganizationBySlug(orgSlug);
      if (!orgResult.success || !orgResult.data?.organization) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      const organizationId = orgResult.data.organization.id as string;

      const result = await organizationService.getOrganizationLogo(organizationId);

      if (!result.success) {
        res.status(404).json({ error: result.error });
        return;
      }

      const logo = result.data;

      if (!logo) {
        res.status(404).json({ error: 'Logo not found.' });
        return;
      }

      res.setHeader('Content-Type', logo.mimetype);
      res.setHeader('Content-Disposition', `inline; filename="${logo.filename}"`);
      res.send(logo.data);
    } catch (error: any) {
      console.error('Get organization logo by slug error:', error);
      res.status(500).json({ error: 'Failed to get logo.' });
    }
  }

  /**
   * Create organization invite link (Org Admin only)
   */
  async createInviteLink(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { role, maxUses, expiresAt, note } = req.body;
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

      const result = await organizationService.createInviteLink(
        organizationId,
        userId,
        role,
        maxUses ? parseInt(maxUses) : undefined,
        expiresAt ? new Date(expiresAt) : undefined,
        note
      );

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(201).json(result.data);
    } catch (error: any) {
      console.error('Error creating organization invite link:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get organization invite links (Org Admin only)
   */
  async getInviteLinks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
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

      const result = await organizationService.getInviteLinks(organizationId);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({ invites: result.data?.inviteLinks });
    } catch (error: any) {
      console.error('Error getting organization invite links:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update organization invite link (Org Admin only)
   */
  async updateInviteLink(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId, inviteId } = req.params;
      const { disabled } = req.body;
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

      const result = await organizationService.updateInviteLink(inviteId, disabled);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Error updating organization invite link:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get organization invite details (public endpoint)
   */
  async getInviteDetails(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;

      const prisma = getPrismaClient();
      
      // Find the invite link
      const invite = await prisma.organizationInviteLink.findUnique({
        where: { code },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            },
          },
        },
      });

      if (!invite) {
        res.status(404).json({ error: 'Invite not found' });
        return;
      }

      // Check if invite is expired
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        res.status(400).json({ error: 'Invite has expired' });
        return;
      }

      // Check if invite has reached max uses
      if (invite.maxUses && invite.useCount >= invite.maxUses) {
        res.status(400).json({ error: 'Invite has reached maximum uses' });
        return;
      }

      // Check if invite is disabled
      if (invite.disabled) {
        res.status(400).json({ error: 'Invite is disabled' });
        return;
      }

      res.json({
        invite: {
          id: invite.id,
          note: invite.note,
          expiresAt: invite.expiresAt,
          useCount: invite.useCount,
          maxUses: invite.maxUses,
          disabled: invite.disabled,
          role: invite.role,
        },
        organization: invite.organization,
      });
    } catch (error: any) {
      console.error('Error getting organization invite details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Use organization invite link
   */
  async useInviteLink(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await organizationService.useInviteLink(code, userId);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Error using organization invite link:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
} 