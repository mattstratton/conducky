import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

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
 * Express Request with Passport.js authentication extensions
 */
interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Role names supported by the RBAC system
 */
type RoleName = "SuperAdmin" | "Admin" | "Responder" | "Reporter";

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
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    console.log("[RBAC DEBUG] Function entry");
    console.log("[RBAC DEBUG] req.params:", req.params);
    
    const params = typeof req.params === "object" && req.params !== null ? req.params : {};
    console.log("[RBAC DEBUG] params:", params);
    
    let eventId: string | undefined =
      (req.query?.eventId as string) ||
      (req.body?.eventId as string) ||
      (params.eventId as string);
    
    console.log("[RBAC DEBUG] eventId after assignment:", eventId);

    // If eventId is missing but reportId is present, fetch the report to get eventId
    if (!eventId && params.reportId) {
      try {
        console.log(
          "[RBAC DEBUG] eventId missing, trying to fetch report for reportId:",
          params.reportId,
        );
        const report = await prisma.report.findUnique({
          where: { id: params.reportId as string },
        });
        if (report) {
          eventId = report.eventId;
          console.log(
            "[RBAC DEBUG] Found eventId from report:",
            eventId,
            "for reportId:",
            params.reportId,
          );
        } else {
          console.log(
            "[RBAC DEBUG] No report found for reportId:",
            params.reportId,
          );
        }
      } catch (err) {
        console.log(
          "[RBAC DEBUG] Error fetching report for reportId:",
          params.reportId,
          err,
        );
      }
    }

    // If eventId is missing but slug is present, resolve eventId from slug
    if (!eventId && params.slug) {
      try {
        console.log(
          "[RBAC DEBUG] eventId missing, trying to fetch eventId for slug:",
          params.slug,
        );
        const event = await prisma.event.findUnique({
          where: { slug: params.slug as string },
        });
        if (event) {
          eventId = event.id;
          console.log(
            "[RBAC DEBUG] Found eventId from slug:",
            eventId,
            "for slug:",
            params.slug,
          );
        } else {
          console.log("[RBAC DEBUG] No event found for slug:", params.slug);
        }
      } catch (err) {
        console.log(
          "[RBAC DEBUG] Error fetching event for slug:",
          params.slug,
          err,
        );
      }
    }

    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    console.log("[RBAC] requireRole:", {
      url: req.url,
      method: req.method,
      params,
      query: req.query,
      body: req.body,
      eventId,
    });

    try {
      // Check for SuperAdmin role globally
      const allUserRoles = await prisma.userEventRole.findMany({
        where: { userId: req.user.id },
        include: { role: true },
      });
      
      console.log(
        "[RBAC DEBUG] allUserRoles:",
        JSON.stringify(allUserRoles, null, 2),
      );
      
      const isSuperAdmin = allUserRoles.some(
        (uer) => uer.role.name === "SuperAdmin",
      );
      
      if (allowedRoles.includes("SuperAdmin") && isSuperAdmin) {
        console.log("[RBAC DEBUG] User is SuperAdmin, access granted");
        return next();
      }

      // For non-SuperAdmin, require eventId
      if (!eventId) {
        console.log("[RBAC DEBUG] Missing eventId, returning 400");
        res.status(400).json({
          error:
            "Missing eventId (checked req.query, req.body, req.params, or derived from reportId or slug)",
        });
        return;
      }

      // Otherwise, check for allowed roles for this event
      const userRoles = allUserRoles.filter((uer) => uer.eventId === eventId);
      console.log(
        "[RBAC DEBUG] userRoles for event",
        eventId,
        ":",
        JSON.stringify(userRoles, null, 2),
      );
      console.log("[RBAC DEBUG] allowedRoles:", allowedRoles);
      
      const hasRole = userRoles.some((uer) =>
        allowedRoles.includes(uer.role.name as RoleName),
      );
      console.log("[RBAC DEBUG] hasRole:", hasRole);
      
      if (!hasRole) {
        console.log("[RBAC DEBUG] Forbidden: insufficient role");
        res.status(403).json({ error: "Forbidden: insufficient role" });
        return;
      }
      
      next();
    } catch (err: any) {
      res
        .status(500)
        .json({ error: "RBAC check failed", details: err.message });
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
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const userRoles = await prisma.userEventRole.findMany({
        where: {
          userId: req.user.id,
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