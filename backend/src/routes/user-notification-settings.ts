import { Router, Response } from 'express';
import { getUserNotificationSettings, updateUserNotificationSettings } from '../services/user-notification-settings.service';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/user/notification-settings
router.get('/', requireAuth, async (req: any, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const settings = await getUserNotificationSettings(userId);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

// PUT /api/user/notification-settings
router.put('/', requireAuth, async (req: any, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const updated = await updateUserNotificationSettings(userId, req.body);
    res.json(updated);
  } catch (err) {
    console.error('Notification settings update error (PUT):', err);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// PATCH /api/user/notification-settings
router.patch('/', requireAuth, async (req: any, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const updated = await updateUserNotificationSettings(userId, req.body);
    res.json(updated);
  } catch (err) {
    console.error('Notification settings update error (PATCH):', err);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

export default router;
