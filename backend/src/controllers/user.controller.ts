import { Request, Response } from 'express';
import { UserService } from '../services';

// User interface for Express session
interface User {
  id: string;
  email: string;
  name: string;
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export class UserController {
  constructor(private userService: UserService) {}

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const result = await this.userService.updateProfile(userId, req.body);
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json(result.data);
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      const result = await this.userService.changePassword(userId, currentPassword, newPassword);
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json({ message: result.data.message });
    } catch (error) {
      console.error('Change password error:', error);
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

      const result = await this.userService.uploadAvatar(userId, file);
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json(result.data);
    } catch (error) {
      console.error('Upload avatar error:', error);
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
      res.set({
        'Content-Type': avatar.mimeType,
        'Content-Length': avatar.data.length.toString(),
        'Cache-Control': 'public, max-age=86400' // 24 hours
      });
      
      res.send(avatar.data);
    } catch (error) {
      console.error('Get avatar error:', error);
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

      res.status(200).json({ message: result.data.message });
    } catch (error) {
      console.error('Delete avatar error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserEvents(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const result = await this.userService.getUserEvents(userId);
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json(result.data);
    } catch (error) {
      console.error('Get user events error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserReports(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Parse query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const eventFilter = req.query.eventFilter as string;
      const statusFilter = req.query.statusFilter as string;
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';

      const result = await this.userService.getUserReports(userId, {
        page,
        limit,
        eventFilter,
        statusFilter,
        sortBy,
        sortOrder
      });
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json(result.data);
    } catch (error) {
      console.error('Get user reports error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getQuickStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const result = await this.userService.getQuickStats(userId);
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json(result.data);
    } catch (error) {
      console.error('Get quick stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getActivity(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const result = await this.userService.getActivity(userId, limit);
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json(result.data);
    } catch (error) {
      console.error('Get activity error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async leaveEvent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { eventId } = req.params;
      
      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const result = await this.userService.leaveEvent(userId, eventId);
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(200).json({ message: result.data.message });
    } catch (error) {
      console.error('Leave event error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
} 