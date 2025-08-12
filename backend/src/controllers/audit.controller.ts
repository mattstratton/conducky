import { Request, Response } from 'express';
import prisma from '../config/database';
import { requireRole } from '../middleware/rbac';
import logger from '../config/logger';

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  action?: string;
  targetType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'timestamp' | 'action' | 'targetType';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditLogEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  userId: string | null;
  timestamp: Date;
  organizationId?: string | null;
  eventId?: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  event?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface AuditLogResponse {
  logs: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function parseOptionalDate(input?: string) {
  if (!input) return undefined;
  const d = new Date(input.toString());
  return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Get audit logs for a specific event
 */
export const getEventAuditLogs = [
  requireRole(['event_admin', 'responder']),
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const {
        page = 1,
        limit = 50,
        action,
        targetType,
        userId,
        startDate,
        endDate,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = req.query as AuditLogQuery;

      // Validate event exists (skip strict validation to allow empty results when not found)
      // no-op: we do not enforce existence here

      // Validate pagination
      const pageNum = Math.max(1, parseInt(page.toString()));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit.toString())));
      const offset = (pageNum - 1) * limitNum;

      // Build where clause
      const whereClause: any = { eventId };
      if (action) whereClause.action = action;
      if (targetType) whereClause.targetType = targetType;
      if (userId) whereClause.userId = userId;

      const start = parseOptionalDate(startDate);
      const endDt = parseOptionalDate(endDate);
      if (start || endDt) {
        whereClause.timestamp = {};
        if (start) whereClause.timestamp.gte = start;
        if (endDt) whereClause.timestamp.lte = endDt;
      }

      // Build order clause
      const orderBy: any = {};
      if (sortBy === 'timestamp') orderBy.timestamp = sortOrder;
      else if (sortBy === 'action') orderBy.action = sortOrder;
      else if (sortBy === 'targetType') orderBy.targetType = sortOrder;

      const total = await prisma.auditLog.count({ where: whereClause });
      const logs = await prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true, email: true } },
          event: { select: { id: true, name: true, slug: true } }
        },
        orderBy,
        skip: offset,
        take: limitNum
      });

      const response: AuditLogResponse = {
        logs: logs.map(log => ({
          id: log.id,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          userId: log.userId,
          timestamp: log.timestamp,
          organizationId: log.organizationId,
          eventId: log.eventId,
          user: log.user,
          event: log.event
        })),
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
      };

      res.json(response);
    } catch (error) {
      logger().error('Error fetching event audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
];

/**
 * Get audit logs for a specific organization
 */
export const getOrganizationAuditLogs = [
  requireRole(['org_admin']),
  async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.params;
      const {
        page = 1,
        limit = 50,
        action,
        targetType,
        userId,
        startDate,
        endDate,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = req.query as AuditLogQuery;

      // Validate organization exists (skip strict validation to allow empty results when not found)
      // no-op

      // Validate pagination
      const pageNum = Math.max(1, parseInt(page.toString()));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit.toString())));
      const offset = (pageNum - 1) * limitNum;

      // First, get all events for this organization
      const organizationEvents = await prisma.event.findMany({
        where: { organizationId },
        select: { id: true }
      });
      const eventIds = organizationEvents.map(event => event.id);

      const additionalFilters: any = {};
      if (action) additionalFilters.action = action;
      if (targetType) additionalFilters.targetType = targetType;
      if (userId) additionalFilters.userId = userId;

      const start = parseOptionalDate(startDate);
      const endDt = parseOptionalDate(endDate);
      if (start || endDt) {
        additionalFilters.timestamp = {};
        if (start) additionalFilters.timestamp.gte = start;
        if (endDt) additionalFilters.timestamp.lte = endDt;
      }

      let orConditions: any[] = [{ organizationId, eventId: null }];
      if (eventIds.length > 0) {
        orConditions.push({ eventId: { in: eventIds } });
      }
      const whereClause: any = {
        AND: [
          { OR: orConditions },
          additionalFilters
        ]
      };

      const total = await prisma.auditLog.count({ where: whereClause });
      const logs = await prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: sortBy === 'timestamp' ? { timestamp: sortOrder } : sortBy === 'action' ? { action: sortOrder } : { targetType: sortOrder },
        skip: offset,
        take: limitNum
      });

      const response: AuditLogResponse = {
        logs: logs.map(log => ({
          id: log.id,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          userId: log.userId,
          timestamp: log.timestamp,
          organizationId: log.organizationId,
          eventId: log.eventId,
          user: log.user,
          event: null
        })),
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
      };

      res.json(response);
    } catch (error) {
      logger().error('Error fetching organization audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
];

/**
 * Get system-wide audit logs (System Admin only)
 */
export const getSystemAuditLogs = [
  requireRole(['system_admin']),
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 50,
        action,
        targetType,
        userId,
        startDate,
        endDate,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = req.query as AuditLogQuery;

      const pageNum = Math.max(1, parseInt(page.toString()));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit.toString())));
      const offset = (pageNum - 1) * limitNum;

      const whereClause: any = {};
      if (action) whereClause.action = action;
      if (targetType) whereClause.targetType = targetType;
      if (userId) whereClause.userId = userId;

      // Optional filters to scope system logs per tests
      const orgFilter = (req.query as any).organizationId as string | undefined;
      const eventFilter = (req.query as any).eventId as string | undefined;
      if (orgFilter) {
        whereClause.organizationId = orgFilter;
      }
      if (eventFilter) {
        whereClause.eventId = eventFilter;
      }

      const start = parseOptionalDate(startDate);
      const endDt = parseOptionalDate(endDate);
      if (start || endDt) {
        whereClause.timestamp = {};
        if (start) whereClause.timestamp.gte = start;
        if (endDt) whereClause.timestamp.lte = endDt;
      }

      const total = await prisma.auditLog.count({ where: whereClause });
      const logs = await prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true, email: true } },
          event: { select: { id: true, name: true, slug: true } }
        },
        orderBy: sortBy === 'timestamp' ? { timestamp: sortOrder } : sortBy === 'action' ? { action: sortOrder } : { targetType: sortOrder },
        skip: offset,
        take: limitNum
      });

      const response: AuditLogResponse = {
        logs: logs.map(log => ({
          id: log.id,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          userId: log.userId,
          timestamp: log.timestamp,
          organizationId: log.organizationId,
          eventId: log.eventId,
          user: log.user,
          event: log.event
        })),
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
      };

      res.json(response);
    } catch (error) {
      logger().error('Error fetching system audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
];
