import { Router, Request, Response } from 'express';
import { EventService } from '../../services/event.service';
import { InviteService } from '../../services/invite.service';
import { requireRole } from '../../middleware/rbac';
import { PrismaClient } from '@prisma/client';
import { createUploadMiddleware } from '../../utils/upload';
import logger from '../../config/logger';

const router = Router({ mergeParams: true });
const prisma = new PrismaClient();
const eventService = new EventService(prisma);
const inviteService = new InviteService(prisma);

const uploadLogo = createUploadMiddleware({
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
  maxSizeMB: 5,
  allowedExtensions: ['png', 'jpg', 'jpeg']
});

// Get an event by its slug or ID
router.get('/', async (req: Request, res: Response): Promise<void> => {
  logger().debug('[Event GET /] slug:', req.params.slug, 'eventId:', req.params.eventId, 'req.path:', req.path);
  try {
    const { slug, eventId } = req.params;
    
    let actualEventId: string | null = null;
    
    if (slug) {
      // Route accessed via /slug/:slug
      actualEventId = await eventService.getEventIdBySlug(slug);
      if (!actualEventId) {
        res.status(404).json({ error: 'Event not found.' });
        return;
      }
    } else if (eventId) {
      // Route accessed via /:eventId
      actualEventId = eventId;
    } else {
      res.status(400).json({ error: 'Event slug or ID is required.' });
      return;
    }

    const result = await eventService.getEventById(actualEventId);
    if (result.success && result.data) {
      res.json({ event: result.data.event || null });
    } else {
      res.status(404).json({ error: result.error });
    }
  } catch (error: any) {
    logger().error('Get event by slug/ID error:', error);
    res.status(500).json({ error: 'Failed to fetch event.' });
  }
});

// Get my roles for an event
router.get('/my-roles', requireRole(['reporter', 'responder', 'event_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const user = req.user as any;
    
    if (!slug) {
      res.status(400).json({ error: 'Event slug is required.' });
      return;
    }
    
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
    logger().error('Get my roles error:', error);
    res.status(500).json({ error: 'Failed to fetch your roles for this event.' });
  }
});

// Get event stats
router.get('/stats', requireRole(['responder', 'event_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const user = req.user as any;
    
    if (!slug) {
      res.status(400).json({ error: 'Event slug is required.' });
      return;
    }

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
    logger().error('Get event stats error:', error);
    res.status(500).json({ error: 'Failed to fetch event stats.' });
  }
});

// Get event card stats
router.get('/cardstats', requireRole(['reporter', 'responder', 'event_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const user = req.user as any;
    
    if (!slug) {
      res.status(400).json({ error: 'Event slug is required.' });
      return;
    }

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
    logger().error('Get event card stats error:', error);
    res.status(500).json({ error: 'Failed to fetch event card stats.' });
  }
});

// Get event members
router.get('/members', requireRole(['event_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const result = await eventService.getEventUsers(eventId);
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(404).json({ error: result.error });
    }
  } catch (error: any) {
    logger().error('Get event members error:', error);
    res.status(500).json({ error: 'Failed to get event members.' });
  }
});

// Invite a user to an event
router.post('/invites', requireRole(['event_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { email, role, note, maxUses, expiresAt } = req.body;
    const inviter = req.user as any;

    const roleRecord = await prisma.unifiedRole.findFirst({ where: { name: role } });
    if (!roleRecord) {
        res.status(400).json({ error: 'Invalid role provided.' });
        return;
    }

    const inviteData = {
        eventId,
        createdByUserId: inviter.id,
        roleId: roleRecord.id,
        note,
        maxUses,
        expiresAt,
    };

    const result = await inviteService.createInvite(inviteData);
    if (result.success) {
      res.status(201).json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    logger().error('Create invite error:', error);
    res.status(500).json({ error: 'Failed to create invite.' });
  }
});

// Get event invites
router.get('/invites', requireRole(['event_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const result = await inviteService.getEventInvites(eventId);
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(404).json({ error: result.error });
    }
  } catch (error: any) {
    logger().error('Get event invites error:', error);
    res.status(500).json({ error: 'Failed to get event invites.' });
  }
});

// Update event details
router.patch('/', requireRole(['event_admin']), uploadLogo.single('logo'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    if (!slug) {
      res.status(400).json({ error: 'Event slug is required.' });
      return;
    }
    const result = await eventService.updateEvent(slug, req.body);
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error: any) {
    logger().error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event.' });
  }
});

export default router;