import { Request, Response } from 'express';
import { OrganizationService } from '../services/organization.service';
import { logAudit } from '../utils/audit';
import { UserResponse } from '../types';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: UserResponse;
}

const organizationService = new OrganizationService();

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
        organization.id
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
} 