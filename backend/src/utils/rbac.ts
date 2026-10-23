import { Request, Response, NextFunction } from "express";
import { UnifiedRBACService } from "../services/unified-rbac.service";
import { EventService } from "../services/event.service";
import { createPrismaClient } from '../config/prisma-client';
import logger from '../config/logger';

const prisma = createPrismaClient();
const unifiedRBAC = new UnifiedRBACService(prisma);

/**
 * User object structure expected in authenticated requests
 */
interface User {
  id: string;
  email: string;
  name: string;
}

/**
 * Legacy role names mapping to new unified role names
 */
const ROLE_MAPPING: Record<string, string> = {
  'SuperAdmin': 'system_admin',
  'Event Admin': 'event_admin',
  'Responder': 'responder',
  'Reporter': 'reporter',
  'org_admin': 'org_admin',
  'org_viewer': 'org_viewer'
};

/**
 * All supported role names (unified system)
 */
type RoleName = "system_admin" | "event_admin" | "responder" | "reporter" | "org_admin" | "org_viewer";

/**
 * Middleware to require a user to have one of the allowed roles.
 * Now uses the unified RBAC system with proper role inheritance.
 * 
 * @param allowedRoles - Array of role names that are allowed to access the resource
 * @returns Express middleware function
 */
export function requireRole(allowedRoles: RoleName[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = req.params as Record<string, string>;
      
      // Extract eventId from params (could be 'eventId' or 'id')
      let eventId = params.eventId || params.id;
      
      // If no eventId but we have a slug, try to get eventId from slug
      if (!eventId && params.slug) {
        try {
          const eventService = new EventService(prisma);
          const foundEventId = await eventService.getEventIdBySlug(params.slug);
          if (foundEventId) {
            eventId = foundEventId;
          }
        } catch (error) {
          logger().error('[RBAC] Error fetching eventId by slug:', error);
        }
      }
      
      // Check authentication
      if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const user = req.user as any;

      // Map legacy role names to new role names
      const mappedRoles = allowedRoles.map(role => ROLE_MAPPING[role] || role);

      // Check system admin access first (system admins can access everything)
      if (mappedRoles.includes('system_admin')) {
        const isSystemAdmin = await unifiedRBAC.isSystemAdmin(user.id);
        if (isSystemAdmin) {
          next();
          return;
        }
      }

      // For event-specific routes, check event roles with inheritance
      if (eventId) {
        const hasEventRole = await unifiedRBAC.hasEventRole(user.id, eventId, mappedRoles);
        if (hasEventRole) {
          next();
          return;
        }
      } else {
        // For non-event-specific routes, check if user has any of the required roles across all scopes
        const hasAnyRole = await Promise.all([
          unifiedRBAC.hasRole(user.id, mappedRoles, 'system', 'SYSTEM'),
          unifiedRBAC.hasRole(user.id, mappedRoles, 'organization'),
          unifiedRBAC.hasRole(user.id, mappedRoles, 'event')
        ]);

        if (hasAnyRole.some(Boolean)) {
          next();
          return;
        }
      }

      res.status(403).json({ error: "Forbidden: insufficient role" });
      return;
    } catch (err: any) {
      logger().error('[RBAC] Error in requireRole middleware:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware to require a user to be a System Admin (replaces SuperAdmin).
 * System Admins have access to all system-level operations.
 * 
 * @returns Express middleware function
 */
export function requireSystemAdmin() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      const user = req.user as any;
      const isSystemAdmin = await unifiedRBAC.isSystemAdmin(user.id);
      
      if (!isSystemAdmin) {
        res.status(403).json({ error: "Forbidden: System Admins only" });
        return;
      }
      
      next();
    } catch (err: any) {
      logger().error('[RBAC] Error in requireSystemAdmin middleware:', err);
      res
        .status(500)
        .json({ error: "System Admin check failed", details: err.message });
    }
  };
}

/**
 * Legacy function name for backward compatibility
 * @deprecated Use requireSystemAdmin instead
 */
export const requireSuperAdmin = requireSystemAdmin;

/**
 * Middleware to require organization-level roles
 */
export function requireOrgRole(allowedRoles: string[], organizationId?: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      const user = req.user as any;
      const orgId = organizationId || req.params.organizationId || req.params.orgId;

      if (!orgId) {
        res.status(400).json({ error: "Organization ID required" });
        return;
      }

      const hasOrgRole = await unifiedRBAC.hasOrgRole(user.id, orgId, allowedRoles);
      
      if (!hasOrgRole) {
        res.status(403).json({ error: "Forbidden: insufficient organization role" });
        return;
      }
      
      next();
    } catch (err: any) {
      logger().error('[RBAC] Error in requireOrgRole middleware:', err);
      res.status(500).json({ error: "Organization role check failed", details: err.message });
    }
  };
}

/**
 * Middleware to require event-level roles (with org admin inheritance)
 */
export function requireEventRole(allowedRoles: string[], eventId?: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      const user = req.user as any;
      let eventIdToCheck = eventId || req.params.eventId || req.params.id;

      // If no eventId but we have a slug, try to get eventId from slug
      if (!eventIdToCheck && req.params.slug) {
        const eventService = new EventService(prisma);
        const foundEventId = await eventService.getEventIdBySlug(req.params.slug);
        if (foundEventId) {
          eventIdToCheck = foundEventId;
        }
      }

      if (!eventIdToCheck) {
        res.status(400).json({ error: "Event ID required" });
        return;
      }

      const hasEventRole = await unifiedRBAC.hasEventRole(user.id, eventIdToCheck, allowedRoles);
      
      if (!hasEventRole) {
        res.status(403).json({ error: "Forbidden: insufficient event role" });
        return;
      }
      
      next();
    } catch (err: any) {
      logger().error('[RBAC] Error in requireEventRole middleware:', err);
      res.status(500).json({ error: "Event role check failed", details: err.message });
    }
  };
} 