import nodemailer = require('nodemailer');

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
        console.log(`[Email] ${this.config.provider} transporter initialized successfully`);
      } else {
        console.log('[Email] Console mode initialized (emails will be logged)');
      }

      this.isInitialized = true;
    } catch (error: any) {
      console.error('[Email] Failed to initialize transporter:', error);
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
        console.log('\n=== EMAIL (Console Mode) ===');
        console.log(`From: ${mailOptions.from}`);
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`Text:\n${mailOptions.text}`);
        if (mailOptions.html) {
          console.log(`HTML:\n${mailOptions.html}`);
        }
        console.log('=== END EMAIL ===\n');
        
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
      console.log(`[Email] Sent successfully via ${this.config.provider}:`, result.messageId);
      
      return {
        success: true,
        messageId: result.messageId || `sent-${Date.now()}`,
        provider: this.config.provider,
      };
    } catch (error: any) {
      console.error('[Email] Failed to send email:', error);
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
}

// Create and export a singleton instance
export const emailService = new EmailService(); 