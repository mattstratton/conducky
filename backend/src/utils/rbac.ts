import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { EventService } from "../services/event.service";

const prisma = new PrismaClient();

/**
 * User object structure expected in authenticated requests
 */
interface User {
  id: string;
  email: string;
  name: string;
}

/**
 * Role names supported by the RBAC system
 */
type RoleName = "SuperAdmin" | "Event Admin" | "Responder" | "Reporter";

/**
 * Middleware to require a user to have one of the allowed roles for an event.
 * Supports role checking at both global level (SuperAdmin) and event-specific level.
 * 
 * @param allowedRoles - Array of role names that are allowed to access the resource
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * app.get('/admin-endpoint', requireRole(['Admin', 'SuperAdmin']), handler);
 * ```
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
          console.error('[RBAC] Error fetching eventId by slug:', error);
        }
      }
      
      // Check authentication
      if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const user = req.user as any;

      // SuperAdmins can access anything
      if (allowedRoles.includes('SuperAdmin')) {
        const allUserRoles = await prisma.userEventRole.findMany({
          where: { userId: user.id },
          include: { role: true },
        });

        const isSuperAdmin = allUserRoles.some((uer) => uer.role.name === 'SuperAdmin');
        if (isSuperAdmin) {
          next();
          return;
        }
      }

      // For event-specific routes, check event-specific roles
      if (eventId) {
        const allUserRoles = await prisma.userEventRole.findMany({
          where: { userId: user.id },
          include: { role: true },
        });

        // Otherwise, check for allowed roles for this event
        const userRoles = allUserRoles.filter((uer) => uer.eventId === eventId);
        
        const hasRole = userRoles.some((uer) =>
          allowedRoles.includes(uer.role.name as RoleName),
        );
        
        if (!hasRole) {
          res.status(403).json({ error: "Forbidden: insufficient role" });
          return;
        }
        
        next();
      } else {
        // For non-event-specific routes, just check if user has any of the allowed roles
        const allUserRoles = await prisma.userEventRole.findMany({
          where: { userId: user.id },
          include: { role: true },
        });

        const hasRole = allUserRoles.some((uer) =>
          allowedRoles.includes(uer.role.name as RoleName),
        );

        if (!hasRole) {
          res.status(403).json({ error: "Forbidden: insufficient role" });
          return;
        }

        next();
      }
    } catch (err: any) {
      console.error('[RBAC] Error in requireRole middleware:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware to require a user to be a Super Admin (global role).
 * SuperAdmins have access to all system-level operations.
 * 
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * app.post('/admin/events', requireSuperAdmin(), createEventHandler);
 * ```
 */
export function requireSuperAdmin() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const user = req.user as any; // Type assertion for user with id property
      const userRoles = await prisma.userEventRole.findMany({
        where: {
          userId: user.id,
        },
        include: { role: true },
      });
      
      const isSuperAdmin = userRoles.some(
        (uer) => uer.role.name === "SuperAdmin",
      );
      
      if (!isSuperAdmin) {
        res.status(403).json({ error: "Forbidden: Super Admins only" });
        return;
      }
      
      next();
    } catch (err: any) {
      res
        .status(500)
        .json({ error: "Super Admin check failed", details: err.message });
    }
  };
} 