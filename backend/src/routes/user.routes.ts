import { Router, Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { UserController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

const router = Router();
const prisma = new PrismaClient();
const userService = new UserService(prisma);
const userController = new UserController(userService);

// Multer setup for avatar uploads (memory storage, 2MB limit)
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

// Update user profile
router.patch('/me/profile', async (req: any, res: Response): Promise<void> => {
  try {
    const { name, email } = req.body;
    
    if (!req.user?.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const result = await userService.updateProfile(req.user.id, { name, email });
    
    if (!result.success) {
      // Check for email conflict to return correct status code
      if (result.error === 'This email address is already in use.') {
        res.status(409).json({ error: 'This email address is already in use.' });
        return;
      }
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Change password
router.patch('/me/password', async (req: any, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // TODO: Add authentication check
    if (!req.user?.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required.' });
      return;
    }
    
    const result = await userService.changePassword(req.user.id, { currentPassword, newPassword });
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// Get user events
router.get('/me/events', async (req: any, res: Response): Promise<void> => {
  try {
    // TODO: Add authentication check
    if (!req.user?.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const result = await userService.getUserEvents(req.user.id);
    
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get user events error:', error);
    res.status(500).json({ error: 'Failed to fetch user events.' });
  }
});

// Get user reports
router.get('/me/reports', async (req: any, res: Response): Promise<void> => {
  try {
    // TODO: Add authentication check
    if (!req.user?.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    // Parse and validate pagination parameters
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    
    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      res.status(400).json({ error: 'Invalid pagination parameters' });
      return;
    }
    
    // Limit maximum page size
    if (limit > 100) {
      res.status(400).json({ error: 'Limit cannot exceed 100' });
      return;
    }
    
    const query = {
      page,
      limit,
      search: req.query.search as string,
      status: req.query.status as string,
      event: req.query.event as string,
      assigned: req.query.assigned as string,
      sort: req.query.sort as string,
      order: req.query.order as string
    };
    
    const result = await userService.getUserReports(req.user.id, query);
    
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get user reports error:', error);
    res.status(500).json({ error: 'Failed to fetch user reports.' });
  }
});

// Leave an event
router.delete('/me/events/:eventId', async (req: any, res: Response): Promise<void> => {
  try {
    // TODO: Add authentication check
    if (!req.user?.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const { eventId } = req.params;
    
    const result = await userService.leaveEvent(req.user.id, eventId);
    
    if (!result.success) {
      // Check for user not in event to return correct status code
      if (result.error === 'You are not a member of this event.') {
        res.status(404).json({ error: result.error });
        return;
      }
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Leave event error:', error);
    res.status(500).json({ error: 'Failed to leave event.' });
  }
});

// Get quick stats
router.get('/me/quickstats', async (req: any, res: Response): Promise<void> => {
  try {
    // TODO: Add authentication check
    if (!req.user?.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const result = await userService.getQuickStats(req.user.id);
    
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get quick stats error:', error);
    res.status(500).json({ error: 'Failed to fetch quick stats.' });
  }
});

// Get activity
router.get('/me/activity', async (req: any, res: Response): Promise<void> => {
  try {
    // TODO: Add authentication check
    if (!req.user?.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const result = await userService.getActivity(req.user.id);
    
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity.' });
  }
});

// Get user avatar
router.get('/:userId/avatar', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    const result = await userService.getAvatar(userId);
    
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
    console.error('Get user avatar error:', error);
    res.status(500).json({ error: 'Failed to get user avatar.' });
  }
});

// Upload user avatar  
router.post('/:userId/avatar', uploadAvatar.single('avatar'), async (req: any, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    // Check authentication and authorization
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user || req.user.id !== userId) {
      res.status(401).json({ error: 'Not authorized' });
      return;
    }
    
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const avatarData = {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer
    };
    
    const result = await userService.uploadAvatar(userId, avatarData);
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(200).json({ success: true, avatarId: result.data!.avatarId });
  } catch (error: any) {
    console.error('Upload user avatar error:', error);
    res.status(500).json({ error: 'Failed to upload avatar.', details: error.message });
  }
});

// Delete user avatar
router.delete('/:userId/avatar', async (req: any, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    // Check authentication and authorization
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user || req.user.id !== userId) {
      res.status(401).json({ error: 'Not authorized' });
      return;
    }
    
    const result = await userService.deleteAvatar(userId);
    
    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete user avatar error:', error);
    res.status(500).json({ error: 'Failed to delete avatar.', details: error.message });
  }
});

// Get user's notifications with pagination and filtering
router.get('/me/notifications', async (req: any, res: Response): Promise<void> => {
  try {
    // TODO: Add authentication check
    if (!req.user?.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      type,
      priority
    } = req.query;

    // Validate and parse pagination
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 per page
    
    if (pageNum < 1 || limitNum < 1) {
      res.status(400).json({ error: 'Invalid pagination parameters' });
      return;
    }

    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const whereClause: any = { userId: req.user.id };
    
    if (unreadOnly === 'true') {
      whereClause.isRead = false;
    }
    
    if (type) {
      whereClause.type = type;
    }
    
    if (priority) {
      whereClause.priority = priority;
    }

    // Get total count
    const total = await prisma.notification.count({ where: whereClause });

    // Get notifications with related data
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      include: {
        event: {
          select: { id: true, name: true, slug: true }
        },
        report: {
          select: { id: true, title: true, state: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    // Get unread count for the user
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false }
    });

    res.json({
      notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      },
      unreadCount
    });

  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// Get notification statistics for user
router.get('/me/notifications/stats', async (req: any, res: Response): Promise<void> => {
  try {
    // TODO: Add authentication check
    if (!req.user?.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const userId = req.user.id;

    // Get counts by type and priority
    const [
      totalCount,
      unreadCount,
      typeCounts,
      priorityCounts
    ] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.groupBy({
        by: ['type'],
        where: { userId },
        _count: { type: true }
      }),
      prisma.notification.groupBy({
        by: ['priority'],
        where: { userId },
        _count: { priority: true }
      })
    ]);

    const typeStats: any = {};
    typeCounts.forEach((item: any) => {
      typeStats[item.type] = item._count.type;
    });

    const priorityStats: any = {};
    priorityCounts.forEach((item: any) => {
      priorityStats[item.priority] = item._count.priority;
    });

    res.json({
      total: totalCount,
      unread: unreadCount,
      byType: typeStats,
      byPriority: priorityStats
    });

  } catch (err: any) {
    console.error('Error fetching notification stats:', err);
    res.status(500).json({ error: 'Failed to fetch notification statistics.' });
  }
});

// Mark all notifications as read for the current user
router.patch('/me/notifications/read-all', async (req: any, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Update all unread notifications for the user
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({ 
      success: true, 
      message: `Marked ${result.count} notifications as read` 
    });

  } catch (err: any) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
});

export default router; 