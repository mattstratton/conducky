import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Parameters for logging an audit event
 */
export interface AuditLogParams {
  /** The event/tenant ID (optional for organization-level actions) */
  eventId?: string | null;
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

  if (!action || !targetType || !targetId) {
    throw new Error('Missing required fields: action, targetType, and targetId are required');
  }

  return prisma.auditLog.create({
    data: {
      eventId: eventId || undefined,
      userId: userId ?? null,
      action,
      targetType,
      targetId,
    },
  });
} 