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
  event?: string;
  assigned?: string;
  sort?: string;
  order?: string;
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
      const validTypes = ['harassment', 'discrimination', 'conduct_violation', 'safety_concern', 'other'];
      if (!validTypes.includes(data.type)) {
        return {
          success: false,
          error: 'Invalid report type. Must be: harassment, discrimination, conduct_violation, safety_concern, or other.'
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
  async updateReportState(eventId: string, reportId: string, state: string): Promise<ServiceResult<{ report: any }>> {
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
      });

      if (!report || report.eventId !== eventId) {
        return {
          success: false,
          error: 'Report not found for this event.'
        };
      }

      // Update state
      const updated = await this.prisma.report.update({
        where: { id: reportId },
        data: { state: state as any },
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
        const hasResponderOrAdmin = roles.some((r: string) => ['Responder', 'Admin', 'SuperAdmin'].includes(r));

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
      const isResponderOrAbove = roles.some(r => ['Responder', 'Admin', 'SuperAdmin'].includes(r));

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
      const isAdminOrSuper = userRoles.includes('Admin') || userRoles.includes('SuperAdmin');

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
        const isResponderOrAbove = userRoles.some(r => ['Responder', 'Admin', 'SuperAdmin'].includes(r));

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
      const validTypes = ['harassment', 'discrimination', 'conduct_violation', 'safety_concern', 'other'];
      if (!validTypes.includes(type)) {
        return {
          success: false,
          error: 'Invalid report type. Must be: harassment, discrimination, conduct_violation, safety_concern, or other.'
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
        const isResponderOrAbove = userRoles.some(r => ['Responder', 'Admin', 'SuperAdmin'].includes(r));

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
} 