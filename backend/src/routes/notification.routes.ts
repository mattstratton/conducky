import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { UserResponse } from '../types';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const notificationService = new NotificationService(prisma);






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

// Delete notification
router.delete('/:notificationId', async (req: any, res: Response): Promise<void> => {
  const { notificationId } = req.params;

  try {
    // Check authentication first
    if (!req.user?.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const result = await notificationService.deleteNotification(notificationId, req.user.id);
    
    if (!result.success) {
      if (result.error?.includes('not found')) {
        res.status(404).json({ error: result.error });
      } else if (result.error?.includes('Not authorized')) {
        res.status(403).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
      return;
    }

    res.json(result.data);
  } catch (err: any) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: 'Failed to delete notification.' });
  }
});

export default router; 