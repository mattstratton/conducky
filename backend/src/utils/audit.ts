import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Parameters for logging an audit event
 */
export interface AuditLogParams {
  /** The event/tenant ID */
  eventId: string;
  /** The user performing the action (optional for anonymous actions) */
  userId?: string | null;
  /** The action performed (e.g., 'report_created', 'user_assigned') */
  action: string;
  /** The type of entity affected (e.g., 'Report', 'User', 'Event') */
  targetType: string;
  /** The ID of the entity affected */
  targetId: string;
}

/**
 * Log an audit event to track system actions
 * @param params - Audit log parameters
 * @returns Promise resolving to the created audit log entry
 * @throws Error if required fields are missing
 */
export async function logAudit(params: AuditLogParams): Promise<any> {
  const { eventId, userId, action, targetType, targetId } = params;

  if (!eventId || !action || !targetType || !targetId) {
    throw new Error('Missing required fields: eventId, action, targetType, and targetId are required');
  }

  return prisma.auditLog.create({
    data: {
      eventId,
      userId: userId ?? null,
      action,
      targetType,
      targetId,
    },
  });
} 