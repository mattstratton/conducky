const nodemailer = require('nodemailer');

/**
 * Email Service - Flexible email sending with multiple provider support
 * Supports SMTP, SendGrid, and other providers
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
    this.config = this.getEmailConfig();
  }

  /**
   * Get email configuration from environment variables
   */
  getEmailConfig() {
    const provider = process.env.EMAIL_PROVIDER || 'console'; // Default to console for development

    const config = {
      provider,
      from: process.env.EMAIL_FROM || 'noreply@conducky.local',
      replyTo: process.env.EMAIL_REPLY_TO || null,
    };

    switch (provider.toLowerCase()) {
      case 'smtp':
        config.smtp = {
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        };
        break;

      case 'sendgrid':
        config.sendgrid = {
          apiKey: process.env.SENDGRID_API_KEY,
        };
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
  async initialize() {
    if (this.isInitialized) return;

    try {
      switch (this.config.provider.toLowerCase()) {
        case 'smtp':
          this.transporter = nodemailer.createTransport(this.config.smtp);
          break;

        case 'sendgrid':
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
      if (this.config.provider !== 'console') {
        await this.transporter.verify();
        console.log(`[Email] ${this.config.provider} transporter initialized successfully`);
      } else {
        console.log('[Email] Console mode initialized (emails will be logged)');
      }

      this.isInitialized = true;
    } catch (error) {
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
   * Send an email
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text content
   * @param {string} options.html - HTML content
   * @param {string} options.from - Sender (optional, uses default)
   * @param {string} options.replyTo - Reply-to address (optional)
   */
  async sendEmail({ to, subject, text, html, from, replyTo }) {
    await this.initialize();

    const mailOptions = {
      from: from || this.config.from,
      to,
      subject,
      text,
      html,
      replyTo: replyTo || this.config.replyTo,
    };

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

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`[Email] Sent successfully via ${this.config.provider}:`, result.messageId);
      
      return {
        success: true,
        messageId: result.messageId,
        provider: this.config.provider,
      };
    } catch (error) {
      console.error('[Email] Failed to send email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send a password reset email
   * @param {string} to - Recipient email
   * @param {string} name - User's name
   * @param {string} resetToken - Password reset token
   * @param {string} frontendUrl - Frontend base URL
   */
  async sendPasswordReset(to, name, resetToken, frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000') {
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
   * @param {string} to - Recipient email
   * @param {string} name - User's name  
   */
  async sendWelcomeEmail(to, name) {
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
const emailService = new EmailService();

module.exports = {
  EmailService,
  emailService,
}; 