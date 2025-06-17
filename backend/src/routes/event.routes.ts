import { Router, Request, Response } from 'express';
import { EventService } from '../services/event.service';
import { ReportService } from '../services/report.service';
import { UserService } from '../services/user.service';
import { InviteService } from '../services/invite.service';
import { requireRole } from '../middleware/rbac';
import { AuthenticatedRequest } from '../types';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

const router = Router();
const prisma = new PrismaClient();
const eventService = new EventService(prisma);
const reportService = new ReportService(prisma);
const userService = new UserService(prisma);
const inviteService = new InviteService(prisma);

// Multer setup for logo uploads (memory storage, 5MB limit)
const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Multer setup for evidence uploads (memory storage, 10MB limit)
const uploadEvidence = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

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
router.post('/:eventId/roles', requireRole(['Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
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
router.delete('/:eventId/roles', requireRole(['Admin', 'SuperAdmin']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
router.post('/:eventId/reports', uploadEvidence.array('evidence'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { type, description, title } = req.body;
    
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
    
    const reportData = {
      eventId,
      type,
      description,
      title,
      // TODO: Add reporter from authentication
      reporterId: 'temp-reporter-id'
    };
    
    // Handle file uploads if any
    const evidenceFiles = req.files as Express.Multer.File[] | undefined;
    
    const result = await reportService.createReport(reportData, evidenceFiles);
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
      return;
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

// Update report state
router.patch('/:eventId/reports/:reportId/state', requireRole(['Admin', 'SuperAdmin', 'Responder']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId, reportId } = req.params;
    const { state, status, priority, assignedToUserId, resolution } = req.body;
    
    // Handle both 'state' and 'status' parameters for compatibility
    const stateValue = state || status;
    
    const result = await reportService.updateReportState(eventId, reportId, stateValue);
    
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
    console.error('Update report state error:', error);
    res.status(500).json({ error: 'Failed to update report state.' });
  }
});

// Update report title
router.patch('/:eventId/reports/:reportId/title', requireRole(['Admin', 'SuperAdmin', 'Reporter']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    
    const result = await reportService.updateReportTitle(eventId, reportId, title, req.user?.id);
    
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

// Upload evidence for report
router.post('/:eventId/reports/:reportId/evidence', requireRole(['Admin', 'SuperAdmin', 'Responder']), uploadEvidence.array('evidence'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    const evidenceFiles = req.files as Express.Multer.File[];
    
    if (!evidenceFiles || evidenceFiles.length === 0) {
      res.status(400).json({ error: 'No evidence files uploaded.' });
      return;
    }
    
    const uploaderId = req.user?.id;
    
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
    
    res.setHeader('Content-Type', evidence.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${evidence.originalName}"`);
    res.send(evidence.buffer);
  } catch (error: any) {
    console.error('Download evidence error:', error);
    res.status(500).json({ error: 'Failed to download evidence.' });
  }
});

// Delete evidence file
router.delete('/:eventId/reports/:reportId/evidence/:evidenceId', requireRole(['Admin', 'SuperAdmin', 'Responder']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
router.post('/:eventId/logo', requireRole(['Admin', 'SuperAdmin']), uploadLogo.single('logo'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const logoFile = req.file;
    
    if (!logoFile) {
      res.status(400).json({ error: 'No logo file uploaded.' });
      return;
    }
    
    const result = await eventService.uploadEventLogo(eventId, logoFile);
    
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
    
    res.setHeader('Content-Type', logo.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${logo.fileName}"`);
    res.send(logo.buffer);
  } catch (error: any) {
    console.error('Get logo error:', error);
    res.status(500).json({ error: 'Failed to get logo.' });
  }
});

// Update event (by slug)
router.patch('/slug/:slug', requireRole(['Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
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

// Get event users (by slug)
router.get('/slug/:slug/users', requireRole(['Responder', 'Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
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

// Update event user (by slug)
router.patch('/slug/:slug/users/:userId', requireRole(['Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, userId } = req.params;
    const { name, email, role } = req.body;
    
    if (!name || !email || !role) {
      res.status(400).json({ error: 'Name, email, and role are required.' });
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
router.delete('/slug/:slug/users/:userId', requireRole(['Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
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

// Get event reports by slug (with access control)
router.get('/slug/:slug/reports/:reportId', async (req: Request, res: Response): Promise<void> => {
  const { slug, reportId } = req.params;
  
  // Check authentication
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
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
    const accessResult = await reportService.checkReportAccess(req.user.id, reportId);
    
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

// Upload event logo by slug
router.post('/slug/:slug/logo', requireRole(['Admin', 'SuperAdmin']), uploadLogo.single('logo'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const logoFile = req.file;
    
    if (!logoFile) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }
    
    const result = await eventService.uploadEventLogo(slug, logoFile);
    
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

// Update invite by slug
router.patch('/slug/:slug/invites/:inviteId', requireRole(['Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
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

export default router; 