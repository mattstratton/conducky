import { Router, Request, Response } from 'express';
import { EventService } from '../../services/event.service';
import { requireRole } from '../../middleware/rbac';
import { createPrismaClient } from '../../config/prisma-client';
import logger from '../../config/logger';

const router = Router({ mergeParams: true });
const prisma = createPrismaClient();
const eventService = new EventService(prisma);

// Get my roles for an event
router.get('/my-roles', requireRole(['reporter', 'responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
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

// Get event users (by slug or id)
router.get('/', requireRole(['reporter', 'responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
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
    
    let result;
    if (slug) {
        result = await eventService.getEventUsersBySlug(slug, query);
    } else {
        res.status(400).json({ error: 'Event slug is required.' });
        return;
    }
    
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
    logger().error('Get event users error:', error);
    res.status(500).json({ error: 'Failed to fetch event users.' });
  }
});

// Get individual user profile by event and user ID
router.get('/:userId', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, userId } = req.params;

    if (!slug) {
        res.status(400).json({ error: 'Event slug is required for this route.' });
        return;
    }
    
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
    logger().error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// Get user activity timeline by event and user ID
router.get('/:userId/activity', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!slug) {
        res.status(400).json({ error: 'Event slug is required for this route.' });
        return;
    }
    
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
    logger().error('Get user activity error:', error);
    res.status(500).json({ error: 'Failed to fetch user activity.' });
  }
});

// Get user's incidents by event and user ID
router.get('/:userId/incidents', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string; // 'submitted' or 'assigned'
    
    if (!slug) {
        res.status(400).json({ error: 'Event slug is required for this route.' });
        return;
    }

    const result = await eventService.getUserIncidents(slug, userId, { page, limit, type });
    
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
    logger().error('Get user incidents error:', error);
    res.status(500).json({ error: 'Failed to fetch user incidents.' });
  }
});

// Update event user
router.patch('/:userId', requireRole(['event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, userId } = req.params;
    const { name, email, role } = req.body;

    if (!slug) {
        res.status(400).json({ error: 'Event slug is required for this route.' });
        return;
    }
    
    if (!name || !email || !role) {
      res.status(400).json({ error: 'Name, email, and role are required.' });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format.' });
      return;
    }
    
    const validRoles = ['system_admin', 'event_admin', 'responder', 'reporter'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be one of: System Admin, Admin, Responder, Reporter.' });
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
    logger().error('Update event user error:', error);
    res.status(500).json({ error: 'Failed to update event user.' });
  }
});

// Remove user from event
router.delete('/:userId', requireRole(['event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, userId } = req.params;

    if (!slug) {
        res.status(400).json({ error: 'Event slug is required for this route.' });
        return;
    }
    
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
    logger().error('Remove user from event error:', error);
    res.status(500).json({ error: 'Failed to remove user from event.' });
  }
});

export default router; 