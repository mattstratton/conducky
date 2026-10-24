# System Configuration

Conducky uses database-stored configuration for critical system settings like OAuth providers. This allows for dynamic configuration changes without requiring application restarts or code deployments. Email is the exception: it is configured with environment variables (see [Email configuration](#email-configuration)).

## Overview

System configuration is managed through the Admin UI and stored securely in the database with field-level encryption for sensitive data like passwords and API keys.

### Supported Configuration Areas

- **Email**: SMTP or SendGrid, configured with environment variables (the Admin UI can only send a test message)
- **Google OAuth**: Social login with Google accounts
- **GitHub OAuth**: Social login with GitHub accounts

## Encryption Key Setup

### Environment Variable

All sensitive configuration data is encrypted using the `ENCRYPTION_KEY` environment variable:

```bash
ENCRYPTION_KEY=your-secure-encryption-key-here
```

### Requirements

- **Minimum length**: 32 characters
- **Strength**: Use a cryptographically secure random string
- **Production**: Must not contain "dev" or "development" keywords
- **Uniqueness**: Each environment should have its own unique key

### Generating a Secure Key

**Linux/macOS:**
```bash
openssl rand -base64 32
```

**Node.js:**
```javascript
require('crypto').randomBytes(32).toString('base64')
```

**Online Generator:**
Use a reputable online password generator to create a 32+ character random string.

### Security Considerations

⚠️ **Important Security Notes:**

- Never use the default development key in production
- Store the encryption key securely (environment variables, secrets manager)
- Rotating the encryption key requires re-encrypting all stored settings
- Backup your encryption key - lost keys mean lost configuration data

## Email configuration

Email is **strongly recommended**. Conducky uses it to verify that people own the address they sign up with, to send password reset links, and to send notifications.

### Environment variables only

The live mailer reads **only environment variables** on the backend. Set them and restart the backend:

| Variable | Purpose |
|----------|---------|
| `EMAIL_PROVIDER` | `smtp` or `sendgrid`. Anything else (or unset) means `console`, which only logs emails and counts as **not configured**. |
| `EMAIL_FROM` | From address (defaults to `noreply@conducky.local`, so set it) |
| `EMAIL_REPLY_TO` | Optional reply-to address |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | SMTP server, port (default 587) and `true` for implicit TLS (usually port 465) |
| `SMTP_USER`, `SMTP_PASS` | SMTP credentials (used only when both are set) |
| `SENDGRID_API_KEY` | SendGrid API key |

:::warning[The email settings page does not configure email]
The email card under **Admin → System Settings** (and `PUT /api/admin/settings/email`) stores settings in the database, but the mailer does not read them. Today that page is only useful for sending a test message. Configure email with the environment variables above.
:::

### What counts as configured

Email is "configured" when `EMAIL_PROVIDER` is `smtp` or `sendgrid` (any capitalisation) and the mailer initialized without falling back to console. Conducky checks only the provider name and initialization. It does not detect a configured-but-broken mail server (wrong password, blocked port), so send a test message after setup.

### What changes when email is configured

- New email/password signups, including signups through an invite link, must click an emailed verification link before they can sign in. See [Email verification](../security/authentication.md#4-email-verification).
- Existing accounts are never locked out. Existing email/password users who have not verified see a banner offering to send a verification email.
- Changing an email address in profile settings is not applied until the new address is verified.
- New accounts that never verify are deleted after 7 days.

### If email is not configured

Verification is skipped entirely: nobody is blocked, nothing is deleted, and signups work as before. That also means anyone can register with an address they do not own. Conducky is loud about it:

- The backend logs a warning at startup.
- System Admins see a warning banner on every `/admin` page: "Email is not configured. New signups are not being verified. Configuring email is strongly recommended."

If you configure email later, accounts created before then are not gated; they can verify from the banner.

### Testing email configuration

The **Test Connection** tab in **Admin → System Settings** sends a test message to your own address using the settings you type into the form. It does not use the backend environment variables, so a passing test does not prove they are right. After setting them, trigger a real email (for example **Forgot Password** with your own address) to confirm delivery.

## OAuth Configuration

### Google OAuth Setup

1. **Create Google OAuth Application**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials

2. **Configure in Conducky**:
   - Navigate to **Admin → System Settings**
   - Find **Google OAuth Configuration** card
   - Enter Client ID and Client Secret
   - Enable Google OAuth
   - Add authorized redirect URI: `https://yourdomain.com/api/auth/google/callback`

### GitHub OAuth Setup

1. **Create GitHub OAuth App**:
   - Go to GitHub → Settings → Developer settings → OAuth Apps
   - Click "New OAuth App"
   - Set Authorization callback URL: `https://yourdomain.com/api/auth/github/callback`

2. **Configure in Conducky**:
   - Navigate to **Admin → System Settings**
   - Find **GitHub OAuth Configuration** card
   - Enter Client ID and Client Secret
   - Enable GitHub OAuth

### OAuth Behavior

- **Enabled providers**: Login buttons appear on the login page
- **Disabled providers**: Login buttons are hidden
- **Real-time updates**: Changes take effect immediately without restart

## Migration from Environment Variables

If you're migrating from environment variable-based configuration:

### Email

Email is not part of this migration: it is configured with environment variables (see [Email configuration](#email-configuration)), not through the Admin UI.

### OAuth Migration

**Old environment variables:**
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

**Migration steps:**
1. Access Admin → System Settings
2. Configure OAuth providers through the UI
3. Test login functionality
4. Remove environment variables from your deployment

## Troubleshooting

### Common Issues

**Encryption Key Errors:**
```
❌ Encryption key validation failed: ENCRYPTION_KEY must be at least 32 characters long
```
- Solution: Generate a longer encryption key (32+ characters)

**Email Test Failures:**
- Verify SMTP credentials and server settings
- Check firewall and network connectivity
- Ensure from address is authorized by your email provider

**OAuth Login Issues:**
- Verify redirect URIs match exactly
- Check client ID and secret are correct
- Ensure OAuth apps are active/published

### Logs and Debugging

- **Backend logs**: Check Docker logs for detailed error messages
- **Email testing**: Use the built-in test functionality
- **OAuth debugging**: Check browser network tab for redirect errors

## Security Best Practices

1. **Encryption Key Management**:
   - Use different keys for each environment
   - Store keys in secure secret management systems
   - Never commit keys to version control

2. **Access Control**:
   - Only System Admins can modify system configuration
   - Regular users cannot view sensitive settings

3. **Audit Trail**:
   - Configuration changes are logged
   - Monitor admin access to system settings

4. **Regular Reviews**:
   - Periodically review OAuth app permissions
   - Update API keys and passwords regularly
   - Remove unused OAuth applications

## API Reference

System configuration can also be managed via API:

- `GET /api/admin/system/settings` - Retrieve all settings
- `PUT /api/admin/settings/email` - Store email settings (not read by the live mailer; see [Email configuration](#email-configuration))
- `PUT /api/admin/settings/google-oauth` - Update Google OAuth
- `PUT /api/admin/settings/github-oauth` - Update GitHub OAuth
- `POST /api/admin/settings/email/test` - Send a test email
- `GET /api/admin/email-status` - Whether a real email provider is configured: `{ configured: boolean }`

All API endpoints require System Admin authentication. 