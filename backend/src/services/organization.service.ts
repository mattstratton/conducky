import { PrismaClient, Organization, OrganizationRole, OrganizationLogo, OrganizationInviteLink } from '@prisma/client';
import { ServiceResult } from '../types';
import { UnifiedRBACService } from './unified-rbac.service';
import { logAudit } from '../utils/audit';
import logger from '../config/logger';

// Type for user role data from unified RBAC system
interface UserRoleWithDetails {
  userId: string;
  grantedAt: Date;
  grantedById: string | null;
  role: {
    name: string;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

// Synthetic OrganizationMembership type for backward compatibility
// Note: This interface is maintained for backward compatibility but the actual
// implementation uses unified RBAC data structures
export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: Date;
  createdById: string | null;
}

const prisma = new PrismaClient();

export interface CreateOrganizationData {
  name: string;
  slug: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  settings?: string;
}

export interface UpdateOrganizationData {
  name?: string;
  slug?: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  settings?: string;
}

export interface OrganizationWithMembers extends Organization {
  memberships: {
    userId: string;
    role: string;
    grantedAt: Date;
    grantedById: string | null;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }[];
  _count: {
    events: number;
    memberships: number;
  };
}

export interface OrganizationLogoData {
  filename: string;
  mimetype: string;
  size: number;
  data: Buffer;
}

export class OrganizationService {
  private rbacService = new UnifiedRBACService();

  /**
   * Create a new organization
   */
  async createOrganization(
    data: CreateOrganizationData,
    createdById: string
  ): Promise<ServiceResult<{ organization: Organization; inviteLink?: OrganizationInviteLink & { url: string } }>> {
    try {
      // Check if slug already exists
      const existingOrg = await prisma.organization.findUnique({
        where: { slug: data.slug },
      });

      if (existingOrg) {
        return {
          success: false,
          error: 'Organization slug already exists',
        };
      }

      const organization = await prisma.organization.create({
        data: {
          ...data,
          createdById,
        },
      });

      // Determine if creator is a System Admin. If so, do NOT auto-grant org_admin.
      // Instead, create a single-use org_admin invitation link to share.
      let generatedInvite: (OrganizationInviteLink & { url: string }) | undefined;
      const isSystemAdmin = await (this.rbacService as any).isSystemAdmin
        ? await (this.rbacService as any).isSystemAdmin(createdById)
        : false;
      if (isSystemAdmin) {
        // Create a one-time org_admin invite valid for 7 days using existing helper
        try {
          const inviteResult = await this.createInviteLink(
            organization.id,
            createdById,
            'org_admin',
            1,
            (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d; })(),
            'Initial Org Admin invite'
          );
          if (inviteResult.success && inviteResult.data?.inviteLink) {
            generatedInvite = inviteResult.data.inviteLink;
          }
        } catch (e) {
          // Do not fail org creation if invite creation fails
          logger().warn('Organization created but failed to generate initial org_admin invite', { error: (e as Error)?.message });
        }
      } else {
        // For non-system flows (future), grant org_admin to the creator
        await this.rbacService.grantRole(
          createdById,
          'org_admin',
          'organization',
          organization.id,
          createdById
        );
      }

      // Log organization creation
      await logAudit({
        action: 'organization_created',
        targetType: 'Organization',
        targetId: organization.id,
        userId: createdById
      });

      return {
        success: true,
        data: { organization, ...(generatedInvite ? { inviteLink: generatedInvite } : {}) },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to create organization: ${error.message}`,
      };
    }
  }

  /**
   * Get organization by ID with memberships
   */
  async getOrganizationById(
    organizationId: string
  ): Promise<ServiceResult<{ organization: OrganizationWithMembers }>> {
    try {
      // Get basic organization data
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          _count: {
            select: {
              events: true,
            },
          },
        },
      });

      if (!organization) {
        return {
          success: false,
          error: 'Organization not found',
        };
      }

      // Get all users with roles in this organization from unified RBAC system
      const orgUserRoles = await prisma.userRole.findMany({
        where: {
          scopeType: 'organization',
          scopeId: organizationId,
        },
        include: {
          role: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      
      // Convert to simplified member structure with proper type safety
      const memberships = orgUserRoles.map((userRole: UserRoleWithDetails) => ({
        userId: userRole.userId,
        role: userRole.role.name,
        grantedAt: userRole.grantedAt,
        grantedById: userRole.grantedById,
        user: userRole.user,
      }));

      // Return organization with simplified member structure
      const organizationWithMembers = {
        ...organization,
        memberships: memberships,
        _count: {
          events: organization._count.events,
          memberships: memberships.length,
        },
      };

      return {
        success: true,
        data: { organization: organizationWithMembers },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to get organization: ${error.message}`,
      };
    }
  }

  /**
   * Get organization by slug with memberships
   */
  async getOrganizationBySlug(
    slug: string
  ): Promise<ServiceResult<{ organization: OrganizationWithMembers }>> {
    try {
      // Get basic organization data
      const organization = await prisma.organization.findUnique({
        where: { slug },
        include: {
          _count: {
            select: {
              events: true,
            },
          },
        },
      });

      if (!organization) {
        return {
          success: false,
          error: 'Organization not found',
        };
      }

      // Get all users with roles in this organization from unified RBAC system
      const orgUserRoles = await prisma.userRole.findMany({
        where: {
          scopeType: 'organization',
          scopeId: organization.id,
        },
        include: {
          role: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      
      // Convert to simplified member structure with proper type safety
      const memberships = orgUserRoles.map((userRole: UserRoleWithDetails) => ({
        userId: userRole.userId,
        role: userRole.role.name,
        grantedAt: userRole.grantedAt,
        grantedById: userRole.grantedById,
        user: userRole.user,
      }));

      // Return organization with simplified member structure
      const organizationWithMembers = {
        ...organization,
        memberships: memberships,
        _count: {
          events: organization._count.events,
          memberships: memberships.length,
        },
      };

      return {
        success: true,
        data: { organization: organizationWithMembers },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to get organization: ${error.message}`,
      };
    }
  }

  /**
   * Update organization
   */
  async updateOrganization(
    organizationId: string,
    data: UpdateOrganizationData
  ): Promise<ServiceResult<{ organization: Organization }>> {
    try {
      // If updating slug, check if it already exists
      if (data.slug) {
        const existingOrg = await prisma.organization.findFirst({
          where: {
            slug: data.slug,
            NOT: { id: organizationId },
          },
        });

        if (existingOrg) {
          return {
            success: false,
            error: 'Organization slug already exists',
          };
        }
      }

      const organization = await prisma.organization.update({
        where: { id: organizationId },
        data,
      });

      // Log organization update
      await logAudit({
        action: 'organization_updated',
        targetType: 'Organization',
        targetId: organizationId
      });

      return {
        success: true,
        data: { organization },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to update organization: ${error.message}`,
      };
    }
  }

  /**
   * Delete organization
   */
  async deleteOrganization(
    organizationId: string
  ): Promise<ServiceResult<{ message: string }>> {
    try {
      // Check if organization has events
      const eventCount = await prisma.event.count({
        where: { organizationId },
      });

      if (eventCount > 0) {
        return {
          success: false,
          error: 'Cannot delete organization with existing events',
        };
      }

      await prisma.organization.delete({
        where: { id: organizationId },
      });

      return {
        success: true,
        data: { message: 'Organization deleted successfully' },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to delete organization: ${error.message}`,
      };
    }
  }

  /**
   * List all organizations (System Admin only)
   */
  async listOrganizations(): Promise<ServiceResult<{ organizations: OrganizationWithMembers[] }>> {
    try {
      // Get basic organization data
      const organizations = await prisma.organization.findMany({
        include: {
          _count: {
            select: {
              events: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // For each organization, get members from unified RBAC
      const organizationsWithMembers = await Promise.all(
        organizations.map(async (org) => {
          // Get all users with roles in this organization
          const orgUserRoles = await prisma.userRole.findMany({
            where: {
              scopeType: 'organization',
              scopeId: org.id,
            },
            include: {
              role: true,
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          });
          
          // Convert to simplified member structure with proper type safety
          const memberships = orgUserRoles.map((userRole: UserRoleWithDetails) => ({
            userId: userRole.userId,
            role: userRole.role.name,
            grantedAt: userRole.grantedAt,
            grantedById: userRole.grantedById,
            user: userRole.user,
          }));

          // Return organization with simplified member structure
          return {
            ...org,
            memberships: memberships,
            _count: {
              events: org._count?.events || 0,
              memberships: memberships.length,
            },
          };
        })
      );

      return {
        success: true,
        data: { organizations: organizationsWithMembers },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to list organizations: ${error.message}`,
      };
    }
  }

  /**
   * Add member to organization using unified RBAC
   */
  async addMember(
    organizationId: string,
    userId: string,
    role: OrganizationRole,
    createdById: string
  ): Promise<ServiceResult<{ membership: OrganizationMembership }>> {
    try {
      // Check if user already has any organization role
      const hasExistingRole = await this.rbacService.hasOrgRole(userId, organizationId, ['org_admin', 'org_viewer']);
      
      if (hasExistingRole) {
        return {
          success: false,
          error: 'User is already a member of this organization',
        };
      }

      // Grant the role using unified RBAC
      const roleGranted = await this.rbacService.grantRole(
        userId,
        role,
        'organization',
        organizationId,
        createdById
      );

      if (!roleGranted) {
        return {
          success: false,
          error: 'Failed to grant organization role',
        };
      }

      // Return a synthetic membership object for backward compatibility
      const membership: OrganizationMembership = {
        id: `unified-${userId}-${organizationId}`, // Synthetic ID
        organizationId,
        userId,
        role,
        createdAt: new Date(),
        createdById,
      };

      return {
        success: true,
        data: { membership },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to add member: ${error.message}`,
      };
    }
  }

  /**
   * Update member role using unified RBAC
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: OrganizationRole
  ): Promise<ServiceResult<{ membership: OrganizationMembership }>> {
    try {
      // Get the user's current organization roles
      const userRoles = await this.rbacService.getUserRoles(userId, 'organization', organizationId);
      
      if (userRoles.length === 0) {
        return {
          success: false,
          error: 'User is not a member of this organization',
        };
      }

      // Check if user already has the target role
      const hasTargetRole = userRoles.some((ur: any) => ur.role.name === role);
      if (hasTargetRole) {
        // Already has the role, return success with synthetic membership
        const membership: OrganizationMembership = {
          id: `unified-${userId}-${organizationId}`,
          organizationId,
          userId,
          role,
          createdAt: new Date(),
          createdById: userId, // We don't track who did the update in this context
        };

        return {
          success: true,
          data: { membership },
        };
      }

      // Revoke all existing organization roles for this user
      let revokedCount = 0;
      for (const userRole of userRoles) {
        const revoked = await this.rbacService.revokeRole(
          userId,
          userRole.role.name,
          'organization',
          organizationId
        );
        if (revoked) {
          revokedCount++;
        }
      }

      // Grant the new role
      const roleGranted = await this.rbacService.grantRole(
        userId,
        role,
        'organization',
        organizationId,
        userId // We don't know who initiated this, so use the user's ID
      );

      if (!roleGranted) {
        return {
          success: false,
          error: 'Failed to grant new organization role',
        };
      }

      // Log organization role change
      await logAudit({
        action: 'organization_role_changed',
        targetType: 'OrganizationMembership',
        targetId: userId,
        userId: userId
      });

      // Return synthetic membership object for backward compatibility
      const membership: OrganizationMembership = {
        id: `unified-${userId}-${organizationId}`,
        organizationId,
        userId,
        role,
        createdAt: new Date(),
        createdById: userId,
      };

      return {
        success: true,
        data: { membership },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to update member role: ${error.message}`,
      };
    }
  }

  /**
   * Remove member from organization using unified RBAC
   */
  async removeMember(
    organizationId: string,
    userId: string
  ): Promise<ServiceResult<{ message: string }>> {
    try {
      // Get the user's current organization roles to revoke them
      const userRoles = await this.rbacService.getUserRoles(userId, 'organization', organizationId);
      
      if (userRoles.length === 0) {
        return {
          success: false,
          error: 'User is not a member of this organization',
        };
      }

      // Revoke all organization roles for this user
      let revokedCount = 0;
      for (const userRole of userRoles) {
        const revoked = await this.rbacService.revokeRole(
          userId,
          userRole.role.name,
          'organization',
          organizationId
        );
        if (revoked) {
          revokedCount++;
        }
      }

      if (revokedCount === 0) {
        return {
          success: false,
          error: 'Failed to remove organization roles',
        };
      }

      return {
        success: true,
        data: { message: 'Member removed successfully' },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to remove member: ${error.message}`,
      };
    }
  }

  /**
   * Get user's organizations (includes all organizations for System Admins)
   */
  async getUserOrganizations(
    userId: string
  ): Promise<ServiceResult<{ organizations: (Organization & { membership: OrganizationMembership })[] }>> {
    try {
      // Get organizations based on explicit org roles only (no implicit System Admin access)
      const userOrgRoles = await this.rbacService.getUserRoles(userId, 'organization');
      
      if (userOrgRoles.length === 0) {
        return {
          success: true,
          data: { organizations: [] },
        };
      }

      // Get unique organization IDs
      const orgIdsSet = new Set<string>();
      userOrgRoles.forEach((ur: any) => orgIdsSet.add(ur.scopeId));
      const orgIds = Array.from(orgIdsSet);
      
      // Fetch organization details
      const orgsData = await prisma.organization.findMany({
        where: {
          id: { in: orgIds }
        },
        orderBy: { name: 'asc' }
      });

      // Map organizations with synthetic membership objects
      const organizations = orgsData.map(org => {
        // Find user's role for this organization (take highest if multiple)
        const userRoleForOrg = userOrgRoles
          .filter((ur: any) => ur.scopeId === org.id)
          .sort((a: any, b: any) => b.role.level - a.role.level)[0]; // Sort by level, take highest

        return {
          ...org,
          membership: {
            id: `unified-${userId}-${org.id}`,
            organizationId: org.id,
            userId,
            role: userRoleForOrg.role.name,
            createdAt: userRoleForOrg.grantedAt || new Date(),
            createdById: userRoleForOrg.grantedById || userId,
          },
        };
      });

      return {
        success: true,
        data: { organizations },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to get user organizations: ${error.message}`,
      };
    }
  }

  /**
   * Check if user has organization role using unified RBAC
   */
  async hasOrganizationRole(
    userId: string,
    organizationId: string,
    requiredRole?: OrganizationRole
  ): Promise<boolean> {
    try {
      // If no specific role required, check if user has any org role
      if (!requiredRole) {
        return await this.rbacService.hasOrgRole(userId, organizationId, ['org_admin', 'org_viewer']);
      }

      // For specific role requirements, check role hierarchy
      if (requiredRole === 'org_viewer') {
        // org_viewer access: both org_admin and org_viewer qualify
        return await this.rbacService.hasOrgRole(userId, organizationId, ['org_admin', 'org_viewer']);
      }

      if (requiredRole === 'org_admin') {
        // org_admin access: only org_admin qualifies
        return await this.rbacService.hasOrgRole(userId, organizationId, ['org_admin']);
      }

      // For any other role, check exact match
      return await this.rbacService.hasOrgRole(userId, organizationId, [requiredRole]);
    } catch (error) {
      return false;
    }
  }

  /**
   * Upload organization logo
   */
  async uploadOrganizationLogo(organizationId: string, logoData: OrganizationLogoData): Promise<ServiceResult<{ organization: any }>> {
    try {
      const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
      if (!organization) {
        return {
          success: false,
          error: 'Organization not found.'
        };
      }

      const { filename, mimetype, size, data } = logoData;

      // Remove any existing logo for this organization
      await prisma.organizationLogo.deleteMany({ where: { organizationId } });

      // Store new logo in DB
      await prisma.organizationLogo.create({
        data: {
          organizationId,
          filename,
          mimetype,
          size,
          data,
        },
      });

      return {
        success: true,
        data: { organization }
      };
    } catch (error: any) {
      logger().error('Error uploading organization logo:', error);
      return {
        success: false,
        error: 'Failed to upload logo.'
      };
    }
  }

  /**
   * Get organization logo
   */
  async getOrganizationLogo(organizationId: string): Promise<ServiceResult<{ filename: string; mimetype: string; data: Buffer }>> {
    try {
      const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
      if (!organization) {
        return {
          success: false,
          error: 'Organization not found.'
        };
      }

      const logo = await prisma.organizationLogo.findUnique({
        where: { organizationId },
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
      logger().error('Error fetching organization logo:', error);
      return {
        success: false,
        error: 'Failed to fetch logo.'
      };
    }
  }

  /**
   * Create organization invite link
   */
  async createInviteLink(
    organizationId: string,
    createdByUserId: string,
    role: OrganizationRole,
    maxUses?: number,
    expiresAt?: Date,
    note?: string
  ): Promise<ServiceResult<{ inviteLink: OrganizationInviteLink & { url: string } }>> {
    try {
      // Generate unique code
      const code = require('crypto').randomBytes(16).toString('hex');
      
      const inviteLink = await prisma.organizationInviteLink.create({
        data: {
          organizationId,
          code,
          createdByUserId,
          role,
          maxUses,
          expiresAt,
          note,
        },
      });

      const url = `${process.env.FRONTEND_BASE_URL || 'http://localhost:3000'}/org-invite/${code}`;

      // Log organization invite creation
      await logAudit({
        action: 'organization_invite_created',
        targetType: 'OrganizationInviteLink',
        targetId: inviteLink.id,
        userId: createdByUserId
      });

      return {
        success: true,
        data: { 
          inviteLink: {
            ...inviteLink,
            url
          }
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to create invite link: ${error.message}`,
      };
    }
  }

  /**
   * Get organization invite links
   */
  async getInviteLinks(
    organizationId: string
  ): Promise<ServiceResult<{ inviteLinks: (OrganizationInviteLink & { url: string })[] }>> {
    try {
      const inviteLinks = await prisma.organizationInviteLink.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });

      const inviteLinksWithUrls = inviteLinks.map(invite => ({
        ...invite,
        url: `${process.env.FRONTEND_BASE_URL || 'http://localhost:3000'}/org-invite/${invite.code}`
      }));

      return {
        success: true,
        data: { inviteLinks: inviteLinksWithUrls },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to get invite links: ${error.message}`,
      };
    }
  }

  /**
   * Update invite link (disable/enable)
   */
  async updateInviteLink(
    inviteId: string,
    disabled: boolean
  ): Promise<ServiceResult<{ inviteLink: OrganizationInviteLink }>> {
    try {
      const inviteLink = await prisma.organizationInviteLink.update({
        where: { id: inviteId },
        data: { disabled },
      });

      // Log organization invite update
      await logAudit({
        action: disabled ? 'organization_invite_disabled' : 'organization_invite_enabled',
        targetType: 'OrganizationInviteLink',
        targetId: inviteId
      });

      return {
        success: true,
        data: { inviteLink },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to update invite link: ${error.message}`,
      };
    }
  }

  /**
   * Use invite link to join organization
   */
  async useInviteLink(
    code: string,
    userId: string
  ): Promise<ServiceResult<{ organization: Organization; membership: OrganizationMembership }>> {
    try {
      const inviteLink = await prisma.organizationInviteLink.findUnique({
        where: { code },
        include: { organization: true },
      });

      if (!inviteLink) {
        return {
          success: false,
          error: 'Invalid invite code',
        };
      }

      if (inviteLink.disabled) {
        return {
          success: false,
          error: 'This invite link has been disabled',
        };
      }

      if (inviteLink.expiresAt && inviteLink.expiresAt < new Date()) {
        return {
          success: false,
          error: 'This invite link has expired',
        };
      }

      if (inviteLink.maxUses && inviteLink.useCount >= inviteLink.maxUses) {
        return {
          success: false,
          error: 'This invite link has reached its maximum usage limit',
        };
      }

      // Check if user already has any role in this organization using unified RBAC
      const hasExistingRole = await this.rbacService.hasOrgRole(userId, inviteLink.organizationId);
      
      if (hasExistingRole) {
        return {
          success: false,
          error: 'You are already a member of this organization',
        };
      }

      // Convert legacy role name to unified role name
      const unifiedRoleName = inviteLink.role === 'org_admin' ? 'org_admin' : 'org_viewer';

      // Grant role using unified RBAC and increment use count
      await prisma.$transaction(async (tx) => {
        // Grant the role using unified RBAC
        await this.rbacService.grantRole(
          userId,
          unifiedRoleName,
          'organization',
          inviteLink.organizationId,
          inviteLink.createdByUserId
        );

        // Increment use count
        await tx.organizationInviteLink.update({
          where: { id: inviteLink.id },
          data: { useCount: { increment: 1 } },
        });
      });

      // Create synthetic membership object for backward compatibility
      const syntheticMembership: OrganizationMembership = {
        id: `synthetic-${userId}-${inviteLink.organizationId}`,
        organizationId: inviteLink.organizationId,
        userId,
        role: inviteLink.role,
        createdById: inviteLink.createdByUserId,
        createdAt: new Date(),
      };

      return {
        success: true,
        data: { 
          organization: inviteLink.organization,
          membership: syntheticMembership
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to use invite link: ${error.message}`,
      };
    }
  }
} 