import logger from '../config/logger';
import { prisma } from '../config/database';

/**
 * Parameters for logging an audit event
 */
export interface AuditLogParams {
  /** The event/tenant ID (optional for organization-level actions) */
  eventId?: string | null;
  /** The user performing the action (optional for anonymous actions) */
  userId?: string | null;
  /** The action performed (e.g., 'incident_created', 'user_assigned') */
  action: string;
  /** The type of entity affected (e.g., 'Incident', 'User', 'Event') */
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
  const { eventId, userId, action, targetId } = params;

  // Normalize targetType: map any legacy 'report' casing to 'Incident'
  const normalizedTargetType = params.targetType && params.targetType.toLowerCase() === 'report'
    ? 'Incident'
    : params.targetType;

  // Normalize legacy action names to incident_* variants
  const actionMap: Record<string, string> = {
    report_created: 'incident_created',
    report_state_changed: 'incident_state_changed',
    report_assigned: 'incident_assigned',
  };
  const normalizedAction = actionMap[action] || action;

  if (!normalizedAction || !normalizedTargetType || !targetId) {
    throw new Error('Missing required fields: action, targetType, and targetId are required');
  }

  return prisma.auditLog.create({
    data: {
      eventId: eventId || undefined,
      userId: userId ?? null,
      action: normalizedAction,
      targetType: normalizedTargetType,
      targetId,
    },
  });
}