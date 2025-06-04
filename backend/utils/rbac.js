const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Middleware to require a user to have one of the allowed roles for an event.
 * Usage: requireRole(['Admin', 'Responder'])
 */
function requireRole(allowedRoles) {
  return async (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    // Get eventId from query, body, or params
    const eventId = req.query.eventId || req.body.eventId || req.params.eventId;
    if (!eventId) {
      return res.status(400).json({ error: 'Missing eventId' });
    }
    try {
      // Check for SuperAdmin role globally
      const allUserRoles = await prisma.userEventRole.findMany({
        where: { userId: req.user.id },
        include: { role: true },
      });
      const isSuperAdmin = allUserRoles.some(uer => uer.role.name === 'SuperAdmin');
      if (isSuperAdmin) {
        return next();
      }
      // Otherwise, check for allowed roles for this event
      const userRoles = allUserRoles.filter(uer => uer.eventId === eventId);
      const hasRole = userRoles.some(uer => allowedRoles.includes(uer.role.name));
      if (!hasRole) {
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: 'RBAC check failed', details: err.message });
    }
  };
}

/**
 * Middleware to require a user to be a Super Admin (global role).
 */
function requireSuperAdmin() {
  return async (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
      const userRoles = await prisma.userEventRole.findMany({
        where: {
          userId: req.user.id,
        },
        include: { role: true },
      });
      const isSuperAdmin = userRoles.some(uer => uer.role.name === 'SuperAdmin');
      if (!isSuperAdmin) {
        return res.status(403).json({ error: 'Forbidden: Super Admins only' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: 'Super Admin check failed', details: err.message });
    }
  };
}

module.exports = { requireRole, requireSuperAdmin }; 