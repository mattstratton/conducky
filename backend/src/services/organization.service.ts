import { PrismaClient, Organization, OrganizationMembership, OrganizationRole } from '@prisma/client';
import { ServiceResult } from '../types';

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

export interface OrganizationWithMemberships extends Organization {
  memberships: (OrganizationMembership & {
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  })[];
  _count: {
    events: number;
    memberships: number;
  };
}

export class OrganizationService {
  /**
   * Create a new organization
   */
  async createOrganization(
    data: CreateOrganizationData,
    createdById: string
  ): Promise<ServiceResult<{ organization: Organization }>> {
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

      // Automatically add creator as org admin
      await prisma.organizationMembership.create({
        data: {
          organizationId: organization.id,
          userId: createdById,
          role: 'org_admin',
          createdById,
        },
      });

      return {
        success: true,
        data: { organization },
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
  ): Promise<ServiceResult<{ organization: OrganizationWithMemberships }>> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              events: true,
              memberships: true,
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

      return {
        success: true,
        data: { organization },
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
  ): Promise<ServiceResult<{ organization: OrganizationWithMemberships }>> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { slug },
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              events: true,
              memberships: true,
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

      return {
        success: true,
        data: { organization },
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
   * List all organizations (SuperAdmin only)
   */
  async listOrganizations(): Promise<ServiceResult<{ organizations: OrganizationWithMemberships[] }>> {
    try {
      const organizations = await prisma.organization.findMany({
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              events: true,
              memberships: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: { organizations },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to list organizations: ${error.message}`,
      };
    }
  }

  /**
   * Add member to organization
   */
  async addMember(
    organizationId: string,
    userId: string,
    role: OrganizationRole,
    createdById: string
  ): Promise<ServiceResult<{ membership: OrganizationMembership }>> {
    try {
      // Check if user is already a member
      const existingMembership = await prisma.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId,
          },
        },
      });

      if (existingMembership) {
        return {
          success: false,
          error: 'User is already a member of this organization',
        };
      }

      const membership = await prisma.organizationMembership.create({
        data: {
          organizationId,
          userId,
          role,
          createdById,
        },
      });

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
   * Update member role
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: OrganizationRole
  ): Promise<ServiceResult<{ membership: OrganizationMembership }>> {
    try {
      const membership = await prisma.organizationMembership.update({
        where: {
          organizationId_userId: {
            organizationId,
            userId,
          },
        },
        data: { role },
      });

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
   * Remove member from organization
   */
  async removeMember(
    organizationId: string,
    userId: string
  ): Promise<ServiceResult<{ message: string }>> {
    try {
      await prisma.organizationMembership.delete({
        where: {
          organizationId_userId: {
            organizationId,
            userId,
          },
        },
      });

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
   * Get user's organizations
   */
  async getUserOrganizations(
    userId: string
  ): Promise<ServiceResult<{ organizations: (Organization & { membership: OrganizationMembership })[] }>> {
    try {
      const memberships = await prisma.organizationMembership.findMany({
        where: { userId },
        include: {
          organization: true,
        },
      });

      const organizations = memberships.map(membership => ({
        ...membership.organization,
        membership: {
          id: membership.id,
          organizationId: membership.organizationId,
          userId: membership.userId,
          role: membership.role,
          createdAt: membership.createdAt,
          createdById: membership.createdById,
        },
      }));

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
   * Check if user has organization role
   */
  async hasOrganizationRole(
    userId: string,
    organizationId: string,
    requiredRole?: OrganizationRole
  ): Promise<boolean> {
    try {
      const membership = await prisma.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId,
          },
        },
      });

      if (!membership) {
        return false;
      }

      if (!requiredRole) {
        return true; // Just check if they're a member
      }

      // Check specific role (org_admin has higher privileges than org_viewer)
      if (requiredRole === 'org_viewer') {
        return membership.role === 'org_admin' || membership.role === 'org_viewer';
      }

      return membership.role === requiredRole;
    } catch (error) {
      return false;
    }
  }
} 