import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../config/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/oauth-providers
 * Public endpoint to check OAuth provider availability (no auth required)
 */
router.get('/oauth-providers', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['googleOAuth', 'githubOAuth']
        }
      }
    });

    const providers = {
      google: false,
      github: false
    };

    settings.forEach(setting => {
      try {
        const config = JSON.parse(setting.value);
        if (setting.key === 'googleOAuth' && config.enabled && config.clientId && config.clientSecret) {
          providers.google = true;
        } else if (setting.key === 'githubOAuth' && config.enabled && config.clientId && config.clientSecret) {
          providers.github = true;
        }
      } catch (parseError) {
        logger().error(`Error parsing ${setting.key} settings:`, parseError);
      }
    });

    res.json({ providers });
  } catch (error) {
    logger().error('Error checking OAuth providers:', error);
    res.status(500).json({ error: 'Failed to check OAuth providers' });
  }
});

export default router;
