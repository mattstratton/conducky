import { PrismaClient } from '@prisma/client';
import logger from '../config/logger';

// Follow the same pattern as organization.service.ts
const defaultPrisma = new PrismaClient();

// Type definitions for better type safety
type RoleScope = 'system' | 'organization' | 'event';

// Interface for user role data with proper typing
interface UserRoleWithDetails {
  userId: string;
  roleId: string;
  scopeType: RoleScope;
  scopeId: string;
  grantedAt: Date;
  grantedById: string | null;
  role: {
    id: string;
    name: string;
    level: number;
  };
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
}

// Simple cache for user roles to improve performance
interface UserRoleCache {
  roles: UserRoleWithDetails[];
  timestamp: number;
}

/**
 * Unified RBAC Service
 * Handles all role-based access control using the new unified role system
 */
export class UnifiedRBACService {
  private prisma: PrismaClient;
  private userRoleCache = new Map<string, UserRoleCache>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }

  /**
   * Get user roles with caching for performance optimization
   * @param userId - The user ID to get roles for
   * @returns Promise<UserRoleWithDetails[]> - Array of user roles with role details
   */
  private async getCachedUserRoles(userId: string): Promise<UserRoleWithDetails[]> {
    const now = Date.now();
    const cached = this.userRoleCache.get(userId);
    
    // Return cached roles if still valid
    if (cached && (now - cached.timestamp) < this.CACHE_TTL_MS) {
      return cached.roles;
    }

    // Fetch fresh roles from database
    const roles = await (this.prisma as any).userRole.findMany({
      where: { userId },
      include: {
        role: true
      }
    });

    // Cache the results
    this.userRoleCache.set(userId, {
      roles,
      timestamp: now
    });

    return roles;
  }

  /**
   * Clear cache for a specific user (call this when user roles change)
   * @param userId - The user ID to clear cache for
   */
  clearUserCache(userId: string): void {
    this.userRoleCache.delete(userId);
  }

  /**
   * Clear all cached user roles
   */
  clearAllCache(): void {
    this.userRoleCache.clear();
  }

  /**
   * Check if user has any of the specified roles in the given scope
   * @param userId - The user ID to check roles for
   * @param roleNames - Array of role names to check for
   * @param scopeType - Optional scope type to filter by (system, organization, event)
   * @param scopeId - Optional scope ID to filter by
   * @returns Promise<boolean> - True if user has any of the specified roles
   */
  async hasRole(
    userId: string,
    roleNames: string[],
    scopeType?: RoleScope,
    scopeId?: string
  ): Promise<boolean> {
    try {
      const userRoles = await this.getUserRoles(userId, scopeType, scopeId);
      return userRoles.some((userRole: UserRoleWithDetails) => roleNames.includes(userRole.role.name));
    } catch (error) {
      // Log error safely without exposing sensitive details
      if (process.env.NODE_ENV === 'development') {
        logger().error('[UnifiedRBAC] Error checking role:', error);
      }
      return false;
    }
  }

  /**
   * Check if user is system admin
   * @param userId - The user ID to check
   * @returns Promise<boolean> - True if user is a system admin
   */
  async isSystemAdmin(userId: string): Promise<boolean> {
    return this.hasRole(userId, ['system_admin'], 'system', 'SYSTEM');
  }

  /**
   * Check if user has organization role (with system admin override)
   * @param userId - The user ID to check
   * @param organizationId - The organization ID to check permissions for
   * @param roleNames - Array of role names to check for (defaults to org_admin and org_viewer)
   * @returns Promise<boolean> - True if user has required organization role or is system admin
   */
  async hasOrgRole(
    userId: string,
    organizationId: string,
    roleNames: string[] = ['org_admin', 'org_viewer']
  ): Promise<boolean> {
    return this.hasRole(userId, roleNames, 'organization', organizationId);
  }

  /**
   * Check if user has event role (explicit roles only)
   * Rules:
   * - System admins are allowed
   * - Direct event roles are required for event access (no org-admin inheritance)
   * 
   * @param userId - The user ID to check permissions for
   * @param eventId - The event ID to check permissions against
   * @param roleNames - Array of roles that satisfy the permission check (defaults to event_admin, responder, reporter)
   * @returns Promise<boolean> - True if user has required event permissions
   */
  async hasEventRole(
    userId: string,
    eventId: string,
    roleNames: string[] = ['event_admin', 'responder', 'reporter']
  ): Promise<boolean> {
    try {
      // Optimized: Use cached user roles
      const userRoles = await this.getCachedUserRoles(userId);

      

      // Check if user is system admin (from cached roles)
      const isSystemAdmin = userRoles.some((ur: UserRoleWithDetails) => 
        ur.role.name === 'system_admin' && ur.scopeType === 'system'
      );
      
      
      
      if (isSystemAdmin) {
        return true;
      }

      // Check direct event roles (from cached roles)
      const hasDirectRole = userRoles.some((ur: UserRoleWithDetails) => 
        ur.scopeType === 'event' && 
        ur.scopeId === eventId && 
        roleNames.includes(ur.role.name)
      );
      
      
      
      if (hasDirectRole) {
        return true;
      }

      // No organization-admin inheritance: explicit event roles are required
      return false;
    } catch (error) {
      // Remove this line entirely
      if (process.env.NODE_ENV === 'development') {
        logger().error('[UnifiedRBAC] Error checking event role:', error);
      }
      return false;
    }
  }

  /**
   * Get user's roles for a specific scope
   */
  async getUserRoles(
    userId: string,
    scopeType?: RoleScope,
    scopeId?: string
  ) {
    const where: any = { userId };
    
    if (scopeType) {
      where.scopeType = scopeType;
    }
    
    if (scopeId) {
      where.scopeId = scopeId;
    }
    
    return (this.prisma as any).userRole.findMany({
      where,
      include: {
        role: true,
        user: true
      }
    });
  }

  /**
   * Get all roles for a user (for frontend display)
   */
  async getAllUserRoles(userId: string) {
    const userRoles = await (this.prisma as any).userRole.findMany({
      where: { userId },
      include: {
        role: true
      }
    });

    // Group by scope for easier frontend consumption
    const rolesByScope = {
      system: userRoles.filter((ur: any) => ur.scopeType === 'system').map((ur: any) => ur.role.name),
      organizations: {} as Record<string, string[]>,
      events: {} as Record<string, string[]>
    };

    // Group organization roles
    userRoles
      .filter((ur: any) => ur.scopeType === 'organization')
      .forEach((ur: any) => {
        if (!rolesByScope.organizations[ur.scopeId]) {
          rolesByScope.organizations[ur.scopeId] = [];
        }
        rolesByScope.organizations[ur.scopeId].push(ur.role.name);
      });

    // Group event roles
    userRoles
      .filter((ur: any) => ur.scopeType === 'event')
      .forEach((ur: any) => {
        if (!rolesByScope.events[ur.scopeId]) {
          rolesByScope.events[ur.scopeId] = [];
        }
        rolesByScope.events[ur.scopeId].push(ur.role.name);
      });

    return rolesByScope;
  }

  /**
   * Grant a role to a user
   */
  async grantRole(
    userId: string,
    roleName: string,
    scopeType: RoleScope,
    scopeId: string,
    grantedBy?: string
  ): Promise<boolean> {
    try {
      const role = await (this.prisma as any).unifiedRole.findUnique({
        where: { name: roleName }
      });

      if (!role) {
        // Don't log the role name to prevent information disclosure
        if (process.env.NODE_ENV === 'development') {
          logger().error(`[UnifiedRBAC] Role not found: ${roleName}`);
        }
        return false;
      }

      await (this.prisma as any).userRole.upsert({
        where: {
          user_role_unique: {
            userId,
            roleId: role.id,
            scopeType,
            scopeId
          }
        },
        update: {
          grantedById: grantedBy,
          grantedAt: new Date()
        },
        create: {
          userId,
          roleId: role.id,
          scopeType,
          scopeId,
          grantedById: grantedBy,
          grantedAt: new Date()
        }
      });

      // Clear cache for this user since their roles have changed
      this.clearUserCache(userId);

      return true;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger().error('[UnifiedRBAC] Error granting role:', error);
      }
      return false;
    }
  }

  /**
   * Revoke a role from a user
   */
  async revokeRole(
    userId: string,
    roleName: string,
    scopeType: RoleScope,
    scopeId: string
  ): Promise<boolean> {
    try {
      const role = await (this.prisma as any).unifiedRole.findUnique({
        where: { name: roleName }
      });

      if (!role) {
        // Don't log the role name to prevent information disclosure
        if (process.env.NODE_ENV === 'development') {
          logger().error(`[UnifiedRBAC] Role not found: ${roleName}`);
        }
        return false;
      }

      await (this.prisma as any).userRole.deleteMany({
        where: {
          userId,
          roleId: role.id,
          scopeType,
          scopeId
        }
      });

      // Clear cache for this user since their roles have changed
      this.clearUserCache(userId);

      return true;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger().error('[UnifiedRBAC] Error revoking role:', error);
      }
      return false;
    }
  }

  /**
   * Get role hierarchy level for permission comparison
   */
  async getRoleLevel(roleName: string): Promise<number> {
    try {
      const role = await (this.prisma as any).unifiedRole.findUnique({
        where: { name: roleName }
      });
      return role?.level || 0;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger().error('[UnifiedRBAC] Error getting role level:', error);
      }
      return 0;
    }
  }

  /**
   * Check if user has minimum role level in scope
   */
  async hasMinimumLevel(
    userId: string,
    minLevel: number,
    scopeType?: RoleScope,
    scopeId?: string
  ): Promise<boolean> {
    try {
      const userRoles = await this.getUserRoles(userId, scopeType, scopeId);
      const maxLevel = Math.max(...userRoles.map((ur: any) => ur.role.level));
      return maxLevel >= minLevel;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger().error('[UnifiedRBAC] Error checking minimum level:', error);
      }
      return false;
    }
  }


}

// Export singleton instance
export const unifiedRBAC = new UnifiedRBACService(); 