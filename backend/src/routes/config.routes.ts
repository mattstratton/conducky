import { Router } from 'express';
import { EmailService } from '../utils/email';

const router = Router();

// GET /api/config/email-enabled
router.get('/email-enabled', (_req, res) => {
  try {
    const emailService = new EmailService();
    const config = (emailService as any).config;
    let enabled = false;
    if (config.provider === 'smtp') {
      enabled = !!(config.smtp && config.smtp.host && config.smtp.port && config.smtp.auth && config.smtp.auth.user && config.smtp.auth.pass);
    } else if (config.provider === 'sendgrid') {
      enabled = !!(config.sendgrid && config.sendgrid.apiKey);
    } else if (config.provider === 'console') {
      enabled = true; // Console provider is valid for testing
    }
    res.json({ enabled });
  } catch (err) {
    res.status(500).json({ enabled: false, error: 'Could not determine email configuration.' });
  }
});

export default router;
