import { Router, Request, Response } from 'express';
import { EventService } from '../services/event.service';
import { ReportService } from '../services/report.service';
import { UserService } from '../services/user.service';
import { InviteService } from '../services/invite.service';
import { CommentService } from '../services/comment.service';
import { NotificationService } from '../services/notification.service';
import { notifyReportEvent } from '../utils/notifications';
import { requireRole } from '../middleware/rbac';
import { UserResponse } from '../types';
import { PrismaClient, CommentVisibility } from '@prisma/client';
import { createUploadMiddleware, validateUploadedFiles } from '../utils/upload';

const router = Router();
const prisma = new PrismaClient();
const eventService = new EventService(prisma);
const reportService = new ReportService(prisma);
const userService = new UserService(prisma);
const inviteService = new InviteService(prisma);
const commentService = new CommentService(prisma);
const notificationService = new NotificationService(prisma);

// Secure multer setup for logo uploads
const uploadLogo = createUploadMiddleware({
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
  maxSizeMB: 5,
  allowedExtensions: ['png', 'jpg', 'jpeg']
});

// Secure multer setup for evidence uploads
const uploadEvidence = createUploadMiddleware({
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'text/plain'],
  maxSizeMB: 10,
  allowedExtensions: ['png', 'jpg', 'jpeg', 'pdf', 'txt']
});

// ========================================
// SLUG-BASED ROUTES (must come first to avoid conflicts with :eventId routes)
// ========================================

// Get event users (by slug)
router.get('/slug/:slug/users', requireRole(['Reporter', 'Responder', 'Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const query = {
      search: req.query.search as string,
      sort: req.query.sort as string,
      order: req.query.order as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      role: req.query.role as string
    };
    
    const result = await eventService.getEventUsersBySlug(slug, query);
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else {
        res.status(500).json({ error: result.error });
      }
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get event users error:', error);
    res.status(500).json({ error: 'Failed to fetch event users.' });
  }
});

// Get individual user profile by event slug and user ID
router.get('/slug/:slug/users/:userId', requireRole(['Responder', 'Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, userId } = req.params;
    
    const result = await eventService.getEventUserProfile(slug, userId);
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else if (result.error?.includes('Forbidden') || result.error?.toLowerCase().includes('insufficient')) {
        res.status(403).json({ error: result.error });
      } else {
        res.status(500).json({ error: result.error });
      }
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// Get user activity timeline by event slug and user ID
router.get('/slug/:slug/users/:userId/activity', requireRole(['Responder', 'Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const result = await eventService.getUserActivity(slug, userId, { page, limit });
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else if (result.error?.includes('Forbidden') || result.error?.toLowerCase().includes('insufficient')) {
        res.status(403).json({ error: result.error });
      } else {
        res.status(500).json({ error: result.error });
      }
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get user activity error:', error);
    res.status(500).json({ error: 'Failed to fetch user activity.' });
  }
});

// Get user's reports by event slug and user ID
router.get('/slug/:slug/users/:userId/reports', requireRole(['Responder', 'Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string; // 'submitted' or 'assigned'
    
    const result = await eventService.getUserReports(slug, userId, { page, limit, type });
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else if (result.error?.includes('Forbidden') || result.error?.toLowerCase().includes('insufficient')) {
        res.status(403).json({ error: result.error });
      } else {
        res.status(500).json({ error: result.error });
      }
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get user reports error:', error);
    res.status(500).json({ error: 'Failed to fetch user reports.' });
  }
});

// Update event user (by slug)
router.patch('/slug/:slug/users/:userId', requireRole(['Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, userId } = req.params;
    const { name, email, role } = req.body;
    
    if (!name || !email || !role) {
      res.status(400).json({ error: 'Name, email, and role are required.' });
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format.' });
      return;
    }
    
    // Validate role enum
    const validRoles = ['SuperAdmin', 'Event Admin', 'Responder', 'Reporter'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be one of: SuperAdmin, Admin, Responder, Reporter.' });
      return;
    }
    
    const updateData = { name, email, role };
    
    const result = await eventService.updateEventUser(slug, userId, updateData);
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else if (result.error?.includes('Forbidden') || result.error?.toLowerCase().includes('insufficient')) {
        res.status(403).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
      return;
    }

    res.json({ message: 'User updated.' });
  } catch (error: any) {
    console.error('Update event user error:', error);
    res.status(500).json({ error: 'Failed to update event user.' });
  }
});

// Remove user from event (by slug)
router.delete('/slug/:slug/users/:userId', requireRole(['Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, userId } = req.params;
    
    const result = await eventService.removeEventUser(slug, userId);
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else if (result.error?.includes('Forbidden') || result.error?.toLowerCase().includes('insufficient')) {
        res.status(403).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
      return;
    }

    res.json({ message: 'User removed from event.' });
  } catch (error: any) {
    console.error('Remove user from event error:', error);
    res.status(500).json({ error: 'Failed to remove user from event.' });
  }
});

// Get event statistics (by slug)
router.get('/slug/:slug/stats', requireRole(['Responder', 'Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const user = req.user as any;
    
    const result = await eventService.getEventStats(slug, user?.id);
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else {
        res.status(500).json({ error: result.error });
      }
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get event stats error:', error);
    res.status(500).json({ error: 'Failed to fetch event statistics.' });
  }
});

// Get enhanced event card data (by slug) - for dashboard cards
router.get('/slug/:slug/cardstats', requireRole(['Reporter', 'Responder', 'Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const user = req.user as any;
    
    const result = await eventService.getEventCardStats(slug, user?.id);
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else {
        res.status(500).json({ error: result.error });
      }
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get event card stats error:', error);
    res.status(500).json({ error: 'Failed to fetch event card statistics.' });
  }
});

// Get current user's role for an event (by slug)
router.get('/slug/:slug/user-role', requireRole(['Reporter', 'Responder', 'Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const user = req.user as any;
    
    if (!user?.id) {
      res.status(401).json({ error: 'User not authenticated.' });
      return;
    }
    
    // Find the event by slug
    const event = await prisma.event.findUnique({
      where: { slug },
      select: { id: true }
    });
    
    if (!event) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    
    // Find the user's role for this event
    const userRole = await prisma.userEventRole.findFirst({
      where: {
        eventId: event.id,
        userId: user.id
      },
      include: {
        role: true
      }
    });
    
    if (!userRole) {
      res.status(403).json({ error: 'User does not have access to this event.' });
      return;
    }
    
    res.json({ role: userRole.role.name });
  } catch (error: any) {
    console.error('Get user role error:', error);
    res.status(500).json({ error: 'Failed to fetch user role.' });
  }
});

// ========================================
// EVENT ID-BASED ROUTES
// ========================================

// Create event
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, slug } = req.body;
    
    if (!name || !slug) {
      res.status(400).json({ error: 'Name and slug are required.' });
      return;
    }
    
    const result = await eventService.createEvent({ name, slug });
    
    if (!result.success) {
      // Check for specific error types and return appropriate status codes
      if (result.error === 'Slug already exists.') {
        res.status(409).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
      return;
    }

    res.status(201).json(result.data);
  } catch (error: any) {
    console.error('Event creation error:', error);
    res.status(500).json({ error: 'Failed to create event.' });
  }
});

// Get all events
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await eventService.listAllEvents();
    
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
});

// Get event by ID
router.get('/:eventId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    
    const result = await eventService.getEventById(eventId);
    
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get event by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch event.' });
  }
});

// Get event users by ID
router.get('/:eventId/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    
    const result = await eventService.getEventUsers(eventId);
    
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get event users error:', error);
    res.status(500).json({ error: 'Failed to fetch event users.' });
  }
});

// Assign role to user
router.post('/:eventId/roles', requireRole(['Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { userId, roleName } = req.body;
    
    if (!userId || !roleName) {
      res.status(400).json({ error: 'User ID and role name are required.' });
      return;
    }
    
    const result = await eventService.assignUserRole(eventId, { userId, roleName });
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Assign role error:', error);
    res.status(500).json({ error: 'Failed to assign role.' });
  }
});

// Remove role from user
router.delete('/:eventId/roles', requireRole(['Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { userId, roleName } = req.body;
    
    if (!userId || !roleName) {
      res.status(400).json({ error: 'User ID and role name are required.' });
      return;
    }
    
    const result = await eventService.removeUserRole(eventId, { userId, roleName });
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ message: 'Role removed.' });
  } catch (error: any) {
    console.error('Remove role error:', error);
    res.status(500).json({ error: 'Failed to remove role.' });
  }
});

// Create report for event
router.post('/:eventId/reports', requireRole(['Reporter', 'Responder', 'Event Admin', 'SuperAdmin']), uploadEvidence.array('evidence'), validateUploadedFiles, async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { type, description, title, incidentAt, parties, location, contactPreference, urgency } = req.body;
    
    if (!type || !description || !title) {
      res.status(400).json({ error: 'Type, description, and title are required.' });
      return;
    }
    
    // Basic title validation
    if (title.length < 10) {
      res.status(400).json({ error: 'Title must be at least 10 characters long.' });
      return;
    }
    
    if (title.length > 70) {
      res.status(400).json({ error: 'Title must be no more than 70 characters long.' });
      return;
    }
    
    // Get authenticated user
    const user = req.user as any;
    if (!user?.id) {
      res.status(401).json({ error: 'User not authenticated.' });
      return;
    }
    
    const reportData = {
      eventId,
      type,
      description,
      title,
      reporterId: user.id,
      incidentAt: incidentAt ? new Date(incidentAt) : null,
      parties,
      location,
      contactPreference,
      urgency
    };
    
    // Handle file uploads if any
    const multerFiles = req.files as Express.Multer.File[] | undefined;
    const evidenceFiles = multerFiles?.map(file => ({
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      data: file.buffer,
      uploaderId: user.id
    }));
    
    const result = await reportService.createReport(reportData, evidenceFiles);
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
      return;
    }

    // Trigger notifications for new report submission
    try {
      if (result.data?.report?.id) {
        await notifyReportEvent(result.data.report.id, 'report_submitted', user.id);
      }
    } catch (notificationError) {
      console.error('Failed to send notifications for new report:', notificationError);
      // Don't fail the main operation if notifications fail
    }

    res.status(201).json(result.data);
  } catch (error: any) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Failed to create report.' });
  }
});

// Get reports for event
router.get('/:eventId/reports', async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const search = req.query.search as string;
    
    const result = await reportService.getReportsByEventId(eventId, {
      page,
      limit,
      status,
      search
    });
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else {
        res.status(500).json({ error: result.error });
      }
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// Get specific report
router.get('/:eventId/reports/:reportId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    
    const result = await reportService.getReportById(reportId);
    
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Failed to fetch report.' });
  }
});

// Get report state history
router.get('/:eventId/reports/:reportId/state-history', requireRole(['Event Admin', 'SuperAdmin', 'Responder', 'Reporter']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, reportId } = req.params;
    const user = req.user as any;
    
    // Check if user has access to this report
    const accessResult = await reportService.checkReportAccess(user.id, reportId, eventId);
    if (!accessResult.success) {
      res.status(500).json({ error: accessResult.error });
      return;
    }

    if (!accessResult.data!.hasAccess) {
      res.status(403).json({ error: 'Forbidden: insufficient role' });
      return;
    }
    
    const result = await reportService.getReportStateHistory(reportId);
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get report state history error:', error);
    res.status(500).json({ error: 'Failed to fetch state history.' });
  }
});

// Update report state with enhanced workflow support
router.patch('/:eventId/reports/:reportId/state', requireRole(['Event Admin', 'SuperAdmin', 'Responder']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, reportId } = req.params;
    const { state, status, priority, assignedToUserId, resolution, notes, assignedTo } = req.body;
    
    // Handle both 'state' and 'status' parameters for compatibility
    const stateValue = state || status;
    
    // Handle both assignedToUserId and assignedTo for compatibility
    const assignedUserId = assignedToUserId || assignedTo;
    
    const user = req.user as any;
    const userId = user?.id;
    
    // Get the current report state before update to check for changes
    const currentReport = await reportService.getReportById(reportId);
    if (!currentReport.success) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    
    const oldAssignedUserId = currentReport.data?.report?.assignedResponderId;
    const oldState = currentReport.data?.report?.state;
    
    const result = await reportService.updateReportState(
      eventId, 
      reportId, 
      stateValue, 
      userId, 
      notes, 
      assignedUserId
    );
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
      return;
    }

    // Trigger notifications for state change and assignment
    try {
      // Always notify about state change if state actually changed
      if (oldState !== stateValue) {
        await notifyReportEvent(reportId, 'report_status_changed', userId);
      }
      
      // Notify about assignment if assignment changed
      if (assignedUserId && assignedUserId !== oldAssignedUserId) {
        // For assignments, don't exclude the assigned user even if they assigned it to themselves
        await notifyReportEvent(reportId, 'report_assigned', null);
      }
    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError);
      // Don't fail the main operation if notifications fail
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Update report state error:', error);
    res.status(500).json({ error: 'Failed to update report state.' });
  }
});

// Update report title
router.patch('/:eventId/reports/:reportId/title', requireRole(['Event Admin', 'SuperAdmin', 'Reporter']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, reportId } = req.params;
    const { title } = req.body;
    
    if (!title) {
      res.status(400).json({ error: 'Title is required.' });
      return;
    }
    
    // Basic title validation
    if (title.length < 10) {
      res.status(400).json({ error: 'Title must be at least 10 characters long.' });
      return;
    }
    
    if (title.length > 70) {
      res.status(400).json({ error: 'Title must be no more than 70 characters long.' });
      return;
    }
    
    const user = req.user as any;
    const result = await reportService.updateReportTitle(eventId, reportId, title, user?.id);
    
    if (!result.success) {
      if (result.error?.includes('Insufficient permissions')) {
        res.status(403).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Update report title error:', error);
    res.status(500).json({ error: 'Failed to update report title.' });
  }
});

// Update report location
router.patch('/:eventId/reports/:reportId/location', requireRole(['Event Admin', 'SuperAdmin', 'Reporter', 'Responder']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, reportId } = req.params;
    const { location } = req.body;
    
    const user = req.user as any;
    const result = await reportService.updateReportLocation(eventId, reportId, location, user?.id);
    
    if (!result.success) {
      if (result.error?.includes('Insufficient permissions')) {
        res.status(403).json({ error: result.error });
        return;
      }
      res.status(400).json({ error: result.error });
      return;
    }
    
    res.json(result.data);
  } catch (error) {
    console.error('Error updating report location:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Update report contact preference
router.patch('/:eventId/reports/:reportId/contact-preference', requireRole(['Event Admin', 'SuperAdmin', 'Reporter']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, reportId } = req.params;
    const { contactPreference } = req.body;
    
    if (!contactPreference) {
      res.status(400).json({ error: 'Contact preference is required.' });
      return;
    }
    
    const user = req.user as any;
    const result = await reportService.updateReportContactPreference(eventId, reportId, contactPreference, user?.id);
    
    if (!result.success) {
      if (result.error?.includes('Insufficient permissions') || result.error?.includes('Only the reporter')) {
        res.status(403).json({ error: result.error });
        return;
      }
      res.status(400).json({ error: result.error });
      return;
    }
    
    res.json(result.data);
  } catch (error) {
    console.error('Error updating report contact preference:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Update report type
router.patch('/:eventId/reports/:reportId/type', requireRole(['Event Admin', 'SuperAdmin', 'Reporter', 'Responder']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, reportId } = req.params;
    const { type } = req.body;
    
    if (!type) {
      res.status(400).json({ error: 'Type is required.' });
      return;
    }
    
    const user = req.user as any;
    const result = await reportService.updateReportType(eventId, reportId, type, user?.id);
    
    if (!result.success) {
      if (result.error?.includes('Insufficient permissions')) {
        res.status(403).json({ error: result.error });
        return;
      }
      res.status(400).json({ error: result.error });
      return;
    }
    
    res.json(result.data);
  } catch (error) {
    console.error('Error updating report type:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Update report description
router.patch('/:eventId/reports/:reportId/description', requireRole(['Event Admin', 'SuperAdmin', 'Reporter']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, reportId } = req.params;
    const { description } = req.body;
    
    if (!description || description.trim().length === 0) {
      res.status(400).json({ error: 'Description is required.' });
      return;
    }
    
    const user = req.user as any;
    const result = await reportService.updateReportDescription(eventId, reportId, description, user?.id);
    
    if (!result.success) {
      if (result.error?.includes('Insufficient permissions')) {
        res.status(403).json({ error: result.error });
        return;
      }
      res.status(400).json({ error: result.error });
      return;
    }
    
    res.json(result.data);
  } catch (error) {
    console.error('Error updating report description:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Update report incident date
router.patch('/:eventId/reports/:reportId/incident-date', requireRole(['Event Admin', 'SuperAdmin', 'Reporter', 'Responder']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, reportId } = req.params;
    const { incidentAt } = req.body;
    
    const user = req.user as any;
    const result = await reportService.updateReportIncidentDate(eventId, reportId, incidentAt, user?.id);
    
    if (!result.success) {
      if (result.error?.includes('Insufficient permissions')) {
        res.status(403).json({ error: result.error });
        return;
      }
      res.status(400).json({ error: result.error });
      return;
    }
    
    res.json(result.data);
  } catch (error) {
    console.error('Error updating report incident date:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Update report parties involved
router.patch('/:eventId/reports/:reportId/parties', requireRole(['Event Admin', 'SuperAdmin', 'Reporter', 'Responder']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, reportId } = req.params;
    const { parties } = req.body;
    
    const user = req.user as any;
    const result = await reportService.updateReportParties(eventId, reportId, parties, user?.id);
    
    if (!result.success) {
      if (result.error?.includes('Insufficient permissions')) {
        res.status(403).json({ error: result.error });
        return;
      }
      res.status(400).json({ error: result.error });
      return;
    }
    
    res.json(result.data);
  } catch (error) {
    console.error('Error updating report parties:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Upload evidence for report
router.post('/:eventId/reports/:reportId/evidence', requireRole(['Event Admin', 'SuperAdmin', 'Responder']), uploadEvidence.array('evidence'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    const evidenceFiles = req.files as Express.Multer.File[];
    
    if (!evidenceFiles || evidenceFiles.length === 0) {
      res.status(400).json({ error: 'No evidence files uploaded.' });
      return;
    }
    
    const user = req.user as any;
    const uploaderId = user?.id;
    
    if (!uploaderId) {
      res.status(401).json({ error: 'User not authenticated.' });
      return;
    }
    
    const evidenceData = evidenceFiles.map(file => ({
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      data: file.buffer,
      uploaderId
    }));
    
    const result = await reportService.uploadEvidenceFiles(reportId, evidenceData);
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Upload evidence error:', error);
    res.status(500).json({ error: 'Failed to upload evidence.' });
  }
});

// Get evidence for report
router.get('/:eventId/reports/:reportId/evidence', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    
    const result = await reportService.getEvidenceFiles(reportId);
    
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get evidence error:', error);
    res.status(500).json({ error: 'Failed to fetch evidence.' });
  }
});

// Download evidence file
router.get('/:eventId/reports/:reportId/evidence/:evidenceId/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const { evidenceId } = req.params;
    
    const result = await reportService.getEvidenceFile(evidenceId);
    
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    
    const evidence = result.data;
    
    if (!evidence) {
      res.status(404).json({ error: 'Evidence not found.' });
      return;
    }
    
    res.setHeader('Content-Type', evidence.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${evidence.filename}"`);
    res.send(evidence.data);
  } catch (error: any) {
    console.error('Download evidence error:', error);
    res.status(500).json({ error: 'Failed to download evidence.' });
  }
});

// Delete evidence file
router.delete('/:eventId/reports/:reportId/evidence/:evidenceId', requireRole(['Event Admin', 'SuperAdmin', 'Responder']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { evidenceId } = req.params;
    
    const result = await reportService.deleteEvidenceFile(evidenceId);
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ message: 'Evidence deleted successfully.' });
  } catch (error: any) {
    console.error('Delete evidence error:', error);
    res.status(500).json({ error: 'Failed to delete evidence.' });
  }
});

// Upload event logo
router.post('/:eventId/logo', requireRole(['Event Admin', 'SuperAdmin']), uploadLogo.single('logo'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const logoFile = req.file;
    
    if (!logoFile) {
      res.status(400).json({ error: 'No logo file uploaded.' });
      return;
    }
    
    // Convert Multer File to EventLogo format
    const logoData = {
      filename: logoFile.originalname,
      mimetype: logoFile.mimetype,
      size: logoFile.size,
      data: logoFile.buffer
    };
    
    const result = await eventService.uploadEventLogo(eventId, logoData);
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Upload logo error:', error);
    res.status(500).json({ error: 'Failed to upload logo.' });
  }
});

// Get event logo
router.get('/:eventId/logo', async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    
    const result = await eventService.getEventLogo(eventId);
    
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    
    const logo = result.data;
    
    if (!logo) {
      res.status(404).json({ error: 'Logo not found.' });
      return;
    }
    
    res.setHeader('Content-Type', logo.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${logo.filename}"`);
    res.send(logo.data);
  } catch (error: any) {
    console.error('Get logo error:', error);
    res.status(500).json({ error: 'Failed to get logo.' });
  }
});

// Get event by slug
router.get('/slug/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    
    // First get the event ID by slug
    const eventId = await eventService.getEventIdBySlug(slug);
    if (!eventId) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    
    // Then get the full event details
    const result = await eventService.getEventById(eventId);
    
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get event by slug error:', error);
    res.status(500).json({ error: 'Failed to fetch event.' });
  }
});

// Update event (by slug)
router.patch('/slug/:slug', requireRole(['Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const updateData = req.body;
    
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'Nothing to update.' });
      return;
    }
    
    const result = await eventService.updateEvent(slug, updateData);
    
    if (!result.success) {
      if (result.error?.includes('already exists')) {
        res.status(409).json({ error: result.error });
      } else if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Event update error:', error);
    res.status(500).json({ error: 'Failed to update event.' });
  }
});

// Get all reports for an event by slug
router.get('/slug/:slug/reports', requireRole(['Reporter', 'Responder', 'Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    
    // Parse query parameters
    const pageParam = req.query.page as string;
    const limitParam = req.query.limit as string;
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const severity = req.query.severity as string;
    const assigned = req.query.assigned as string;
    const sort = req.query.sort as string || 'createdAt';
    const order = req.query.order as string || 'desc';
    const userId = req.query.userId as string; // For filtering user's own reports
    const includeStats = req.query.includeStats === 'true';

    // Validate pagination
    if ((pageParam && (isNaN(page) || page < 1)) || (limitParam && (isNaN(limit) || limit < 1))) {
      res.status(400).json({ error: 'Invalid pagination parameters. Page and limit must be positive integers.' });
      return;
    }

    // Get event ID by slug
    const eventId = await eventService.getEventIdBySlug(slug);
    if (!eventId) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }

    // Get authenticated user for role-based access
    const user = req.user as any;
    if (!user?.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Build query options
    const queryOptions = {
      page,
      limit,
      search,
      status,
      severity,
      assigned,
      sort,
      order,
      userId,
      includeStats
    };
    
    // Get reports for this event with enhanced filtering
    const result = await reportService.getEventReports(eventId, user.id, queryOptions);
    
    if (!result.success) {
      // Check if it's a validation error
      if (result.error?.includes('Invalid pagination parameters') || 
          result.error?.includes('Limit cannot exceed') ||
          result.error?.includes('Access denied')) {
        res.status(400).json({ error: result.error });
      } else {
        res.status(500).json({ error: result.error });
      }
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get event reports error:', error);
    res.status(500).json({ error: 'Failed to fetch event reports.' });
  }
});

// Test route to verify routing is working
router.get('/slug/:slug/test-export', (req: Request, res: Response) => {
  console.log('[TEST] Test export route reached');
  res.json({ message: 'Test route works', slug: req.params.slug });
});

// Export event reports (CSV/PDF)
router.get('/slug/:slug/reports/export', requireRole(['Reporter', 'Responder', 'Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const format = req.query.format as string;
    const ids = req.query.ids as string; // Comma-separated report IDs
    
    if (!format || !['csv', 'pdf'].includes(format)) {
      res.status(400).json({ error: 'Format must be csv or pdf' });
      return;
    }

    // Get event ID by slug
    const eventId = await eventService.getEventIdBySlug(slug);
    if (!eventId) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Check authentication
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = req.user as any;

    // Build query options for export
    const queryOptions = {
      page: 1,
      limit: 100, // Use maximum allowed limit for export
      search: req.query.search as string,
      status: req.query.status as string,
      severity: req.query.severity as string,
      assigned: req.query.assigned as string,
      sort: 'createdAt',
      order: 'desc' as 'desc',
      userId: req.query.userId as string,
      includeStats: false,
      reportIds: ids ? ids.split(',') : undefined
    };

    const result = await reportService.getEventReports(eventId, user.id, queryOptions);
    
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    const reports = result.data!.reports;
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (format === 'csv') {
      // Generate CSV
      const csvRows = [
        'ID,Title,Type,Status,Severity,Reporter,Assigned,Created,Description'
      ];
      
      reports.forEach(report => {
        const row = [
          report.id,
          `"${report.title.replace(/"/g, '""')}"`, // Escape quotes
          report.type,
          report.state,
          report.severity || '',
          report.reporter?.name || '',
          report.assignedResponder?.name || '',
          new Date(report.createdAt).toISOString(),
          `"${report.description.replace(/"/g, '""')}"` // Escape quotes
        ].join(',');
        csvRows.push(row);
      });
      
      const csvContent = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="reports_${slug}_${currentDate}.csv"`);
      res.send(csvContent);
    } else if (format === 'pdf') {
      // Generate simple text format (placeholder for PDF)
      let textContent = `Event Reports - ${slug}\n`;
      textContent += `Generated: ${new Date().toISOString()}\n\n`;
      
      reports.forEach(report => {
        textContent += `ID: ${report.id}\n`;
        textContent += `Title: ${report.title}\n`;
        textContent += `Type: ${report.type}\n`;
        textContent += `Status: ${report.state}\n`;
        textContent += `Severity: ${report.severity || 'Not specified'}\n`;
        textContent += `Reporter: ${report.reporter?.name || 'Unknown'}\n`;
        textContent += `Assigned: ${report.assignedResponder?.name || 'Unassigned'}\n`;
        textContent += `Created: ${new Date(report.createdAt).toISOString()}\n`;
        textContent += `Description: ${report.description}\n`;
        textContent += '\n---\n\n';
      });
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="reports_${slug}_${currentDate}.txt"`);
      res.send(textContent);
    }
  } catch (error: any) {
    console.error('Export event reports error:', error);
    res.status(500).json({ error: 'Failed to export event reports.' });
  }
});

// Bulk actions for event reports
router.post('/slug/:slug/reports/bulk', requireRole(['Responder', 'Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { action, reportIds, assignedTo, status, notes } = req.body;
    
    if (!action || !reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      res.status(400).json({ error: 'Action and reportIds array are required' });
      return;
    }

    if (!['assign', 'status', 'delete'].includes(action)) {
      res.status(400).json({ error: 'Action must be assign, status, or delete' });
      return;
    }

    // Get event ID by slug
    const eventId = await eventService.getEventIdBySlug(slug);
    if (!eventId) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }

    // Get authenticated user
    const user = req.user as any;
    if (!user?.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Process bulk action
    if (process.env.NODE_ENV !== 'test') {
      console.log('[BULK DEBUG] Calling bulkUpdateReports with:', { eventId, reportIds, action, options: { assignedTo, status, notes, userId: user.id } });
    }
    
    const result = await reportService.bulkUpdateReports(eventId, reportIds, action, {
      assignedTo,
      status,
      notes,
      userId: user.id
    });
    
    if (process.env.NODE_ENV !== 'test') {
      console.log('[BULK DEBUG] Service result:', result);
    }
    
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Bulk action error:', error);
    res.status(500).json({ error: 'Failed to perform bulk action.' });
  }
});

// Create report for event by slug
router.post('/slug/:slug/reports', requireRole(['Reporter', 'Responder', 'Event Admin', 'SuperAdmin']), uploadEvidence.array('evidence'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { type, description, title, incidentAt, parties, location, contactPreference, urgency } = req.body;
    
    if (!type || !description || !title) {
      res.status(400).json({ error: 'Type, description, and title are required.' });
      return;
    }
    
    // Basic title validation
    if (title.length < 10) {
      res.status(400).json({ error: 'Title must be at least 10 characters long.' });
      return;
    }
    
    if (title.length > 70) {
      res.status(400).json({ error: 'Title must be no more than 70 characters long.' });
      return;
    }

    // Get event ID by slug
    const eventId = await eventService.getEventIdBySlug(slug);
    if (!eventId) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }

    // Get authenticated user
    const user = req.user as any;
    if (!user || !user.id) {
      res.status(401).json({ error: 'User not authenticated.' });
      return;
    }
    
    const reportData = {
      eventId,
      type,
      description,
      title,
      reporterId: user.id,
      incidentAt: incidentAt ? new Date(incidentAt) : null,
      parties,
      location,
      contactPreference,
      urgency
    };
    
    // Handle file uploads if any
    const multerFiles = req.files as Express.Multer.File[] | undefined;
    const evidenceFiles = multerFiles?.map(file => ({
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      data: file.buffer,
      uploaderId: user.id
    }));
    
    const result = await reportService.createReport(reportData, evidenceFiles);
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
      return;
    }

    // Trigger notifications for new report submission
    try {
      if (result.data?.report?.id) {
        await notifyReportEvent(result.data.report.id, 'report_submitted', user.id);
      }
    } catch (notificationError) {
      console.error('Failed to send notifications for new report:', notificationError);
      // Don't fail the main operation if notifications fail
    }

    res.status(201).json(result.data);
  } catch (error: any) {
    console.error('Create report by slug error:', error);
    res.status(500).json({ error: 'Failed to create report.' });
  }
});

// Get user's roles for an event by slug
router.get('/slug/:slug/my-roles', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    
    // Check authentication
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = req.user as any;
    const result = await eventService.getUserRolesBySlug(user.id, slug);
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else {
        res.status(500).json({ error: result.error });
      }
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get user roles by slug error:', error);
    res.status(500).json({ error: 'Failed to fetch user roles.' });
  }
});

// Get event reports by slug (with access control)
router.get('/slug/:slug/reports/:reportId', async (req: Request, res: Response): Promise<void> => {
  const { slug, reportId } = req.params;
  
  // Check authentication
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const user = req.user as any;
    
    // First get the report to check access
    const result = await reportService.getReportBySlugAndId(slug, reportId);
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else {
        res.status(500).json({ error: result.error });
      }
      return;
    }

    // Check access control using the service
    const accessResult = await reportService.checkReportAccess(user.id, reportId);
    
    if (!accessResult.success) {
      res.status(500).json({ error: accessResult.error });
      return;
    }

    if (!accessResult.data!.hasAccess) {
      res.status(403).json({ error: 'Forbidden: insufficient role' });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get report by slug error:', error);
    res.status(500).json({ error: 'Failed to fetch report.' });
  }
});

// Get event logo by slug
router.get('/slug/:slug/logo', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    
    const result = await eventService.getEventLogo(slug);
    
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    const { filename, mimetype, data } = result.data!;
    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(data);
  } catch (error: any) {
    console.error('Get event logo error:', error);
    res.status(500).json({ error: 'Failed to get event logo.' });
  }
});

// Upload event logo by slug
router.post('/slug/:slug/logo', requireRole(['Event Admin', 'SuperAdmin']), uploadLogo.single('logo'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const logoFile = req.file;
    
    if (!logoFile) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }
    
    // Convert Multer File to EventLogo format
    const logoData = {
      filename: logoFile.originalname,
      mimetype: logoFile.mimetype,
      size: logoFile.size,
      data: logoFile.buffer
    };
    
    const result = await eventService.uploadEventLogo(slug, logoData);
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
      return;
    }
    
    res.json(result.data);
  } catch (error: any) {
    console.error('Upload logo by slug error:', error);
    res.status(500).json({ error: 'Failed to upload logo.' });
  }
});

// Get invites for event by slug (requires Admin/SuperAdmin permissions)
router.get('/slug/:slug/invites', requireRole(['Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    
    // Check if event exists by slug
    const eventId = await eventService.getEventIdBySlug(slug);
    if (!eventId) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    
    const result = await inviteService.getEventInvites(eventId);
    
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }
    
    res.json(result.data);
  } catch (error: any) {
    console.error('Get invites by slug error:', error);
    res.status(500).json({ error: 'Failed to fetch invites.' });
  }
});

// Create invite for event by slug
router.post('/slug/:slug/invites', requireRole(['Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { maxUses, expiresAt, note, role } = req.body;
    
    // Check authentication
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = req.user as any;
    
    // Check if event exists by slug
    const eventId = await eventService.getEventIdBySlug(slug);
    if (!eventId) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    
    // Get role ID from role name
    const roleRecord = await prisma.role.findUnique({ where: { name: role || 'Reporter' } });
    if (!roleRecord) {
      res.status(400).json({ error: 'Invalid role specified.' });
      return;
    }
    
    const inviteData = {
      eventId,
      createdByUserId: user.id,
      roleId: roleRecord.id,
      maxUses: maxUses ? parseInt(maxUses) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      note
    };
    
    const result = await inviteService.createInvite(inviteData);
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    
    res.status(201).json(result.data);
  } catch (error: any) {
    console.error('Create invite by slug error:', error);
    res.status(500).json({ error: 'Failed to create invite.' });
  }
});

// Update invite by slug
router.patch('/slug/:slug/invites/:inviteId', requireRole(['Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, inviteId } = req.params;
    const updateData = req.body;
    
    // Check if event exists first
    const eventId = await eventService.getEventIdBySlug(slug);
    if (!eventId) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    
    const result = await inviteService.updateInvite(inviteId, updateData);
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
      return;
    }
    
    res.json(result.data);
  } catch (error: any) {
    console.error('Update invite error:', error);
    res.status(500).json({ error: 'Failed to update invite.' });
  }
});

// Create comment on report by slug
router.post('/slug/:slug/reports/:reportId/comments', requireRole(['Reporter', 'Responder', 'Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, reportId } = req.params;
    const { body, visibility = 'public', isMarkdown = false } = req.body;
    
    // Check authentication
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = req.user as any;
    
    // Validate input
    if (!body || body.trim().length === 0) {
      res.status(400).json({ error: 'Comment body is required.' });
      return;
    }
    
    if (body.length > 5000) {
      res.status(400).json({ error: 'Comment body must be no more than 5000 characters.' });
      return;
    }
    
    // Check if event exists by slug
    const eventId = await eventService.getEventIdBySlug(slug);
    if (!eventId) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    
    // Verify report exists and belongs to this event
    const reportResult = await reportService.getReportById(reportId);
    if (!reportResult.success) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    
    if (reportResult.data?.report.eventId !== eventId) {
      res.status(404).json({ error: 'Report not found in this event.' });
      return;
    }
    
    // Check access control using the service
    const accessResult = await reportService.checkReportAccess(user.id, reportId);
    if (!accessResult.success) {
      res.status(500).json({ error: accessResult.error });
      return;
    }

    if (!accessResult.data!.hasAccess) {
      res.status(403).json({ error: 'Forbidden: insufficient role' });
      return;
    }
    
    // Check if user can create internal comments
    const roles = accessResult.data!.roles;
    const hasResponderRole = roles.some((role: string) => ['Event Admin', 'Responder', 'SuperAdmin'].includes(role));
    
    if (visibility === 'internal' && !hasResponderRole) {
      res.status(403).json({ error: 'Only Responders, Admins, and SuperAdmins can create internal comments.' });
      return;
    }
    
    // Create the comment
    const commentData = {
      reportId,
      authorId: user.id,
      body: body.trim(),
      visibility: visibility as CommentVisibility,
      isMarkdown: Boolean(isMarkdown)
    };
    
    const result = await commentService.createComment(commentData);
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    // Create notifications for comment added (exclude the comment author)
    try {
      await notifyReportEvent(reportId, 'comment_added', user.id);
    } catch (error) {
      console.error('Failed to create comment notification:', error);
      // Don't fail the request if notification creation fails
    }

    res.status(201).json(result.data);
  } catch (error: any) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment.' });
  }
});

// Get comments for report by slug
router.get('/slug/:slug/reports/:reportId/comments', requireRole(['Reporter', 'Responder', 'Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, reportId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const visibility = req.query.visibility as string;
    const search = req.query.search as string;
    const sortBy = req.query.sortBy as 'createdAt' | 'updatedAt' | undefined;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;
    
    // Check authentication
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = req.user as any;
    
    // Check if event exists by slug
    const eventId = await eventService.getEventIdBySlug(slug);
    if (!eventId) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    
    // Verify report exists and belongs to this event
    const reportResult = await reportService.getReportById(reportId);
    if (!reportResult.success) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    
    if (reportResult.data?.report.eventId !== eventId) {
      res.status(404).json({ error: 'Report not found in this event.' });
      return;
    }
    
    // Check access control using the service
    const accessResult = await reportService.checkReportAccess(user.id, reportId);
    if (!accessResult.success) {
      res.status(500).json({ error: accessResult.error });
      return;
    }

    if (!accessResult.data!.hasAccess) {
      res.status(403).json({ error: 'Forbidden: insufficient role' });
      return;
    }
    
    // Determine what comment visibility levels this user can see
    const roles = accessResult.data!.roles;
    const report = reportResult.data!.report;
    const isReporter = report.reporterId === user.id;
    const isAssigned = report.assignedResponderId === user.id;
    const hasResponderRole = roles.some((role: string) => ['Event Admin', 'Responder', 'SuperAdmin'].includes(role));
    
    // Users can see public comments, and internal comments if they have responder/admin permissions
    let allowedVisibilities: CommentVisibility[] = ['public'];
    if (isAssigned || hasResponderRole) {
      allowedVisibilities.push('internal');
    }
    
    // If a specific visibility is requested, check if user has permission
    let requestedVisibility = visibility as CommentVisibility;
    if (requestedVisibility && !allowedVisibilities.includes(requestedVisibility)) {
      res.status(403).json({ error: 'Not authorized to view comments with that visibility level.' });
      return;
    }
    
    // Get comments (if no specific visibility requested, get all visible ones)
    const result = await commentService.getReportComments(reportId, {
      page,
      limit,
      visibility: requestedVisibility,
      search,
      sortBy,
      sortOrder
    });
    
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }
    
    // Filter comments by allowed visibility levels if no specific visibility was requested
    let filteredComments = result.data?.comments || [];
    if (!requestedVisibility) {
      filteredComments = (result.data?.comments || []).filter((comment: any) => 
        allowedVisibilities.includes(comment.visibility)
      );
    }

    res.json({
      ...result.data,
      comments: filteredComments
    });
  } catch (error: any) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments.' });
  }
});

// Update report by slug (handles state, assignment, etc.)
router.patch('/slug/:slug/reports/:reportId', requireRole(['Responder', 'Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, reportId } = req.params;
    const updateData = req.body;
    
    // Check authentication
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = req.user as any;
    
    // Check if event exists by slug
    const eventId = await eventService.getEventIdBySlug(slug);
    if (!eventId) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    
    // Verify report exists and belongs to this event
    const reportResult = await reportService.getReportById(reportId);
    if (!reportResult.success) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    
    if (reportResult.data?.report.eventId !== eventId) {
      res.status(404).json({ error: 'Report not found in this event.' });
      return;
    }
    
    // Check access control using the service
    const accessResult = await reportService.checkReportAccess(user.id, reportId);
    if (!accessResult.success) {
      res.status(500).json({ error: accessResult.error });
      return;
    }

    if (!accessResult.data!.hasAccess) {
      res.status(403).json({ error: 'Forbidden: insufficient role' });
      return;
    }
    
    // Use the report service's update method
    const result = await reportService.updateReport(slug, reportId, updateData);
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else if (result.error?.includes('Insufficient permissions')) {
        res.status(403).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Failed to update report.' });
  }
});

// Update report title by slug (Reporters can edit their own report titles)
router.patch('/slug/:slug/reports/:reportId/title', requireRole(['Reporter', 'Responder', 'Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, reportId } = req.params;
    const { title } = req.body;
    
    // Check authentication
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = req.user as any;
    
    if (!title) {
      res.status(400).json({ error: 'Title is required.' });
      return;
    }
    
    // Basic title validation
    if (title.length < 10) {
      res.status(400).json({ error: 'Title must be at least 10 characters long.' });
      return;
    }
    
    if (title.length > 70) {
      res.status(400).json({ error: 'Title must be no more than 70 characters long.' });
      return;
    }
    
    // Check if event exists by slug
    const eventId = await eventService.getEventIdBySlug(slug);
    if (!eventId) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    
    const result = await reportService.updateReportTitle(eventId, reportId, title, user.id);
    
    if (!result.success) {
      if (result.error?.includes('Insufficient permissions')) {
        res.status(403).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Update report title error:', error);
    res.status(500).json({ error: 'Failed to update report title.' });
  }
});

// Upload evidence for report by slug
router.post('/slug/:slug/reports/:reportId/evidence', requireRole(['Reporter', 'Responder', 'Event Admin', 'SuperAdmin']), uploadEvidence.array('evidence'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, reportId } = req.params;
    
    // Check authentication
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = req.user as any;
    const evidenceFiles = req.files as Express.Multer.File[];
    
    if (!evidenceFiles || evidenceFiles.length === 0) {
      res.status(400).json({ error: 'No evidence files uploaded.' });
      return;
    }
    
    // Check if event exists by slug
    const eventId = await eventService.getEventIdBySlug(slug);
    if (!eventId) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    
    // Verify report exists and belongs to this event
    const reportResult = await reportService.getReportById(reportId);
    if (!reportResult.success) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    
    if (reportResult.data?.report.eventId !== eventId) {
      res.status(404).json({ error: 'Report not found in this event.' });
      return;
    }
    
    // Check access control using the service
    const accessResult = await reportService.checkReportAccess(user.id, reportId);
    if (!accessResult.success) {
      res.status(500).json({ error: accessResult.error });
      return;
    }

    if (!accessResult.data!.hasAccess) {
      res.status(403).json({ error: 'Forbidden: insufficient role' });
      return;
    }

    // Additional check for Reporters: they can only upload evidence to their own reports
    const report = reportResult.data!.report;
    const roles = accessResult.data!.roles;
    const isReporter = roles.includes('Reporter') && !roles.some((role: string) => ['Responder', 'Event Admin', 'SuperAdmin'].includes(role));
    
    if (isReporter && report.reporterId !== user.id) {
      res.status(403).json({ error: 'Reporters can only upload evidence to their own reports.' });
      return;
    }
    
    const evidenceData = evidenceFiles.map(file => ({
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      data: file.buffer,
      uploaderId: user.id
    }));
    
    const result = await reportService.uploadEvidenceFiles(reportId, evidenceData);
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Upload evidence error:', error);
    res.status(500).json({ error: 'Failed to upload evidence.' });
  }
});

// Get evidence files for report by slug
router.get('/slug/:slug/reports/:reportId/evidence', requireRole(['Reporter', 'Responder', 'Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, reportId } = req.params;
    
    // Check authentication
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = req.user as any;
    
    // Check if event exists by slug
    const eventId = await eventService.getEventIdBySlug(slug);
    if (!eventId) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    
    // Verify report exists and belongs to this event
    const reportResult = await reportService.getReportById(reportId);
    if (!reportResult.success) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    
    if (reportResult.data?.report.eventId !== eventId) {
      res.status(404).json({ error: 'Report not found in this event.' });
      return;
    }
    
    // Check access control using the service
    const accessResult = await reportService.checkReportAccess(user.id, reportId);
    if (!accessResult.success) {
      res.status(500).json({ error: accessResult.error });
      return;
    }

    if (!accessResult.data!.hasAccess) {
      res.status(403).json({ error: 'Forbidden: insufficient role' });
      return;
    }
    
    const result = await reportService.getEvidenceFiles(reportId);
    
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get evidence files error:', error);
    res.status(500).json({ error: 'Failed to fetch evidence files.' });
  }
});

// Delete evidence file by slug
router.delete('/slug/:slug/reports/:reportId/evidence/:evidenceId', requireRole(['Responder', 'Event Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, reportId, evidenceId } = req.params;
    
    // Check authentication
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = req.user as any;
    
    // Check if event exists by slug
    const eventId = await eventService.getEventIdBySlug(slug);
    if (!eventId) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    
    // Verify report exists and belongs to this event
    const reportResult = await reportService.getReportById(reportId);
    if (!reportResult.success) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    
    if (reportResult.data?.report.eventId !== eventId) {
      res.status(404).json({ error: 'Report not found in this event.' });
      return;
    }
    
    // Check access control using the service
    const accessResult = await reportService.checkReportAccess(user.id, reportId);
    if (!accessResult.success) {
      res.status(500).json({ error: accessResult.error });
      return;
    }

    if (!accessResult.data!.hasAccess) {
      res.status(403).json({ error: 'Forbidden: insufficient role' });
      return;
    }
    
    const result = await reportService.deleteEvidenceFile(evidenceId);
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ message: 'Evidence deleted successfully.' });
  } catch (error: any) {
    console.error('Delete evidence error:', error);
    res.status(500).json({ error: 'Failed to delete evidence.' });
  }
});

export default router; 