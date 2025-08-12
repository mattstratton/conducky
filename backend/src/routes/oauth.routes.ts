import { Router, Request, Response } from 'express';
import logger from '../config/logger';
import prisma from '../config/database';

const router = Router();

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
        if (setting.key === 'googleOAuth' && Boolean(config?.enabled) && Boolean(config?.clientId)) {
          providers.google = true;
        } else if (setting.key === 'githubOAuth' && Boolean(config?.enabled) && Boolean(config?.clientId)) {
          providers.github = true;
        }
      } catch (parseError) {
        logger().error(`Error parsing ${setting.key} settings:`, parseError);
      }
    });

    res.json({ providers });
  } catch (error) {
    logger().error('Error checking OAuth providers:', error);
    // Return safe defaults to keep login UI functional
    res.json({ providers: { google: false, github: false } });
  }
});

export default router;
