import { emailService } from './email';
import logger from '../config/logger';

const WARNING = [
  '============================================================',
  'EMAIL IS NOT CONFIGURED.',
  'Email verification is DISABLED: new email/password signups are NOT verified.',
  'Email setup is STRONGLY RECOMMENDED.',
  'Set EMAIL_PROVIDER (smtp or sendgrid) and its credentials.',
  'See the admin guide: https://conducky.com/docs/admin-guide/system-configuration#email-configuration',
  '============================================================',
].join('\n');

/** Logs one loud warning at startup when no real email provider is configured. Never throws. */
export async function logEmailSetupWarning(): Promise<void> {
  try {
    if (!(await emailService.isConfigured())) logger().warn(`\n${WARNING}`);
  } catch (error) {
    logger().error(`Could not check email configuration: ${error instanceof Error ? error.message : String(error)}`);
  }
}
