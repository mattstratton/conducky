import { Request, Response, NextFunction } from 'express';
import { unifiedRBAC } from '../services/unified-rbac.service';
import { RoleScope } from '../generated/prisma/client';
import logger from '../config/logger';
import { createPrismaClient } from '../config/prisma-client';

// One client for the module. This used to build a new client (and connection pool)
// on every request that resolved an event slug, and never disconnected it.
const prisma = createPrismaClient();

/**
 * Unified RBAC Middleware
 * Replaces the old separate role checking systems with a single unified approach
 */

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    [key: string]: any;
  };
}

/**
 * Require system admin role
 */
export function requireSystemAdmin() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const isSystemAdmin = await unifiedRBAC.isSystemAdmin(req.user.id);
      
      if (!isSystemAdmin) {
        return res.status(403).json({ error: 'System admin access required' });
      }

      next();
    } catch (error) {
      logger().error('[UnifiedRBAC Middleware] Error checking system admin:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Require organization role
 */
export function requireOrgRole(roleNames: string[] = ['org_admin', 'org_viewer']) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Extract organization ID from params
      const organizationId = req.params.organizationId || req.params.orgId;
      
      if (!organizationId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      const hasRole = await unifiedRBAC.hasOrgRole(req.user.id, organizationId, roleNames);
      
      if (!hasRole) {
        return res.status(403).json({ 
          error: `Organization role required: ${roleNames.join(', ')}` 
        });
      }

      next();
    } catch (error) {
      logger().error('[UnifiedRBAC Middleware] Error checking org role:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Require organization admin role specifically
 */
export function requireOrgAdmin() {
  return requireOrgRole(['org_admin']);
}

/**
 * Require event role
 */
export function requireEventRole(roleNames: string[] = ['event_admin', 'responder', 'reporter']) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Extract event ID from params or slug
      let eventId = req.params.eventId;
      
      // Check if eventId is actually a slug (not a UUID format)
      const isUUID = eventId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
      
      // If we have a slug instead of ID, or if eventId looks like a slug, look it up
      if (!eventId || !isUUID || req.params.eventSlug || req.params.slug) {
        
        const slug = req.params.eventSlug || req.params.slug || (!isUUID ? eventId : null);
        if (slug) {
          const event = await prisma.event.findUnique({
            where: { slug: slug },
            select: { id: true }
          });
          
          if (!event) {
            return res.status(404).json({ error: 'Event not found' });
          }
          
          eventId = event.id;
        }
      }
      
      if (!eventId) {
        return res.status(400).json({ error: 'Event ID or slug required' });
      }

      const hasRole = await unifiedRBAC.hasEventRole(req.user.id, eventId, roleNames);
      
      if (!hasRole) {
        return res.status(403).json({ 
          error: `Event role required: ${roleNames.join(', ')}` 
        });
      }

      // Store eventId in request for use by controllers
      req.params.eventId = eventId;
      
      next();
    } catch (error) {
      logger().error('[UnifiedRBAC Middleware] Error checking event role:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Require event admin role specifically
 */
export function requireEventAdmin() {
  return requireEventRole(['event_admin']);
}

/**
 * Require responder role or higher
 */
export function requireResponder() {
  return requireEventRole(['event_admin', 'responder']);
}

/**
 * Generic role requirement middleware
 */
export function requireUnifiedRole(
  roleNames: string[],
  scopeType?: RoleScope,
  scopeIdParam?: string
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      let scopeId: string | undefined;
      
      if (scopeType && scopeIdParam) {
        scopeId = req.params[scopeIdParam];
        
        if (!scopeId) {
          return res.status(400).json({ error: `${scopeIdParam} parameter required` });
        }
      } else if (scopeType === 'system') {
        scopeId = 'SYSTEM';
      }

      const hasRole = await unifiedRBAC.hasRole(req.user.id, roleNames, scopeType, scopeId);
      
      if (!hasRole) {
        return res.status(403).json({ 
          error: `Required role: ${roleNames.join(', ')}` 
        });
      }

      next();
    } catch (error) {
      logger().error('[UnifiedRBAC Middleware] Error checking unified role:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Check if user has minimum role level
 */
export function requireMinimumLevel(
  minLevel: number,
  scopeType?: RoleScope,
  scopeIdParam?: string
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      let scopeId: string | undefined;
      
      if (scopeType && scopeIdParam) {
        scopeId = req.params[scopeIdParam];
        
        if (!scopeId) {
          return res.status(400).json({ error: `${scopeIdParam} parameter required` });
        }
      } else if (scopeType === 'system') {
        scopeId = 'SYSTEM';
      }

      const hasLevel = await unifiedRBAC.hasMinimumLevel(req.user.id, minLevel, scopeType, scopeId);
      
      if (!hasLevel) {
        return res.status(403).json({ 
          error: `Insufficient permission level (required: ${minLevel})` 
        });
      }

      next();
    } catch (error) {
      logger().error('[UnifiedRBAC Middleware] Error checking minimum level:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
} 