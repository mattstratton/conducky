import { Router, Request, Response } from 'express';
import { EventService } from '../services/event.service';
import { ReportService } from '../services/report.service';
import { UserService } from '../services/user.service';
import { InviteService } from '../services/invite.service';
import { requireRole } from '../middleware/rbac';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

// Authenticated request type
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

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
router.delete('/:eventId/roles', requireRole(['Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
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
    
    // Convert multer files to EvidenceFile format
    const evidenceFiles = (req.files as Express.Multer.File[] || []).map(file => ({
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      data: file.buffer
    }));
    
    const result = await reportService.createReport(reportData, evidenceFiles);
    
    if (!result.success) {
      // Check for specific error types and return appropriate status codes
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else if (result.error?.includes('Forbidden') || result.error?.toLowerCase().includes('insufficient')) {
        res.status(403).json({ error: result.error });
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
    const query = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      search: req.query.search as string,
      status: req.query.status as string,
      sort: req.query.sort as string,
      order: req.query.order as string
    };
    
    const result = await reportService.getReportsByEventId(eventId, query);
    
    if (!result.success) {
      // Check for specific error types and return appropriate status codes
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
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

// Get specific report for event
router.get('/:eventId/reports/:reportId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, reportId } = req.params;
    
    if (!eventId || eventId === '') {
      res.status(400).json({ error: 'Event ID is required.' });
      return;
    }
    
    const result = await reportService.getReportById(reportId, eventId);
    
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

// Update report state (Responder/Admin/SuperAdmin only)
router.patch('/:eventId/reports/:reportId/state', requireRole(['Responder', 'Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, reportId } = req.params;
    const { state } = req.body;
    
    if (!state) {
      res.status(400).json({ error: 'State is required.' });
      return;
    }
    
    const validStates = ['submitted', 'acknowledged', 'investigating', 'resolved', 'closed'];
    if (!validStates.includes(state)) {
      res.status(400).json({ error: 'Invalid state.' });
      return;
    }
    
    const result = await reportService.updateReportState(eventId, reportId, state);
    
    if (!result.success) {
      // Check for specific error types and return appropriate status codes
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
router.patch('/:eventId/reports/:reportId/title', async (req: Request, res: Response): Promise<void> => {
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
    
    const result = await reportService.updateReportTitle(eventId, reportId, title, (req as any).user?.id);
    
    if (!result.success) {
      // Check for specific error types and return appropriate status codes
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else if (result.error?.includes('Forbidden') || result.error?.toLowerCase().includes('insufficient')) {
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

// Upload event logo (by slug)
router.post('/slug/:slug/logo', requireRole(['Admin', 'SuperAdmin']), uploadLogo.single('logo'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    const logoData = {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer
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
    console.error('Logo upload error:', error);
    res.status(500).json({ error: 'Failed to upload logo.' });
  }
});

// Get event logo (by slug)
router.get('/slug/:slug/logo', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    
    const result = await eventService.getEventLogo(slug);
    
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    const { filename, mimetype, data } = result.data!;
    
    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': data.length.toString()
    });
    
    res.send(data);
  } catch (error: any) {
    console.error('Logo get error:', error);
    res.status(500).json({ error: 'Failed to get logo.' });
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