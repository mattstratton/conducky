import { Router, Request, Response } from 'express';
import { InviteService } from '../services/invite.service';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const inviteService = new InviteService(prisma);

// Get invite details by code
router.get('/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    
    const result = await inviteService.getInviteByCode(code);
    
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get invite details error:', error);
    res.status(500).json({ error: 'Failed to get invite details.' });
  }
});

// Redeem invite code
router.post('/:code/redeem', async (req: any, res: Response): Promise<void> => {
  try {
    // TODO: Add authentication check
    if (!req.user?.id) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const { code } = req.params;
    
    const result = await inviteService.redeemInvite({
      userId: req.user.id,
      code: code
    });
    
    if (!result.success) {
      // Check for already member conflict to return correct status code
      if (result.error === 'You are already a member of this event.') {
        res.status(409).json({ error: result.error });
        return;
      }
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Invite redeem error:', error);
    res.status(500).json({ error: 'Failed to redeem invite.' });
  }
});

export default router; 