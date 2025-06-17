import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { UserResponse } from '../types';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const notificationService = new NotificationService(prisma);

// Get user's notifications with pagination and filtering
router.get('/users/me/notifications', async (req: any, res: Response): Promise<void> => {
  try {
    // Check authentication first
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

// Mark notification as read
router.patch('/:notificationId/read', async (req: any, res: Response): Promise<void> => {
  const { notificationId } = req.params;

  try {
    // Check authentication first
    if (!req.user?.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Check if notification belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    if (notification.userId !== req.user.id) {
      res.status(403).json({ error: 'Not authorized to access this notification' });
      return;
    }

    // Mark as read if not already read
    if (!notification.isRead) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { 
          isRead: true,
          readAt: new Date()
        }
      });
    }

    res.json({ message: 'Notification marked as read' });

  } catch (err: any) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

// Get notification statistics for user
router.get('/users/me/notifications/stats', async (req: any, res: Response): Promise<void> => {
  try {
    // Check authentication first
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

export default router; 