import { Request, Response } from 'express';
import { OrganizationService } from '../services/organization.service';
import { EventService } from '../services/event.service';
import { logAudit } from '../utils/audit';
import { UserResponse } from '../types';
import { PrismaClient } from '@prisma/client';
import { UnifiedRBACService } from '../services/unified-rbac.service';
import logger from '../config/logger';

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
// Create UnifiedRBAC instance with the same Prisma client
const unifiedRBAC = new UnifiedRBACService(prisma);

export class OrganizationController {
  /**
   * Organization analytics overview (by ID)
   */
  async getOrganizationAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const organizationId = req.params.organizationId;
      const { timeRange, eventId, status, severity } = req.query as any;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const hasAccess = await unifiedRBAC.hasOrgRole(userId, organizationId);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const { OrganizationAnalyticsService } = await import('../services/organization-analytics.service');
      const service = new OrganizationAnalyticsService(prisma);
      const result = await service.getOrganizationAnalytics({
        organizationId,
        timeRange: timeRange as any,
        eventId: eventId as string | undefined,
        status: status as any,
        severity: severity as any
      });
      res.json(result);
    } catch (error: any) {
      logger().error('Error getting organization analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Organization analytics by slug
   */
  async getOrganizationAnalyticsBySlug(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { orgSlug } = req.params;
      const { timeRange, eventId, status, severity } = req.query as any;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const org = await organizationService.getOrganizationBySlug(orgSlug);
      const organization = org.data?.organization;
      if (!org.success || !organization) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      const hasAccess = await unifiedRBAC.hasOrgRole(userId, organization.id as string);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const { OrganizationAnalyticsService } = await import('../services/organization-analytics.service');
      const service = new OrganizationAnalyticsService(prisma);
      const result = await service.getOrganizationAnalytics({
        organizationId: organization.id as string,
        timeRange: timeRange as any,
        eventId: eventId as string | undefined,
        status: status as any,
        severity: severity as any
      });
      res.json(result);
    } catch (error: any) {
      logger().error('Error getting organization analytics by slug:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Organization events summary
   */
  async getOrganizationEventsSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { organizationId } = req.params;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const hasAccess = await unifiedRBAC.hasOrgRole(userId, organizationId);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      const { OrganizationAnalyticsService } = await import('../services/organization-analytics.service');
      const service = new OrganizationAnalyticsService(prisma);
      const result = await service.getOrganizationEventsSummary(organizationId);
      res.json(result);
    } catch (error: any) {
      logger().error('Error getting organization events summary:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Organization incidents export (CSV or PDF-text)
   */
  async exportOrganizationIncidents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { organizationId, format } = { ...req.params, ...req.query } as any;
      const { timeRange, eventId, status, severity } = req.query as any;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const hasAccess = await unifiedRBAC.hasOrgRole(userId, organizationId);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      if (!format || !['csv', 'pdf'].includes(String(format))) {
        res.status(400).json({ error: 'Invalid format. Must be csv or pdf.' });
        return;
      }
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const { OrganizationAnalyticsService } = await import('../services/organization-analytics.service');
      const service = new OrganizationAnalyticsService(prisma);
      if (format === 'csv') {
        const out = await service.exportOrganizationIncidentsCsv({ organizationId, timeRange, eventId, status, severity } as any, baseUrl);
        res.setHeader('Content-Type', out.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
        res.send(out.body);
        return;
      }
      const out = await service.exportOrganizationIncidentsPdfText({ organizationId, timeRange, eventId, status, severity } as any, baseUrl);
      res.setHeader('Content-Type', out.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
      res.send(out.body);
    } catch (error: any) {
      logger().error('Error exporting organization incidents:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  /**
   * Create a new organization (System Admin only)
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
      logger().error('Error creating organization:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganization(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const organizationId = req.params.organizationId;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Unified RBAC: allow org members and system admins
      const hasAccess = await unifiedRBAC.hasOrgRole(userId, organizationId);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const result = await organizationService.getOrganizationById(organizationId);
      if (!result.success) {
        res.status(result.error === 'Organization not found' ? 404 : 500).json({ error: result.error });
        return;
      }
      res.json(result.data);
    } catch (error: any) {
      logger().error('Error getting organization:', error);
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
      const organization = result.data?.organization;
      if (!organization) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      // Unified RBAC: allow org members and system admins
      const hasAccess = await unifiedRBAC.hasOrgRole(userId, organization.id as string);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      res.json(result.data);
    } catch (error: any) {
      logger().error('Error getting organization by slug:', error);
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

      // Unified RBAC: require org_admin or system_admin
      const isOrgAdmin = await unifiedRBAC.hasOrgRole(userId, organizationId, ['org_admin']);
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
      logger().error('Error updating organization:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete organization (System Admin only)
   */
  async deleteOrganization(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Unified RBAC: allow system admins
      const isSystemAdmin = await unifiedRBAC.hasOrgRole(userId, organizationId, ['system_admin']);
      if (!isSystemAdmin) {
        res.status(403).json({ error: 'System Admin access required' });
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
      logger().error('Error deleting organization:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * List all organizations (System Admin only)
   */
  async listOrganizations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Unified RBAC: allow system admins
      const isSystemAdmin = await unifiedRBAC.isSystemAdmin(userId);
      if (!isSystemAdmin) {
        res.status(403).json({ error: 'System Admin access required' });
        return;
      }

      const result = await organizationService.listOrganizations();

      if (!result.success) {
        res.status(500).json({ error: result.error });
        return;
      }

      res.json(result.data);
    } catch (error: any) {
      logger().error('Error listing organizations:', error);
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

      // Check if user is org admin using unified RBAC
      const isOrgAdmin = await unifiedRBAC.hasOrgRole(userId, organizationId, ['org_admin']);

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
      logger().error('Error adding organization member:', error);
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

      // Check if user is org admin using unified RBAC
      const isOrgAdmin = await unifiedRBAC.hasOrgRole(userId, organizationId, ['org_admin']);

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
      logger().error('Error updating member role:', error);
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

      // Check if user is org admin using unified RBAC
      const isOrgAdmin = await unifiedRBAC.hasOrgRole(userId, organizationId, ['org_admin']);

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
      logger().error('Error removing organization member:', error);
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
      logger().error('Error getting user organizations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Create event for organization
   */
  async createEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { name, slug, description, startDate, endDate, website, contactEmail, codeOfConduct } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!name || !slug) {
        res.status(400).json({ error: 'Name and slug are required' });
        return;
      }

      // Unified RBAC: allow org_admin and system_admin
      const isOrgAdmin = await unifiedRBAC.hasOrgRole(userId, organizationId, ['org_admin']);
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

      // TEMPORARY: Use old system to assign event admin role
      // First, find or create the Event Admin role
      // Assign the creator as event admin using unified RBAC
      try {
        await unifiedRBAC.grantRole(userId, 'event_admin', 'event', event.id);
      } catch (error) {
        logger().warn('Failed to assign event admin role via unified RBAC:', error);
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
      logger().error('Error creating event:', error);
      res.status(500).json({ error: 'Internal server error' });
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

      // Check if user has access to this organization using unified RBAC
      const hasAccess = await unifiedRBAC.hasOrgRole(userId, organizationId);

      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const events = await prisma.event.findMany({
        where: { organizationId } as any,
        include: {
          _count: {
            select: {
              incidents: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ events });
    } catch (error: any) {
      logger().error('Error getting organization events:', error);
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

      // Check if user is org admin using unified RBAC
      const isOrgAdmin = await unifiedRBAC.hasOrgRole(userId, organizationId, ['org_admin']);

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
      logger().error('Upload organization logo error:', error);
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

      // Check if user is org admin using unified RBAC
      const isOrgAdmin = await unifiedRBAC.hasOrgRole(userId, organizationId, ['org_admin']);

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
      logger().error('Upload organization logo by slug error:', error);
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
        res.status(404).json({ error: 'Logo not found' });
        return;
      }

      res.setHeader('Content-Type', logo.mimetype);
      res.setHeader('Content-Disposition', `inline; filename="${logo.filename}"`);
      res.send(logo.data);
    } catch (error: any) {
      logger().error('Get organization logo error:', error);
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
        res.status(404).json({ error: 'Logo not found' });
        return;
      }

      res.setHeader('Content-Type', logo.mimetype);
      res.setHeader('Content-Disposition', `inline; filename="${logo.filename}"`);
      res.send(logo.data);
    } catch (error: any) {
      logger().error('Get organization logo by slug error:', error);
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

      // Check if user is org admin using unified RBAC
      const isOrgAdmin = await unifiedRBAC.hasOrgRole(userId, organizationId, ['org_admin']);

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
      logger().error('Error creating organization invite link:', error);
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
      logger().error('Error getting organization invite links:', error);
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
      logger().error('Error updating organization invite link:', error);
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
      logger().error('Error getting organization invite details:', error);
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
      logger().error('Error using organization invite link:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}