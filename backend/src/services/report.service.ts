import { PrismaClient } from '@prisma/client';
import { ServiceResult } from '../types';

export interface ReportCreateData {
  eventId: string;
  reporterId?: string | null;
  type: string;
  title: string;
  description: string;
  incidentAt?: Date | null;
  parties?: string | null;
  location?: string | null;
  contactPreference?: string;
  urgency?: string;
}

export interface ReportUpdateData {
  assignedResponderId?: string | null;
  severity?: string | null;
  resolution?: string | null;
  state?: string;
  title?: string;
}

export interface ReportQuery {
  userId?: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  severity?: string;
  event?: string;
  assigned?: string;
  sort?: string;
  order?: string;
  reportIds?: string[];
}

export interface EvidenceFile {
  filename: string;
  mimetype: string;
  size: number;
  data: Buffer;
  uploaderId?: string | null;
}

export interface ReportWithDetails {
  id: string;
  title: string;
  description: string;
  type: string;
  state: string;
  severity?: string | null;
  resolution?: string | null;
  incidentAt?: Date | null;
  parties?: string | null;
  location?: string | null;
  contactPreference?: string;
  createdAt: Date;
  updatedAt: Date;
  eventId: string;
  reporterId?: string | null;
  assignedResponderId?: string | null;
  reporter?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  assignedResponder?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  evidenceFiles?: Array<{
    id: string;
    filename: string;
    mimetype: string;
    size: number;
    createdAt: Date;
    uploader?: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  }>;
  event?: {
    id: string;
    name: string;
    slug: string;
  };
  userRoles?: string[];
  _count?: {
    comments: number;
  };
}

export interface UserReportsResponse {
  reports: ReportWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ReportService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new report with optional evidence files
   */
  async createReport(data: ReportCreateData, evidenceFiles?: EvidenceFile[]): Promise<ServiceResult<{ report: any }>> {
    try {
      // Validate required fields
      if (!data.eventId || !data.type || !data.description || !data.title) {
        return {
          success: false,
          error: 'Missing required fields: eventId, type, description, title'
        };
      }

      // Validate report type
      const validTypes = ['harassment', 'safety', 'other'];
      if (!validTypes.includes(data.type)) {
        return {
          success: false,
          error: 'Invalid report type. Must be: harassment, safety, or other.'
        };
      }

      // Validate contact preference if provided
      if (data.contactPreference) {
        const validPreferences = ['email', 'phone', 'in_person', 'no_contact'];
        if (!validPreferences.includes(data.contactPreference)) {
          return {
            success: false,
            error: 'Invalid contact preference. Must be: email, phone, in_person, or no_contact.'
          };
        }
      }

      // Validate urgency/severity if provided
      if (data.urgency) {
        const validUrgencies = ['low', 'medium', 'high', 'critical'];
        if (!validUrgencies.includes(data.urgency)) {
          return {
            success: false,
            error: 'Invalid urgency level. Must be: low, medium, high, or critical.'
          };
        }
      }

      const { eventId, reporterId, type, title, description, incidentAt, parties, location, contactPreference, urgency } = data;

      if (typeof title !== 'string' || title.length < 10 || title.length > 70) {
        return {
          success: false,
          error: 'title must be 10-70 characters.'
        };
      }

      // Check event exists
      const event = await this.prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      // Create report first
      const reportData: any = {
        eventId,
        reporterId,
        type,
        title,
        description,
        state: 'submitted',
        contactPreference: contactPreference || 'email', // default to email
      };

      if (incidentAt !== undefined) reportData.incidentAt = incidentAt;
      if (parties !== undefined) reportData.parties = parties;
      if (location !== undefined) reportData.location = location;
      
      // Map urgency to severity (frontend uses urgency, backend uses severity)
      if (urgency) {
        reportData.severity = urgency;
      }

      const report = await this.prisma.report.create({
        data: reportData,
      });

      // If evidence files are provided, store in DB
      if (evidenceFiles && evidenceFiles.length > 0) {
        for (const file of evidenceFiles) {
          await this.prisma.evidenceFile.create({
            data: {
              reportId: report.id,
              filename: file.filename,
              mimetype: file.mimetype,
              size: file.size,
              data: file.data,
              uploaderId: file.uploaderId || null,
            },
          });
        }
      }

      return {
        success: true,
        data: { report }
      };
    } catch (error: any) {
      console.error('Error creating report:', error);
      return {
        success: false,
        error: 'Failed to submit report.'
      };
    }
  }

  /**
   * List reports for an event
   */
  async getReportsByEventId(eventId: string, query?: ReportQuery): Promise<ServiceResult<{ reports: ReportWithDetails[] }>> {
    try {
      // Check if event exists first
      const event = await this.prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      const { userId, limit, page, sort, order } = query || {};

      const where: any = { eventId };
      if (userId) {
        where.reporterId = userId;
      }

      // Set up ordering
      let orderBy: any = { createdAt: 'desc' }; // default ordering
      if (sort && order) {
        const validSortFields = ['createdAt', 'updatedAt', 'title', 'state', 'severity'];
        const validOrders = ['asc', 'desc'];
        
        if (validSortFields.includes(sort) && validOrders.includes(order)) {
          orderBy = { [sort]: order };
        }
      }

      // Set up pagination
      const take = limit ? Math.min(Math.max(1, limit), 100) : undefined; // limit between 1-100
      const skip = (page && limit) ? (page - 1) * limit : undefined;

      const reports = await this.prisma.report.findMany({
        where,
        include: {
          reporter: true,
          assignedResponder: true,
          evidenceFiles: {
            include: {
              uploader: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy,
        take,
        skip,
      });

      return {
        success: true,
        data: { reports }
      };
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      return {
        success: false,
        error: 'Failed to fetch reports.'
      };
    }
  }

  /**
   * List reports for an event by slug
   */
  async getReportsByEventSlug(slug: string, query?: ReportQuery): Promise<ServiceResult<{ reports: ReportWithDetails[] }>> {
    try {
      // Get event ID from slug
      const event = await this.prisma.event.findUnique({ where: { slug } });
      if (!event) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      return this.getReportsByEventId(event.id, query);
    } catch (error: any) {
      console.error('Error fetching reports by slug:', error);
      return {
        success: false,
        error: 'Failed to fetch reports.'
      };
    }
  }

  /**
   * Get a single report by ID
   */
  async getReportById(reportId: string, eventId?: string): Promise<ServiceResult<{ report: ReportWithDetails }>> {
    try {
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
        include: {
          reporter: true,
          assignedResponder: true,
          evidenceFiles: {
            include: {
              uploader: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (!report) {
        return {
          success: false,
          error: 'Report not found.'
        };
      }

      if (eventId && report.eventId !== eventId) {
        return {
          success: false,
          error: 'Report not found for this event.'
        };
      }

      return {
        success: true,
        data: { report }
      };
    } catch (error: any) {
      console.error('Error fetching report:', error);
      return {
        success: false,
        error: 'Failed to fetch report.'
      };
    }
  }

  /**
   * Get a single report by slug and report ID
   */
  async getReportBySlugAndId(slug: string, reportId: string): Promise<ServiceResult<{ report: ReportWithDetails }>> {
    try {
      // Get event ID from slug
      const event = await this.prisma.event.findUnique({ where: { slug } });
      if (!event) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      return this.getReportById(reportId, event.id);
    } catch (error: any) {
      console.error('Error fetching report by slug:', error);
      return {
        success: false,
        error: 'Failed to fetch report.'
      };
    }
  }

  /**
   * Update report state
   */
  async updateReportState(eventId: string, reportId: string, state: string, userId?: string, notes?: string, assignedToUserId?: string): Promise<ServiceResult<{ report: any }>> {
    
    try {
      const validStates = ['submitted', 'acknowledged', 'investigating', 'resolved', 'closed'];
      if (!state || !validStates.includes(state)) {
        return {
          success: false,
          error: 'Invalid or missing state.'
        };
      }

      // Check report exists and belongs to event
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
        include: {
          reporter: true,
          assignedResponder: true
        }
      });

      if (!report || report.eventId !== eventId) {
        return {
          success: false,
          error: 'Report not found for this event.'
        };
      }

      // Validate state transition requirements
      interface StateRequirement {
        requiresAssignment?: boolean;
        requiresNotes: boolean;
      }
      
      const transitionRequirements: Record<string, StateRequirement> = {
        investigating: { requiresAssignment: true, requiresNotes: true },
        resolved: { requiresNotes: true },
        closed: { requiresNotes: false }
      };

      const requirements = transitionRequirements[state];
      
      if (requirements?.requiresNotes && (!notes || !notes.trim())) {
        return {
          success: false,
          error: `State transition to ${state} requires notes explaining the action.`
        };
      }

      if (requirements?.requiresAssignment && !assignedToUserId) {
        return {
          success: false,
          error: `State transition to ${state} requires assignment to a responder.`
        };
      }

      // Verify assigned user exists and has appropriate role if assignment is required
      if (assignedToUserId) {
        const assignedUser = await this.prisma.user.findUnique({
          where: { id: assignedToUserId },
          include: {
            userEventRoles: {
              where: { eventId: eventId },
              include: { role: true }
            }
          }
        });

        if (!assignedUser) {
          return {
            success: false,
            error: 'Assigned user not found.'
          };
        }

        const hasResponderOrAdmin = assignedUser.userEventRoles.some((er: any) => 
                  ['Responder', 'Event Admin', 'SuperAdmin'].includes(er.role.name) ||
        ['responder', 'event admin'].includes(er.role.name.toLowerCase())
        );

        if (!hasResponderOrAdmin) {
          return {
            success: false,
            error: 'Assigned user must have Responder or Event Admin role for this event.'
          };
        }
      }

      const oldState = report.state;

      // Prepare update data (Prisma type conflicts require any for now)
      const updateData: any = { state };
      if (assignedToUserId !== undefined && assignedToUserId !== null && assignedToUserId !== '') {
        updateData.assignedResponderId = assignedToUserId;
      }

      // Update state and assignment in transaction
      const updated = await this.prisma.$transaction(async (tx) => {
        // Update the report
        const updatedReport = await tx.report.update({
          where: { id: reportId },
          data: updateData,
          include: {
            reporter: true,
            assignedResponder: true,
            evidenceFiles: true
          }
        });

        // Create audit log entry for state change
        if (userId) {
          await tx.auditLog.create({
            data: {
              eventId: eventId,
              userId: userId,
              action: `State changed from ${oldState} to ${state}`,
              targetType: 'Report',
              targetId: reportId,
            }
          });

          // Create audit log for assignment if changed
          if (assignedToUserId && assignedToUserId !== report.assignedResponderId) {
            const assignedUserName = assignedToUserId ? 
              (await tx.user.findUnique({ where: { id: assignedToUserId } }))?.name || 'Unknown' 
              : 'Unassigned';
            
            await tx.auditLog.create({
              data: {
                eventId: eventId,
                userId: userId,
                action: `Report assigned to ${assignedUserName}`,
                targetType: 'Report',
                targetId: reportId,
              }
            });
          }
        }

        // Add a comment with the state change notes if provided
        if (notes && notes.trim() && userId) {
          await tx.reportComment.create({
            data: {
              reportId: reportId,
              authorId: userId,
              body: `**State changed from ${oldState} to ${state}**\n\n${notes}`,
              isMarkdown: true,
              visibility: 'internal' // State change notes are internal by default
            }
          });
        }

        return updatedReport;
      });

      return {
        success: true,
        data: { report: updated }
      };
    } catch (error: any) {
      console.error('Error updating report state:', error);
      return {
        success: false,
        error: 'Failed to update report state.'
      };
    }
  }

  /**
   * Get state history for a report
   */
  async getReportStateHistory(reportId: string): Promise<ServiceResult<{ history: Array<{ id: string; fromState: string; toState: string; changedBy: string; changedAt: string; notes?: string; }> }>> {
    try {
      const auditLogs = await this.prisma.auditLog.findMany({
        where: {
          targetType: 'Report',
          targetId: reportId,
          action: {
            contains: 'State changed'
          }
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      const history = auditLogs.map(log => {
        // Parse the action to extract from/to states
        const match = log.action.match(/State changed from (\w+) to (\w+)/);
        const fromState = match ? match[1] : '';
        const toState = match ? match[2] : '';
        
        return {
          id: log.id,
          fromState,
          toState,
          changedBy: log.user?.name || log.user?.email || 'Unknown',
          changedAt: log.timestamp.toISOString(),
          // Note: For now, notes are stored as comments with state changes
          // We could enhance this to store notes directly in audit logs
        };
      });

      return {
        success: true,
        data: { history }
      };
    } catch (error: any) {
      console.error('Error fetching report state history:', error);
      return {
        success: false,
        error: 'Failed to fetch state history.'
      };
    }
  }

  /**
   * Update report title (with authorization check)
   */
  async updateReportTitle(eventId: string, reportId: string, title: string, userId?: string): Promise<ServiceResult<{ report: any }>> {
    try {
      if (!title || typeof title !== 'string' || title.length < 10 || title.length > 70) {
        return {
          success: false,
          error: 'title must be 10-70 characters.'
        };
      }

      // Check report exists and belongs to event
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
        include: { reporter: true },
      });

      if (!report || report.eventId !== eventId) {
        return {
          success: false,
          error: 'Report not found for this event.'
        };
      }

      // Check edit permissions if userId provided
      if (userId) {
        const accessCheck = await this.checkReportEditAccess(userId, reportId, eventId);
        if (!accessCheck.success) {
          return {
            success: false,
            error: accessCheck.error || 'Authorization check failed.'
          };
        }
        
        if (!accessCheck.data?.canEdit) {
          return {
            success: false,
            error: accessCheck.data?.reason || 'Insufficient permissions to edit this report title.'
          };
        }
      }

      // Update title
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: { title },
        include: { reporter: true },
      });

      return {
        success: true,
        data: { report: updated }
      };
    } catch (error: any) {
      console.error('Error updating report title:', error);
      return {
        success: false,
        error: 'Failed to update report title.'
      };
    }
  }

  /**
   * Update report (assignment, severity, resolution, state)
   */
  async updateReport(slug: string, reportId: string, updateData: ReportUpdateData): Promise<ServiceResult<{ report: ReportWithDetails; originalAssignedResponderId?: string | null; originalState?: string }>> {
    try {
      // Get event ID from slug
      const event = await this.prisma.event.findUnique({ where: { slug } });
      if (!event) {
        return {
          success: false,
          error: 'Event not found.'
        };
      }

      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
      });

      if (!report || report.eventId !== event.id) {
        return {
          success: false,
          error: 'Report not found for this event.'
        };
      }

      const { assignedResponderId, severity, resolution, state } = updateData;

      // Build update data
      const data: any = {};
      if (assignedResponderId !== undefined) data.assignedResponderId = assignedResponderId;
      if (severity !== undefined) data.severity = severity;
      if (resolution !== undefined) data.resolution = resolution;
      if (state !== undefined) data.state = state;

      // Store original values for notification comparison
      const originalAssignedResponderId = report.assignedResponderId;
      const originalState = report.state;

      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data,
        include: {
          reporter: true,
          assignedResponder: true,
          evidenceFiles: {
            include: {
              uploader: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      return {
        success: true,
        data: { 
          report: updated, 
          originalAssignedResponderId, 
          originalState 
        }
      };
    } catch (error: any) {
      console.error('Error updating report:', error);
      return {
        success: false,
        error: 'Failed to update report.'
      };
    }
  }

  /**
   * Upload evidence files to a report
   */
  async uploadEvidenceFiles(reportId: string, evidenceFiles: EvidenceFile[]): Promise<ServiceResult<{ files: any[] }>> {
    try {
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
      });

      if (!report) {
        return {
          success: false,
          error: 'Report not found.'
        };
      }

      if (!evidenceFiles || evidenceFiles.length === 0) {
        return {
          success: false,
          error: 'No files provided.'
        };
      }

      const created = [];

      for (const file of evidenceFiles) {
        const evidence = await this.prisma.evidenceFile.create({
          data: {
            reportId: report.id,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            data: file.data,
            uploaderId: file.uploaderId ?? null,
          },
          include: {
            uploader: { select: { id: true, name: true, email: true } },
          },
        });

        created.push({
          id: evidence.id,
          filename: evidence.filename,
          mimetype: evidence.mimetype,
          size: evidence.size,
          createdAt: evidence.createdAt,
          uploader: evidence.uploader,
        });
      }

      return {
        success: true,
        data: { files: created }
      };
    } catch (error: any) {
      console.error('Error uploading evidence files:', error);
      return {
        success: false,
        error: 'Failed to upload evidence files.'
      };
    }
  }

  /**
   * List evidence files for a report
   */
  async getEvidenceFiles(reportId: string): Promise<ServiceResult<{ files: any[] }>> {
    try {
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
        include: { event: true }
      });

      if (!report) {
        return {
          success: false,
          error: 'Report not found.'
        };
      }

      const files = await this.prisma.evidenceFile.findMany({
        where: { reportId },
        select: {
          id: true,
          filename: true,
          mimetype: true,
          size: true,
          createdAt: true,
          uploader: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      return {
        success: true,
        data: { files }
      };
    } catch (error: any) {
      console.error('Error listing evidence files:', error);
      return {
        success: false,
        error: 'Failed to list evidence files.'
      };
    }
  }

  /**
   * Download evidence file by ID
   */
  async getEvidenceFile(evidenceId: string): Promise<ServiceResult<{ filename: string; mimetype: string; size: number; data: Buffer }>> {
    try {
      const evidence = await this.prisma.evidenceFile.findUnique({
        where: { id: evidenceId },
      });

      if (!evidence) {
        return {
          success: false,
          error: 'Evidence file not found.'
        };
      }

      return {
        success: true,
        data: {
          filename: evidence.filename,
          mimetype: evidence.mimetype,
          size: evidence.size,
          data: Buffer.from(evidence.data)
        }
      };
    } catch (error: any) {
      console.error('Error downloading evidence file:', error);
      return {
        success: false,
        error: 'Failed to download evidence file.'
      };
    }
  }

  /**
   * Delete evidence file
   */
  async deleteEvidenceFile(evidenceId: string): Promise<ServiceResult<{ message: string }>> {
    try {
      const evidence = await this.prisma.evidenceFile.findUnique({
        where: { id: evidenceId },
      });

      if (!evidence) {
        return {
          success: false,
          error: 'Evidence file not found.'
        };
      }

      await this.prisma.evidenceFile.delete({ where: { id: evidenceId } });

      return {
        success: true,
        data: { message: 'Evidence file deleted.' }
      };
    } catch (error: any) {
      console.error('Error deleting evidence file:', error);
      return {
        success: false,
        error: 'Failed to delete evidence file.'
      };
    }
  }

  /**
   * Get user's reports across all accessible events with complex filtering and pagination
   */
  async getUserReports(userId: string, query: ReportQuery): Promise<ServiceResult<UserReportsResponse>> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        event: eventFilter,
        assigned,
        sort = 'createdAt',
        order = 'desc'
      } = query;

      // Validate and parse pagination
      const pageNum = parseInt(page.toString());
      const limitNum = parseInt(limit.toString());

      if (pageNum < 1 || limitNum < 1) {
        return {
          success: false,
          error: 'Invalid pagination parameters. Page and limit must be positive integers.'
        };
      }

      if (limitNum > 100) {
        return {
          success: false,
          error: 'Limit cannot exceed 100 items per page.'
        };
      }

      const skip = (pageNum - 1) * limitNum;

      // Get user's event roles to determine access
      const userEventRoles = await this.prisma.userEventRole.findMany({
        where: { userId },
        include: {
          event: true,
          role: true
        }
      });

      if (userEventRoles.length === 0) {
        return {
          success: true,
          data: { reports: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 }
        };
      }

      // Group roles by event for access control
      const eventRoles = new Map();
      userEventRoles.forEach(uer => {
        if (!uer.event) return; // Skip if event is null
        const eventId = uer.event.id;
        if (!eventRoles.has(eventId)) {
          eventRoles.set(eventId, {
            event: uer.event,
            roles: []
          });
        }
        eventRoles.get(eventId)?.roles.push(uer.role.name);
      });

      // Build where clause based on user's access
      const eventIds = Array.from(eventRoles.keys());
      let whereClause: any = {
        eventId: { in: eventIds }
      };

      // Role-based filtering: Reporters only see their own reports
      const reporterOnlyEvents: string[] = [];
      const responderAdminEvents: string[] = [];

      eventRoles.forEach((eventData: any, eventId: string) => {
        const roles = eventData.roles;
        const hasResponderOrAdmin = roles.some((r: string) => ['Responder', 'Event Admin', 'SuperAdmin'].includes(r));

        if (hasResponderOrAdmin) {
          responderAdminEvents.push(eventId);
        } else {
          reporterOnlyEvents.push(eventId);
        }
      });

      // Build complex where clause for role-based access
      if (reporterOnlyEvents.length > 0 && responderAdminEvents.length > 0) {
        whereClause = {
          OR: [
            // Reports in events where user is responder/admin (all reports)
            { eventId: { in: responderAdminEvents } },
            // Reports in events where user is only reporter (only their reports)
            {
              AND: [
                { eventId: { in: reporterOnlyEvents } },
                { reporterId: userId }
              ]
            }
          ]
        };
      } else if (reporterOnlyEvents.length > 0) {
        // User is only reporter in all events
        whereClause = {
          eventId: { in: reporterOnlyEvents },
          reporterId: userId
        };
      } else {
        // User is responder/admin in all events
        whereClause = {
          eventId: { in: responderAdminEvents }
        };
      }

      // Apply filters while preserving access control
      const filters = [];

      // Preserve the original access control as the base
      const baseAccessControl = { ...whereClause };

      if (search) {
        filters.push({
          OR: [
            { title: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } }
          ]
        });
      }

      if (status) {
        filters.push({ state: status });
      }

      if (eventFilter) {
        // Filter by specific event slug
        const targetEvent = Array.from(eventRoles.values()).find((e: any) => e.event.slug === eventFilter);
        if (targetEvent) {
          filters.push({ eventId: targetEvent.event.id });
        } else {
          // User doesn't have access to this event
          return {
            success: true,
            data: { reports: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 }
          };
        }
      }

      if (assigned === 'me') {
        filters.push({ assignedResponderId: userId });
      } else if (assigned === 'unassigned') {
        filters.push({ assignedResponderId: null });
      }

      // Combine base access control with filters using AND
      if (filters.length > 0) {
        whereClause = {
          AND: [
            baseAccessControl,
            ...filters
          ]
        };
      }

      // Build sort clause
      const validSortFields = ['createdAt', 'updatedAt', 'title', 'state'];
      const sortField = validSortFields.includes(sort as string) ? sort as string : 'createdAt';
      const sortOrder = order === 'asc' ? 'asc' : 'desc';

      // Get total count
      const total = await this.prisma.report.count({ where: whereClause });

      // Get reports with pagination
      const reports = await this.prisma.report.findMany({
        where: whereClause,
        include: {
          event: {
            select: { id: true, name: true, slug: true }
          },
          reporter: {
            select: { id: true, name: true, email: true }
          },
          assignedResponder: {
            select: { id: true, name: true, email: true }
          },
          evidenceFiles: {
            select: { 
              id: true, 
              filename: true, 
              mimetype: true, 
              size: true, 
              createdAt: true,
              uploader: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          _count: {
            select: { comments: true }
          }
        },
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limitNum
      });

      // Add user's role in each event to the response
      const reportsWithRoles = reports.map(report => ({
        ...report,
        userRoles: eventRoles.get(report.eventId)?.roles || []
      }));

      return {
        success: true,
        data: {
          reports: reportsWithRoles,
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      };
    } catch (error: any) {
      console.error('Error fetching user reports:', error);
      return {
        success: false,
        error: 'Failed to fetch user reports.'
      };
    }
  }

  /**
   * Check if user has access to a report
   */
  async checkReportAccess(userId: string, reportId: string, eventId?: string): Promise<ServiceResult<{ hasAccess: boolean; isReporter: boolean; roles: string[] }>> {
    try {
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
        include: { event: true }
      });

      if (!report) {
        return {
          success: false,
          error: 'Report not found.'
        };
      }

      if (eventId && report.eventId !== eventId) {
        return {
          success: false,
          error: 'Report not found for this event.'
        };
      }

      // Check if user is the reporter
      const isReporter = !!(report.reporterId && userId === report.reporterId);

      // Get user's roles for this event
      const userEventRoles = await this.prisma.userEventRole.findMany({
        where: { userId, eventId: report.eventId },
        include: { role: true },
      });

      const roles = userEventRoles.map(uer => uer.role.name);
      const isResponderOrAbove = roles.some(r => ['Responder', 'Event Admin', 'SuperAdmin'].includes(r));

      const hasAccess = isReporter || isResponderOrAbove;

      return {
        success: true,
        data: { hasAccess, isReporter, roles }
      };
    } catch (error: any) {
      console.error('Error checking report access:', error);
      return {
        success: false,
        error: 'Failed to check report access.'
      };
    }
  }

  /**
   * Check if user can edit a report title
   */
  async checkReportEditAccess(userId: string, reportId: string, eventId: string): Promise<ServiceResult<{ canEdit: boolean; reason?: string }>> {
    try {
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
        include: { reporter: true },
      });

      if (!report || report.eventId !== eventId) {
        return {
          success: false,
          error: 'Report not found for this event.'
        };
      }

      // Check permissions: reporter can edit their own report, or user must be Admin/SuperAdmin
      const isReporter = !!(report.reporterId && userId === report.reporterId);

      const userEventRoles = await this.prisma.userEventRole.findMany({
        where: { userId, eventId },
        include: { role: true },
      });

      const userRoles = userEventRoles.map(uer => uer.role.name);
      const isAdminOrSuper = userRoles.includes('Event Admin') || userRoles.includes('SuperAdmin');

      const canEdit = isReporter || isAdminOrSuper;

      return {
        success: true,
        data: { 
          canEdit, 
          ...(canEdit ? {} : { reason: 'Insufficient permissions to edit this report title.' })
        }
      };
    } catch (error: any) {
      console.error('Error checking report edit access:', error);
      return {
        success: false,
        error: 'Failed to check report edit access.'
      };
    }
  }

  /**
   * Update report location (with authorization check)
   */
  async updateReportLocation(eventId: string, reportId: string, location: string | null, userId?: string): Promise<ServiceResult<{ report: any }>> {
    try {
      // Check report exists and belongs to event
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
        include: { reporter: true },
      });

      if (!report || report.eventId !== eventId) {
        return {
          success: false,
          error: 'Report not found for this event.'
        };
      }

      // Check edit permissions if userId provided
      if (userId) {
        const isReporter = !!(report.reporterId && userId === report.reporterId);

        const userEventRoles = await this.prisma.userEventRole.findMany({
          where: { userId, eventId },
          include: { role: true },
        });

        const userRoles = userEventRoles.map(uer => uer.role.name);
        const isResponderOrAbove = userRoles.some(r => ['Responder', 'Event Admin', 'SuperAdmin'].includes(r));

        const canEdit = isReporter || isResponderOrAbove;

        if (!canEdit) {
          return {
            success: false,
            error: 'Insufficient permissions to edit this report location.'
          };
        }
      }

      // Update location
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: { location: location || null } as any,
        include: { reporter: true },
      });

      return {
        success: true,
        data: { report: updated }
      };
    } catch (error: any) {
      console.error('Error updating report location:', error);
      return {
        success: false,
        error: 'Failed to update report location.'
      };
    }
  }

  /**
   * Update report contact preference (with authorization check)
   */
  async updateReportContactPreference(eventId: string, reportId: string, contactPreference: string, userId?: string): Promise<ServiceResult<{ report: any }>> {
    try {
      // Validate contact preference
      const validPreferences = ['email', 'phone', 'in_person', 'no_contact'];
      if (!validPreferences.includes(contactPreference)) {
        return {
          success: false,
          error: 'Invalid contact preference. Must be: email, phone, in_person, or no_contact.'
        };
      }

      // Check report exists and belongs to event
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
        include: { reporter: true },
      });

      if (!report || report.eventId !== eventId) {
        return {
          success: false,
          error: 'Report not found for this event.'
        };
      }

      // Check edit permissions - only reporter can edit contact preference
      if (userId) {
        const isReporter = !!(report.reporterId && userId === report.reporterId);

        if (!isReporter) {
          return {
            success: false,
            error: 'Only the reporter can edit contact preference.'
          };
        }
      }

      // Update contact preference
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: { contactPreference } as any,
        include: { reporter: true },
      });

      return {
        success: true,
        data: { report: updated }
      };
    } catch (error: any) {
      console.error('Error updating report contact preference:', error);
      return {
        success: false,
        error: 'Failed to update report contact preference.'
      };
    }
  }

  /**
   * Update report type (with authorization check)
   */
  async updateReportType(eventId: string, reportId: string, type: string, userId?: string): Promise<ServiceResult<{ report: any }>> {
    try {
      // Validate report type
      const validTypes = ['harassment', 'safety', 'other'];
      if (!validTypes.includes(type)) {
        return {
          success: false,
          error: 'Invalid report type. Must be: harassment, safety, or other.'
        };
      }

      // Check report exists and belongs to event
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
        include: { reporter: true },
      });

      if (!report || report.eventId !== eventId) {
        return {
          success: false,
          error: 'Report not found for this event.'
        };
      }

      // Check edit permissions if userId provided
      if (userId) {
        const isReporter = !!(report.reporterId && userId === report.reporterId);

        const userEventRoles = await this.prisma.userEventRole.findMany({
          where: { userId, eventId },
          include: { role: true },
        });

        const userRoles = userEventRoles.map(uer => uer.role.name);
        const isResponderOrAbove = userRoles.some(r => ['Responder', 'Event Admin', 'SuperAdmin'].includes(r));

        const canEdit = isReporter || isResponderOrAbove;

        if (!canEdit) {
          return {
            success: false,
            error: 'Insufficient permissions to edit this report type.'
          };
        }
      }

      // Update type
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: { type: type as any },
        include: { reporter: true },
      });

      return {
        success: true,
        data: { report: updated }
      };
    } catch (error: any) {
      console.error('Error updating report type:', error);
      return {
        success: false,
        error: 'Failed to update report type.'
      };
    }
  }

  /**
   * Update report description (with authorization check)
   */
  async updateReportDescription(eventId: string, reportId: string, description: string, userId?: string): Promise<ServiceResult<{ report: any }>> {
    try {
      // Validate description
      if (!description || description.trim().length === 0) {
        return {
          success: false,
          error: 'Description is required.'
        };
      }

      if (description.length > 5000) {
        return {
          success: false,
          error: 'Description must be less than 5000 characters.'
        };
      }

      // Check report exists and belongs to event
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
        include: { reporter: true },
      });

      if (!report || report.eventId !== eventId) {
        return {
          success: false,
          error: 'Report not found for this event.'
        };
      }

      // Check edit permissions - description is more sensitive, only reporter and event admin+
      if (userId) {
        const isReporter = !!(report.reporterId && userId === report.reporterId);

        const userEventRoles = await this.prisma.userEventRole.findMany({
          where: { userId, eventId },
          include: { role: true },
        });

        const userRoles = userEventRoles.map(uer => uer.role.name);
        const isAdminOrAbove = userRoles.some(r => ['Event Admin', 'SuperAdmin'].includes(r));

        const canEdit = isReporter || isAdminOrAbove;

        if (!canEdit) {
          return {
            success: false,
            error: 'Insufficient permissions to edit this report description.'
          };
        }
      }

      // Update description
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: { description: description.trim() },
        include: { reporter: true },
      });

      return {
        success: true,
        data: { report: updated }
      };
    } catch (error: any) {
      console.error('Error updating report description:', error);
      return {
        success: false,
        error: 'Failed to update report description.'
      };
    }
  }

  /**
   * Update report incident date (with authorization check)
   */
  async updateReportIncidentDate(eventId: string, reportId: string, incidentAt: string | null, userId?: string): Promise<ServiceResult<{ report: any }>> {
    try {
      let incidentDate: Date | null = null;

      // Validate and parse incident date if provided
      if (incidentAt) {
        incidentDate = new Date(incidentAt);
        if (isNaN(incidentDate.getTime())) {
          return {
            success: false,
            error: 'Invalid incident date format.'
          };
        }

        // Check if date is not too far in the future
        const now = new Date();
        const maxFutureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
        if (incidentDate > maxFutureDate) {
          return {
            success: false,
            error: 'Incident date cannot be more than 24 hours in the future.'
          };
        }
      }

      // Check report exists and belongs to event
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
        include: { reporter: true },
      });

      if (!report || report.eventId !== eventId) {
        return {
          success: false,
          error: 'Report not found for this event.'
        };
      }

      // Check edit permissions if userId provided
      if (userId) {
        const isReporter = !!(report.reporterId && userId === report.reporterId);

        const userEventRoles = await this.prisma.userEventRole.findMany({
          where: { userId, eventId },
          include: { role: true },
        });

        const userRoles = userEventRoles.map(uer => uer.role.name);
        const isResponderOrAbove = userRoles.some(r => ['Responder', 'Event Admin', 'SuperAdmin'].includes(r));

        const canEdit = isReporter || isResponderOrAbove;

        if (!canEdit) {
          return {
            success: false,
            error: 'Insufficient permissions to edit this report incident date.'
          };
        }
      }

      // Update incident date
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: { incidentAt: incidentDate },
        include: { reporter: true },
      });

      return {
        success: true,
        data: { report: updated }
      };
    } catch (error: any) {
      console.error('Error updating report incident date:', error);
      return {
        success: false,
        error: 'Failed to update report incident date.'
      };
    }
  }

  /**
   * Update report parties involved (with authorization check)
   */
  async updateReportParties(eventId: string, reportId: string, parties: string | null, userId?: string): Promise<ServiceResult<{ report: any }>> {
    try {
      // Validate parties if provided
      if (parties && parties.length > 1000) {
        return {
          success: false,
          error: 'Parties involved must be less than 1000 characters.'
        };
      }

      // Check report exists and belongs to event
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
        include: { reporter: true },
      });

      if (!report || report.eventId !== eventId) {
        return {
          success: false,
          error: 'Report not found for this event.'
        };
      }

      // Check edit permissions if userId provided
      if (userId) {
        const isReporter = !!(report.reporterId && userId === report.reporterId);

        const userEventRoles = await this.prisma.userEventRole.findMany({
          where: { userId, eventId },
          include: { role: true },
        });

        const userRoles = userEventRoles.map(uer => uer.role.name);
        const isResponderOrAbove = userRoles.some(r => ['Responder', 'Event Admin', 'SuperAdmin'].includes(r));

        const canEdit = isReporter || isResponderOrAbove;

        if (!canEdit) {
          return {
            success: false,
            error: 'Insufficient permissions to edit this report parties involved.'
          };
        }
      }

      // Update parties
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: { parties: parties ? parties.trim() : null },
        include: { reporter: true },
      });

      return {
        success: true,
        data: { report: updated }
      };
    } catch (error: any) {
      console.error('Error updating report parties:', error);
      return {
        success: false,
        error: 'Failed to update report parties involved.'
      };
    }
  }

  /**
   * Get reports for a specific event with enhanced filtering, search, and optional stats
   */
  async getEventReports(eventId: string, userId: string, query: ReportQuery & { includeStats?: boolean }): Promise<ServiceResult<{
    reports: ReportWithDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    stats?: {
      submitted: number;
      acknowledged: number;
      investigating: number;
      resolved: number;
      closed: number;
      total: number;
    };
  }>> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        severity,
        assigned,
        sort = 'createdAt',
        order = 'desc',
        userId: filterUserId,
        includeStats = false,
        reportIds
      } = query;

      // Validate pagination parameters
      const pageNum = parseInt(String(page), 10);
      const limitNum = parseInt(String(limit), 10);

      if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
        return {
          success: false,
          error: 'Invalid pagination parameters. Page and limit must be positive integers.'
        };
      }

      if (limitNum > 100) {
        return {
          success: false,
          error: 'Limit cannot exceed 100 items per page.'
        };
      }

      const skip = (pageNum - 1) * limitNum;

      // Get user's roles for this event to determine access
      const userEventRoles = await this.prisma.userEventRole.findMany({
        where: { 
          userId,
          eventId 
        },
        include: {
          role: true
        }
      });

      if (userEventRoles.length === 0) {
        return {
          success: false,
          error: 'Access denied. User has no roles for this event.'
        };
      }

      const userRoles = userEventRoles.map(uer => uer.role.name);

      // Build base where clause based on user roles
      let baseWhere: any = { eventId };

      // Role-based access control
      if (userRoles.includes('Reporter') && !userRoles.includes('Responder') && !userRoles.includes('Event Admin')) {
        // Reporters can only see their own reports
        baseWhere.reporterId = userId;
      }
      // Responders and Admins can see all reports in the event

      // Apply additional filters
      const filters: any[] = [];

      if (search) {
        filters.push({
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        });
      }

      if (status) {
        filters.push({ state: status });
      }

      if (severity) {
        filters.push({ severity });
      }

      if (assigned === 'me') {
        filters.push({ assignedResponderId: userId });
      } else if (assigned === 'unassigned') {
        filters.push({ assignedResponderId: null });
      }

      if (filterUserId) {
        // Filter by specific user (for "My Reports" view)
        filters.push({ reporterId: filterUserId });
      }

      if (reportIds && reportIds.length > 0) {
        // Filter by specific report IDs (for export)
        filters.push({ id: { in: reportIds } });
      }

      // Combine base access control with filters
      const whereClause = filters.length > 0 ? {
        AND: [baseWhere, ...filters]
      } : baseWhere;

      // Build sort clause
      const validSortFields = ['createdAt', 'updatedAt', 'title', 'state', 'severity'];
      const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
      const sortOrder = order === 'asc' ? 'asc' : 'desc';

      // Get total count
      const total = await this.prisma.report.count({ where: whereClause });
      const totalPages = Math.ceil(total / limitNum);

      // Get reports with includes
      const reports = await this.prisma.report.findMany({
        where: whereClause,
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          assignedResponder: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          evidenceFiles: {
            select: {
              id: true,
              filename: true,
              mimetype: true,
              size: true,
              createdAt: true,
              uploader: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          event: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          _count: {
            select: {
              comments: true
            }
          }
        },
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limitNum
      });

      // Add user roles to each report
      const reportsWithRoles = reports.map(report => ({
        ...report,
        userRoles
      }));

      // Get stats if requested
      let stats: {
        submitted: number;
        acknowledged: number;
        investigating: number;
        resolved: number;
        closed: number;
        total: number;
      } | undefined;
      
      if (includeStats) {
        try {
          const statsResult = await this.prisma.report.groupBy({
            by: ['state'],
            where: baseWhere, // Use base access control for stats
            _count: {
              _all: true
            }
          });

          stats = {
            submitted: 0,
            acknowledged: 0,
            investigating: 0,
            resolved: 0,
            closed: 0,
            total: 0
          };

          statsResult.forEach(stat => {
            const count = stat._count._all;
            switch (stat.state) {
              case 'submitted':
                stats!.submitted = count;
                break;
              case 'acknowledged':
                stats!.acknowledged = count;
                break;
              case 'investigating':
                stats!.investigating = count;
                break;
              case 'resolved':
                stats!.resolved = count;
                break;
              case 'closed':
                stats!.closed = count;
                break;
            }
            stats!.total += count;
          });
        } catch (statsError) {
          console.error('Error fetching stats:', statsError);
          // Don't fail the entire request if stats fail
          stats = {
            submitted: 0,
            acknowledged: 0,
            investigating: 0,
            resolved: 0,
            closed: 0,
            total: 0
          };
        }
      }

      return {
        success: true,
        data: {
          reports: reportsWithRoles,
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          ...(stats && { stats })
        }
      };
    } catch (error: any) {
      console.error('Error fetching event reports:', error);
      return {
        success: false,
        error: 'Failed to fetch event reports'
      };
    }
  }

  // Bulk update reports (assign, status change, delete)
  async bulkUpdateReports(eventId: string, reportIds: string[], action: string, options: {
    assignedTo?: string;
    status?: string;
    notes?: string;
    userId: string;
  }): Promise<ServiceResult<{ updated: number; errors: string[] }>> {
    try {
      const { assignedTo, status, notes, userId } = options;
      let updated = 0;
      const errors: string[] = [];

      // Verify user has access to the event
      const userEventRoles = await this.prisma.userEventRole.findMany({
        where: {
          userId,
          eventId
        },
        include: {
          role: true
        }
      });

      if (userEventRoles.length === 0) {
        return {
          success: false,
          error: 'Access denied: User not authorized for this event'
        };
      }

      const userRoles = userEventRoles.map(uer => uer.role.name);
      const canBulkUpdate = userRoles.some(role => ['Responder', 'Event Admin', 'SuperAdmin'].includes(role));

      if (!canBulkUpdate) {
        return {
          success: false,
          error: 'Access denied: Insufficient permissions for bulk operations'
        };
      }

      // Process each report
      for (const reportId of reportIds) {
        try {
          // Verify report exists and belongs to event
          const report = await this.prisma.report.findFirst({
            where: {
              id: reportId,
              eventId
            }
          });

          if (!report) {
            errors.push(`Report ${reportId} not found or not in this event`);
            continue;
          }

          // Perform the action
          switch (action) {
            case 'assign':
              if (assignedTo) {
                await this.prisma.report.update({
                  where: { id: reportId },
                  data: { assignedResponderId: assignedTo }
                });
                updated++;
              } else {
                errors.push(`Report ${reportId}: assignedTo is required for assign action`);
              }
              break;

            case 'status':
              if (status) {
                // Validate status is a valid ReportState
                const validStates = ['submitted', 'acknowledged', 'investigating', 'resolved', 'closed'];
                if (!validStates.includes(status)) {
                  errors.push(`Report ${reportId}: Invalid status ${status}`);
                  continue;
                }
                
                await this.prisma.report.update({
                  where: { id: reportId },
                  data: { state: status as any }
                });
                updated++;
              } else {
                errors.push(`Report ${reportId}: status is required for status action`);
              }
              break;

            case 'delete':
              // Delete associated evidence files first
              await this.prisma.evidenceFile.deleteMany({
                where: { reportId }
              });
              
              // Delete associated comments
              await this.prisma.reportComment.deleteMany({
                where: { reportId }
              });
              
              // Delete the report
              await this.prisma.report.delete({
                where: { id: reportId }
              });
              updated++;
              break;

            default:
              errors.push(`Report ${reportId}: Unknown action ${action}`);
          }
        } catch (error: any) {
          errors.push(`Report ${reportId}: ${error.message}`);
        }
      }

      return {
        success: true,
        data: {
          updated,
          errors
        }
      };
    } catch (error: any) {
      console.error('Error in bulk update reports:', error);
      return {
        success: false,
        error: 'Failed to perform bulk update'
      };
    }
  }
} 