import { Request, Response } from 'express';
import { UserService } from '../services';
import logger from '../config/logger';

// Simple user interface that matches what Passport provides
interface AuthUser {
  id: string;
  email: string;
  name: string;
  [key: string]: any; // For other Prisma fields
}

// Using standard Express Request type

export class UserController {
  constructor(private userService: UserService) {}

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as any; const userId = user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      const result = await this.userService.changePassword(userId, { currentPassword, newPassword });
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json({ message: result.data?.message || 'Password changed successfully' });
    } catch (error) {
      logger().error('Change password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const file = req.file;
      
      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Convert Express.Multer.File to AvatarUpload
      const avatarData = {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        data: file.buffer
      };

      const result = await this.userService.uploadAvatar(userId, avatarData);
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json(result.data);
    } catch (error) {
      logger().error('Upload avatar error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAvatar(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      const result = await this.userService.getAvatar(userId);
      
      if (!result.success) {
        res.status(404).json({ error: result.error });
        return;
      }

      const avatar = result.data;
      if (!avatar) {
        res.status(404).json({ error: 'Avatar not found' });
        return;
      }

      res.set({
        'Content-Type': avatar.mimetype,
        'Content-Length': avatar.data.length.toString(),
        'Cache-Control': 'public, max-age=86400' // 24 hours
      });
      
      res.send(avatar.data);
    } catch (error) {
      logger().error('Get avatar error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteAvatar(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      const result = await this.userService.deleteAvatar(userId);
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json({ message: 'Avatar deleted successfully' });
    } catch (error) {
      logger().error('Delete avatar error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserEvents(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as any; const userId = user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await this.userService.getUserEvents(userId);
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json(result.data);
    } catch (error) {
      logger().error('Get user events error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserIncidents(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as any; const userId = user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Parse query parameters - fix field name to match service interface
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const event = req.query.eventFilter as string;
      const status = req.query.statusFilter as string;
      const sort = req.query.sortBy as string || 'createdAt';
      const order = req.query.sortOrder as 'asc' | 'desc' || 'desc';

      const result = await this.userService.getUserIncidents(userId, {
        page,
        limit,
        event,
        status,
        sort,
        order
      });
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json(result.data);
    } catch (error) {
      logger().error('Get user reports error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getQuickStats(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as any; const userId = user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await this.userService.getQuickStats(userId);
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json(result.data);
    } catch (error) {
      logger().error('Get quick stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getActivity(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as any; const userId = user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await this.userService.getActivity(userId);
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json(result.data);
    } catch (error) {
      logger().error('Get activity error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async leaveEvent(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as any; const userId = user?.id;
      const { eventId } = req.params;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await this.userService.leaveEvent(userId, eventId);
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json({ message: result.data?.message || 'Left event successfully' });
    } catch (error) {
      logger().error('Leave event error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
} 