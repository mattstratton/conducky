const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Log an audit event
 * @param {Object} params
 * @param {string} params.eventId - The event/tenant ID
 * @param {string} [params.userId] - The user performing the action (optional)
 * @param {string} params.action - The action performed (e.g., 'report_created')
 * @param {string} params.targetType - The type of entity affected (e.g., 'Report', 'User')
 * @param {string} params.targetId - The ID of the entity affected
 */
async function logAudit({ eventId, userId, action, targetType, targetId }) {
  if (!eventId || !action || !targetType || !targetId) {
    throw new Error("Missing required fields");
  }
  return prisma.auditLog.create({
    data: {
      eventId,
      userId,
      action,
      targetType,
      targetId,
    },
  });
}

module.exports = { logAudit };
