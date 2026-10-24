import nodemailer = require('nodemailer');
import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import logger from '../config/logger';

/**
 * Email configuration for different providers
 */
interface EmailConfig {
  provider: string;
  from: string;
  replyTo?: string | null;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth?: {
      user?: string;
      pass?: string;
    };
  };
  sendgrid?: {
    apiKey?: string;
  };
  console?: boolean;
}

/**
 * Email sending options
 */
export interface EmailOptions {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** Plain text content */
  text: string;
  /** HTML content (optional) */
  html?: string;
  /** Sender email (optional, uses default from config) */
  from?: string;
  /** Reply-to address (optional) */
  replyTo?: string;
}

/**
 * Email sending result
 */
export interface EmailResult {
  success: boolean;
  messageId: string;
  provider: string;
}

/**
 * Mask an email address for display: john@example.com -> j***@example.com
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return '***';
  const local = email.slice(0, at);
  return `${local.length === 1 ? '*' : local[0] + '***'}${email.slice(at)}`;
}

/**
 * Email Service - Flexible email sending with multiple provider support
 * Supports SMTP, SendGrid, and console logging for development
 */
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isInitialized: boolean = false;
  private config: EmailConfig;

  constructor() {
    this.config = this.getEmailConfig();
  }

  /**
   * Get email configuration from environment variables
   */
  private getEmailConfig(): EmailConfig {
    const provider = process.env.EMAIL_PROVIDER || 'console'; // Default to console for development

    const config: EmailConfig = {
      provider,
      from: process.env.EMAIL_FROM || 'noreply@conducky.local',
      replyTo: process.env.EMAIL_REPLY_TO || null,
    };

    switch (provider.toLowerCase()) {
      case 'smtp':
        const smtpAuth: { user?: string; pass?: string } | undefined = 
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined;
        
        config.smtp = {
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          ...(smtpAuth && { auth: smtpAuth }),
        };
        break;

      case 'sendgrid':
        if (process.env.SENDGRID_API_KEY) {
          config.sendgrid = { apiKey: process.env.SENDGRID_API_KEY };
        }
        break;

      case 'console':
      default:
        // Development mode - log emails to console
        config.console = true;
        break;
    }

    return config;
  }

  /**
   * Initialize the email transporter based on configuration
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      switch (this.config.provider.toLowerCase()) {
        case 'smtp':
          if (!this.config.smtp) {
            throw new Error('SMTP configuration is missing');
          }
          this.transporter = nodemailer.createTransport(this.config.smtp);
          break;

        case 'sendgrid':
          if (!this.config.sendgrid?.apiKey) {
            throw new Error('SendGrid API key is missing');
          }
          // For SendGrid, we'll use nodemailer with SendGrid's SMTP
          this.transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
              user: 'apikey',
              pass: this.config.sendgrid.apiKey,
            },
          });
          break;

        case 'console':
        default:
          // Development console transporter
          this.transporter = nodemailer.createTransport({
            streamTransport: true,
            newline: 'unix',
            buffer: true,
          });
          break;
      }

      // Test the connection for non-console providers
      if (this.config.provider !== 'console' && this.transporter) {
        await this.transporter.verify();
        logger().info(`[Email] ${this.config.provider} transporter initialized successfully`);
      } else {
        logger().info('[Email] Console mode initialized (emails will be logged)');
      }

      this.isInitialized = true;
    } catch (error: any) {
      logger().error('[Email] Failed to initialize transporter:', error);
      // Fall back to console mode in case of configuration errors
      this.config.provider = 'console';
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
      this.isInitialized = true;
    }
  }

  /**
   * Render an email template with the given data
   * @param templateName - Name of the template file (without extension)
   * @param data - Data to pass to the template
   * @returns Rendered HTML string
   */
  private renderTemplate(templateName: string, data: Record<string, any>): string {
    // Validate and sanitize template name to prevent path traversal
    if (!templateName || typeof templateName !== 'string') {
      throw new Error('Invalid template name');
    }
    
    // Remove any path traversal sequences and only allow alphanumeric, dash, underscore
    const sanitizedTemplateName = templateName.replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitizedTemplateName !== templateName) {
      throw new Error('Template name contains invalid characters');
    }
    
    // Ensure template name is not empty after sanitization
    if (!sanitizedTemplateName) {
      throw new Error('Template name is empty after sanitization');
    }
    
    try {
      const templatePath = path.join(__dirname, '../../email-templates', `${sanitizedTemplateName}.hbs`);
      
      // Additional security: ensure the resolved path is within the email-templates directory
      const emailTemplatesDir = path.resolve(__dirname, '../../email-templates');
      const resolvedTemplatePath = path.resolve(templatePath);
      
      if (!resolvedTemplatePath.startsWith(emailTemplatesDir)) {
        throw new Error('Template path is outside allowed directory');
      }
      
      // Check if file exists before reading
      if (!fs.existsSync(resolvedTemplatePath)) {
        throw new Error(`Template file not found: ${sanitizedTemplateName}`);
      }
      
      const templateSource = fs.readFileSync(resolvedTemplatePath, 'utf8');
      const template = Handlebars.compile(templateSource);
      return template(data);
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'test') {
        logger().error('Failed to render email template:', error);
      }
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Send an email using the configured transporter
   * @param options - Email sending options
   * @returns Promise resolving to email result
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    await this.initialize();

    const { to, subject, text, html, from, replyTo } = options;

    const mailOptions: any = {
      from: from || this.config.from,
      to,
      subject,
      text,
      html,
    };

    // Only add replyTo if it's not null/undefined
    const finalReplyTo = replyTo || this.config.replyTo;
    if (finalReplyTo) {
      mailOptions.replyTo = finalReplyTo;
    }

    try {
      if (this.config.provider === 'console') {
        // Development mode - log email to console
        logger().info('\n=== EMAIL (Console Mode) ===');
        logger().info(`From: ${mailOptions.from}`);
        logger().info(`To: ${mailOptions.to}`);
        logger().info(`Subject: ${mailOptions.subject}`);
        logger().info(`Text:\n${mailOptions.text}`);
        if (mailOptions.html) {
          logger().info(`HTML:\n${mailOptions.html}`);
        }
        logger().info('=== END EMAIL ===\n');
        
        return {
          success: true,
          messageId: `console-${Date.now()}`,
          provider: 'console',
        };
      }

      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const result: any = await this.transporter.sendMail(mailOptions);
      logger().info(`[Email] Sent successfully via ${this.config.provider}:`, result.messageId);
      
      return {
        success: true,
        messageId: result.messageId || `sent-${Date.now()}`,
        provider: this.config.provider,
      };
    } catch (error: any) {
      logger().error('[Email] Failed to send email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send a password reset email
   * @param to - Recipient email address
   * @param name - User's display name
   * @param resetToken - Password reset token
   * @param frontendUrl - Frontend base URL (optional)
   * @returns Promise resolving to email result
   */
  async sendPasswordReset(
    to: string, 
    name: string, 
    resetToken: string, 
    frontendUrl: string = process.env.FRONTEND_BASE_URL || 'http://localhost:3000'
  ): Promise<EmailResult> {
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    const subject = 'Reset Your Conducky Password';
    
    const text = `
Hello ${name || 'there'},

You requested a password reset for your Conducky account.

Please click the following link to reset your password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

Best regards,
The Conducky Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; }
    .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .button:hover { background-color: #0056b3; }
    .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🦆 Conducky</h1>
      <h2>Password Reset Request</h2>
    </div>
    
    <div class="content">
      <p>Hello ${name || 'there'},</p>
      
      <p>You requested a password reset for your Conducky account.</p>
      
      <p>Click the button below to reset your password:</p>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>
      
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px;">
        ${resetUrl}
      </p>
      
      <div class="warning">
        <strong>⏰ Important:</strong> This link will expire in 1 hour for security reasons.
      </div>
      
      <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
    </div>
    
    <div class="footer">
      <p>This email was sent by Conducky Code of Conduct Management System</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return await this.sendEmail({
      to,
      subject,
      text,
      html,
    });
  }

  /**
   * Whether a real email provider is configured and reachable.
   * A failed init falls back to console, which counts as not configured.
   */
  async isConfigured(): Promise<boolean> {
    await this.initialize();
    return this.config.provider !== 'console';
  }

  /**
   * Wrap notice content in the standard HTML email layout.
   * Callers must pass already-escaped content.
   */
  private renderNoticeHtml(title: string, name: string, bodyHtml: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; }
    .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Conducky</h1>
      <h2>${title}</h2>
    </div>

    <div class="content">
      <p>Hello ${Handlebars.escapeExpression(name || 'there')},</p>
      ${bodyHtml}
    </div>

    <div class="footer">
      <p>This email was sent by Conducky Code of Conduct Management System</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Send an email verification link (or an email-change confirmation link)
   * @param to - Address being verified
   * @param name - User's display name
   * @param token - Verification token
   * @param opts - emailChange: true when confirming a new address
   * @param frontendUrl - Frontend base URL (optional)
   */
  async sendVerificationEmail(
    to: string,
    name: string,
    token: string,
    opts: { emailChange?: boolean } = {},
    frontendUrl: string = process.env.FRONTEND_BASE_URL || 'http://localhost:3000'
  ): Promise<EmailResult> {
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
    const subject = opts.emailChange ? 'Confirm Your New Conducky Email Address' : 'Verify Your Conducky Email Address';
    const intro = opts.emailChange
      ? 'Please confirm this address as the new email for your Conducky account.'
      : 'Please verify your email address to finish setting up your Conducky account.';

    const text = `
Hello ${name || 'there'},

${intro}

Please click the following link:
${verifyUrl}

This link will expire in 24 hours.

If you didn't request this, you can ignore this email.

Best regards,
The Conducky Team
    `.trim();

    const html = this.renderNoticeHtml(
      subject,
      name,
      `<p>${intro}</p>
      <div style="text-align: center;">
        <a href="${verifyUrl}" class="button">${opts.emailChange ? 'Confirm Email' : 'Verify Email'}</a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px;">${verifyUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't request this, you can ignore this email.</p>`
    );

    return await this.sendEmail({ to, subject, text, html });
  }

  /**
   * Tell the current address that an email change was requested
   * @param maskedNewEmail - Already-masked new address (see maskEmail)
   */
  async sendEmailChangeRequestedNotice(to: string, name: string, maskedNewEmail: string): Promise<EmailResult> {
    const subject = 'Email Change Requested on Your Conducky Account';
    const text = `
Hello ${name || 'there'},

A request was made to change the email address on your Conducky account to ${maskedNewEmail}.

The change only takes effect once the new address is confirmed. If this wasn't you, change your password right away.

Best regards,
The Conducky Team
    `.trim();

    const html = this.renderNoticeHtml(
      subject,
      name,
      `<p>A request was made to change the email address on your Conducky account to <strong>${Handlebars.escapeExpression(maskedNewEmail)}</strong>.</p>
      <p>The change only takes effect once the new address is confirmed. If this wasn't you, change your password right away.</p>`
    );

    return await this.sendEmail({ to, subject, text, html });
  }

  /**
   * Tell the old address that the account email was changed
   * @param maskedNewEmail - Already-masked new address (see maskEmail)
   */
  async sendEmailChangedNotice(to: string, name: string, maskedNewEmail: string): Promise<EmailResult> {
    const subject = 'Your Conducky Email Address Was Changed';
    const text = `
Hello ${name || 'there'},

The email address on your Conducky account was changed to ${maskedNewEmail}.

If this wasn't you, contact your event or system administrator immediately.

Best regards,
The Conducky Team
    `.trim();

    const html = this.renderNoticeHtml(
      subject,
      name,
      `<p>The email address on your Conducky account was changed to <strong>${Handlebars.escapeExpression(maskedNewEmail)}</strong>.</p>
      <p>If this wasn't you, contact your event or system administrator immediately.</p>`
    );

    return await this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send a welcome email for new users
   * @param to - Recipient email address
   * @param name - User's display name
   * @returns Promise resolving to email result
   */
  async sendWelcomeEmail(to: string, name: string): Promise<EmailResult> {
    const subject = 'Welcome to Conducky!';
    
    const text = `
Hello ${name || 'there'},

Welcome to Conducky! Your account has been successfully created.

Conducky is a code of conduct incident management system designed to help conference organizers and event teams handle reports professionally and efficiently.

You can now log in to your account and start using the system.

If you have any questions, please don't hesitate to reach out.

Best regards,
The Conducky Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Conducky</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; }
    .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🦆 Welcome to Conducky!</h1>
    </div>
    
    <div class="content">
      <p>Hello ${name || 'there'},</p>
      
      <p>Welcome to Conducky! Your account has been successfully created.</p>
      
      <p>Conducky is a code of conduct incident management system designed to help conference organizers and event teams handle reports professionally and efficiently.</p>
      
      <p>You can now log in to your account and start using the system.</p>
      
      <p>If you have any questions, please don't hesitate to reach out.</p>
      
      <p>Best regards,<br>The Conducky Team</p>
    </div>
    
    <div class="footer">
      <p>This email was sent by Conducky Code of Conduct Management System</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return await this.sendEmail({
      to,
      subject,
      text,
      html,
    });
  }

  /**
   * Send a notification email using the externalized template
   * @param to - Recipient email address
   * @param name - User's display name
   * @param subject - Email subject
   * @param message - Main message content
   * @param actionUrl - Optional action URL for button
   * @returns Promise resolving to email result
   */
  async sendNotificationEmail({
    to,
    name,
    subject,
    message,
    actionUrl
  }: {
    to: string;
    name: string;
    subject: string;
    message: string;
    actionUrl?: string;
  }): Promise<EmailResult> {
    const html = this.renderTemplate('notification', { name, subject, message, actionUrl });
    const text = `${message}${actionUrl ? `\n\nView details: ${actionUrl}` : ''}`;
    return await this.sendEmail({ to, subject, text, html });
  }

  /**
   * Test email configuration with database-stored settings
   * @param settings - Email settings from database
   * @param testEmailAddress - Email address to send test email to
   * @returns Promise resolving to test result
   */
  static async testEmailSettings(settings: any, testEmailAddress: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Create a temporary EmailService with database settings
      const testService = new EmailService();
      
      // Override the config with database settings
      const config: EmailConfig = {
        provider: settings.provider || 'console',
        from: settings.fromAddress || 'noreply@conducky.local',
        replyTo: settings.replyTo || null,
      };

      switch (settings.provider?.toLowerCase()) {
        case 'smtp':
          config.smtp = {
            host: settings.smtpHost || 'localhost',
            port: settings.smtpPort || 587,
            secure: settings.smtpSecure || false,
            auth: settings.smtpUsername && settings.smtpPassword ? {
              user: settings.smtpUsername,
              pass: settings.smtpPassword,
            } : undefined,
          };
          break;

        case 'sendgrid':
          if (settings.sendgridApiKey) {
            config.sendgrid = { apiKey: settings.sendgridApiKey };
          }
          break;

        case 'console':
        default:
          config.console = true;
          break;
      }

      // Override the private config
      (testService as any).config = config;
      
      // Force re-initialization
      (testService as any).isInitialized = false;
      (testService as any).transporter = null;

      // Send test email
      const result = await testService.sendEmail({
        to: testEmailAddress,
        subject: 'Conducky Email Configuration Test',
        text: `This is a test email from Conducky to verify your email configuration.

Provider: ${settings.provider}
From: ${settings.fromAddress}
From Name: ${settings.fromName || 'Not set'}

If you received this email, your email configuration is working correctly!

This test was sent at: ${new Date().toISOString()}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Conducky Email Test</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; }
    .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
    .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .config { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🦆 Conducky</h1>
      <h2>Email Configuration Test</h2>
    </div>
    
    <div class="content">
      <div class="success">
        <strong>✅ Success!</strong> This is a test email from Conducky to verify your email configuration.
      </div>
      
      <div class="config">
        <strong>Configuration Details:</strong><br>
        <strong>Provider:</strong> ${settings.provider}<br>
        <strong>From:</strong> ${settings.fromAddress}<br>
        <strong>From Name:</strong> ${settings.fromName || 'Not set'}
      </div>
      
      <p>If you received this email, your email configuration is working correctly!</p>
      
      <p><strong>Test sent at:</strong> ${new Date().toISOString()}</p>
    </div>
    
    <div class="footer">
      <p>This test email was sent by Conducky Code of Conduct Management System</p>
    </div>
  </div>
</body>
</html>
        `,
        from: settings.fromAddress,
        replyTo: settings.replyTo
      });

      if (result.success) {
        return {
          success: true,
          message: `Test email sent successfully via ${settings.provider}. Check ${testEmailAddress} for the test message.`
        };
      } else {
        return {
          success: false,
          message: 'Failed to send test email',
          error: 'Email sending failed'
        };
      }

    } catch (error: any) {
      logger().error('Email test failed:', error);
      return {
        success: false,
        message: 'Email test failed',
        error: error.message || 'Unknown error occurred'
      };
    }
  }
}

// Create and export a singleton instance
export const emailService = new EmailService();