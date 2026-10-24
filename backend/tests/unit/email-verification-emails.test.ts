jest.mock('nodemailer');

import nodemailer = require('nodemailer');

const ENV_KEYS = ['EMAIL_PROVIDER', 'SMTP_HOST', 'SMTP_PORT', 'FRONTEND_BASE_URL', 'SENDGRID_API_KEY'];

describe('EmailService verification additions', () => {
  const saved: Record<string, string | undefined> = {};
  const verify = jest.fn();
  const sendMail = jest.fn();

  // Env must be set before construction: the config is read in the constructor.
  const makeService = () => {
    const { EmailService } = require('../../src/utils/email');
    return new EmailService();
  };

  beforeEach(() => {
    ENV_KEYS.forEach((k) => {
      saved[k] = process.env[k];
      delete process.env[k];
    });
    verify.mockReset();
    sendMail.mockReset().mockResolvedValue({ messageId: 'm1' });
    (nodemailer.createTransport as jest.Mock).mockReset().mockReturnValue({ verify, sendMail });
  });

  afterEach(() => {
    ENV_KEYS.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
  });

  describe('isConfigured', () => {
    it('is false with default (console) env', async () => {
      expect(await makeService().isConfigured()).toBe(false);
    });

    it('is true for smtp when verify resolves', async () => {
      process.env.EMAIL_PROVIDER = 'smtp';
      verify.mockResolvedValue(true);
      expect(await makeService().isConfigured()).toBe(true);
    });

    it('is false when verify rejects (falls back to console)', async () => {
      process.env.EMAIL_PROVIDER = 'smtp';
      verify.mockRejectedValue(new Error('nope'));
      expect(await makeService().isConfigured()).toBe(false);
    });
  });

  describe('isConfigured provider matching', () => {
    it.each(['Console', 'ses', ''])('is false for EMAIL_PROVIDER=%p', async (provider) => {
      process.env.EMAIL_PROVIDER = provider;
      verify.mockResolvedValue(true);
      expect(await makeService().isConfigured()).toBe(false);
    });

    it('is true for uppercase SMTP when verify resolves', async () => {
      process.env.EMAIL_PROVIDER = 'SMTP';
      verify.mockResolvedValue(true);
      expect(await makeService().isConfigured()).toBe(true);
    });

    it('is true for sendgrid with an API key', async () => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      process.env.SENDGRID_API_KEY = 'SG.x';
      verify.mockResolvedValue(true);
      expect(await makeService().isConfigured()).toBe(true);
    });
  });

  describe('maskEmail', () => {
    const { maskEmail } = require('../../src/utils/email');

    it('masks all but the first local character', () => {
      expect(maskEmail('john@example.com')).toBe('j***@example.com');
      expect(maskEmail('a@b.co')).toBe('*@b.co');
    });
  });

  describe('emails', () => {
    const sentMail = () => sendMail.mock.calls[0][0];

    beforeEach(() => {
      process.env.EMAIL_PROVIDER = 'smtp';
      verify.mockResolvedValue(true);
    });

    it('sendVerificationEmail includes the link and 24 hour expiry', async () => {
      await makeService().sendVerificationEmail('u@example.com', 'Ursula', 'abc', {}, 'https://app.test');
      const mail = sentMail();
      expect(mail.to).toBe('u@example.com');
      expect(mail.text).toContain('https://app.test/verify-email?token=abc');
      expect(mail.text).toContain('24 hours');
      expect(mail.html).toContain('/verify-email?token=abc');
    });

    it('sendVerificationEmail escapes the name in HTML', async () => {
      await makeService().sendVerificationEmail('u@example.com', '<b>x</b>', 'abc');
      expect(sentMail().html).not.toContain('<b>x</b>');
    });

    it('sendEmailChangeRequestedNotice masks the new address and advises a password change', async () => {
      await makeService().sendEmailChangeRequestedNotice('old@example.com', 'Ursula', 'n***@new.com');
      const mail = sentMail();
      expect(mail.text).toContain('n***@new.com');
      expect(mail.text).toContain('change your password');
      expect(mail.text).not.toContain('nobody@new.com');
    });

    it('sendEmailChangedNotice contains the masked address only', async () => {
      await makeService().sendEmailChangedNotice('old@example.com', 'Ursula', 'n***@new.com');
      const mail = sentMail();
      expect(mail.text).toContain('n***@new.com');
      expect(mail.html).toContain('n***@new.com');
      expect(mail.text).not.toContain('nobody@new.com');
    });
  });
});
