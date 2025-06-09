const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Middleware to require a user to have one of the allowed roles for an event.
 * Usage: requireRole(['Admin', 'Responder'])
 */
function requireRole(allowedRoles) {
  return async (req, res, next) => {
    console.log("[RBAC DEBUG] Function entry");
    console.log("[RBAC DEBUG] req.params:", req.params);
    const params =
      typeof req.params === "object" && req.params !== null ? req.params : {};
    console.log("[RBAC DEBUG] params:", params);
    let eventId =
      (req.query && req.query.eventId) ||
      (req.body && req.body.eventId) ||
      params.eventId;
    console.log("[RBAC DEBUG] eventId after assignment:", eventId);
    // If eventId is missing but reportId is present, fetch the report to get eventId
    if (!eventId && params.reportId) {
      try {
        console.log(
          "[RBAC DEBUG] eventId missing, trying to fetch report for reportId:",
          params.reportId,
        );
        const report = await prisma.report.findUnique({
          where: { id: params.reportId },
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
          where: { slug: params.slug },
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
      return res.status(401).json({ error: "Not authenticated" });
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
        return res.status(400).json({
          error:
            "Missing eventId (checked req.query, req.body, req.params, or derived from reportId or slug)",
        });
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
        allowedRoles.includes(uer.role.name),
      );
      console.log("[RBAC DEBUG] hasRole:", hasRole);
      if (!hasRole) {
        console.log("[RBAC DEBUG] Forbidden: insufficient role");
        return res.status(403).json({ error: "Forbidden: insufficient role" });
      }
      next();
    } catch (err) {
      res
        .status(500)
        .json({ error: "RBAC check failed", details: err.message });
    }
  };
}

/**
 * Middleware to require a user to be a Super Admin (global role).
 */
function requireSuperAdmin() {
  return async (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
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
        return res.status(403).json({ error: "Forbidden: Super Admins only" });
      }
      next();
    } catch (err) {
      res
        .status(500)
        .json({ error: "Super Admin check failed", details: err.message });
    }
  };
}

module.exports = { requireRole, requireSuperAdmin };
