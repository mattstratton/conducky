---
sidebar_position: 4
---

# Social Login Setup

This guide covers configuring social login with Google and GitHub OAuth for your Conducky installation.

## Overview

Social login allows users to sign in with their existing Google or GitHub accounts, providing several benefits:

- **Faster registration**: Users can sign up instantly with existing accounts
- **Improved security**: No need to manage additional passwords
- **Better user experience**: One-click login for returning users
- **Account linking**: Users can link multiple social accounts to one Conducky account

## Prerequisites

Before configuring social login, you'll need:

- Google Cloud Console access (for Google OAuth)
- GitHub account with Developer Settings access (for GitHub OAuth)
- SSL certificate (HTTPS) for production deployments
- Admin access to your Conducky environment variables

## Setting Up Google OAuth

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. In the project dashboard, ensure you're in the correct project

### Step 2: Enable Google Identity Services API

1. Navigate to **APIs & Services → Library**
2. Search for "Google Identity Services API"
3. Click on "Google Identity Services API" and click **"Enable"**
4. Alternatively, you can also enable "Google+ API" if available, but Google Identity Services is the modern approach

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. If prompted, configure the OAuth consent screen first:
   - **User Type**: External (for most cases)
   - **App Information**:
     - App name: "Conducky" (or your installation name)
     - User support email: Your admin email
     - Developer contact information: Your admin email
   - **Scopes**: Add the following scopes:
     - `../auth/userinfo.email` (to access user's email address)
     - `../auth/userinfo.profile` (to access user's basic profile info)
   - **Test users**: Add your test email addresses
4. Return to create OAuth 2.0 Client ID:
   - **Application type**: Web application
   - **Name**: "Conducky OAuth Client"
   - **Authorized JavaScript origins**:
     - Local development: `http://localhost:3001`
     - Production: `https://yourdomain.com`
   - **Authorized redirect URIs**:
     - Local development: `http://localhost:4000/api/auth/google/callback`
     - Production: `https://yourdomain.com/api/auth/google/callback`
5. Click **"Create"**
6. **Copy the Client ID and Client Secret** - you'll need these for configuration

### Step 4: Configure OAuth Consent Screen (Production)

For production use:

1. Go to **APIs & Services → OAuth consent screen**
2. Fill in all required fields
3. Add your domain to **Authorized domains**
4. Submit for verification if needed (required for external users)

## Setting Up GitHub OAuth

### Step 1: Create GitHub OAuth App

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in the application details:
   - **Application name**: "Conducky" (or your installation name)
   - **Homepage URL**:
     - Local: `http://localhost:3001`
     - Production: `https://yourdomain.com`
   - **Application description**: "Code of conduct incident management system"
   - **Authorization callback URL**:
     - Local: `http://localhost:4000/api/auth/github/callback`
     - Production: `https://yourdomain.com/api/auth/github/callback`
4. Click **"Register application"**
5. **Copy the Client ID and Client Secret** - you'll need these for configuration

## Environment Configuration

### Required Environment Variables

Add these variables to your backend `.env` file:

```bash
# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# Base URLs for OAuth (important: these must match your OAuth app configuration)
BACKEND_BASE_URL=http://localhost:4000   # Where OAuth callbacks are handled
FRONTEND_BASE_URL=http://localhost:3001  # Where users are redirected after login
```

### Production Configuration

For production deployments:

```bash
# OAuth Configuration (Production)
GOOGLE_CLIENT_ID=your_production_google_client_id
GOOGLE_CLIENT_SECRET=your_production_google_client_secret
GITHUB_CLIENT_ID=your_production_github_client_id
GITHUB_CLIENT_SECRET=your_production_github_client_secret

# Production URLs
BACKEND_BASE_URL=https://yourdomain.com   # Same domain, different services
FRONTEND_BASE_URL=https://yourdomain.com
```

### Docker Compose Configuration

If using Docker Compose, add these to your `docker-compose.yml` environment section:

```yaml
backend:
  environment:
    - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
    - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
    - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
    - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
    - FRONTEND_BASE_URL=${FRONTEND_BASE_URL}
```

## Testing Social Login

### Local Testing Setup

1. **Configure OAuth apps** with local callback URLs (as shown above)
2. **Set environment variables** in your `.env` file
3. **Restart your backend** to load new environment variables:

   ```bash
   docker-compose restart backend
   ```

4. **Test the setup** by following the testing scenarios below

### Testing Scenarios

#### Test Case 1: New User Registration via Google

1. Navigate to `http://localhost:3001/login`
2. Click the **"Google"** button
3. Complete Google OAuth flow with a Google account NOT already in Conducky
4. **Expected Results**:
   - User is redirected to `/dashboard` after successful auth
   - New user account is created in database
   - User's name and email are populated from Google profile
   - No password hash is set (passwordHash should be null)
   - SocialAccount record is created with Google provider data

#### Test Case 2: New User Registration via GitHub

1. Navigate to `http://localhost:3001/login`
2. Click the **"GitHub"** button  
3. Complete GitHub OAuth flow with a GitHub account NOT already in Conducky
4. **Expected Results**:
   - User is redirected to `/dashboard` after successful auth
   - New user account is created in database
   - User's name and email are populated from GitHub profile
   - No password hash is set (passwordHash should be null)
   - SocialAccount record is created with GitHub provider data

#### Test Case 3: Existing User Account Linking

1. Create a user account with email `test@example.com` (via regular registration)
2. Navigate to `/login`
3. Click **"Google"** button and authenticate with Google account using `test@example.com`
4. **Expected Results**:
   - User is logged in to existing account
   - SocialAccount record is created linking Google account to existing user
   - User retains their existing data and event roles

#### Test Case 4: OAuth Error Handling

1. Configure invalid OAuth credentials in environment variables
2. Navigate to `/login`
3. Click **"Google"** or **"GitHub"** button
4. **Expected Results**:
   - User is redirected to `/login?error=oauth_failed`
   - Error message is displayed: "Social login failed. Make sure the email address on your Google or GitHub account is verified, then try again, or sign in with email and password."

### Database Verification

After testing, verify the database state:

**Check Users Table:**

```sql
SELECT id, email, name, "passwordHash" FROM "User" WHERE email = 'test@example.com';
```

- `passwordHash` should be null for OAuth-only users

**Check SocialAccounts Table:**

```sql
SELECT * FROM "SocialAccount" WHERE "userId" = 'user-id-here';
```

- Should have records for each linked social account
- `provider` should be 'google' or 'github'
- `providerId` should be the OAuth provider's user ID
- `providerEmail` should match the email from OAuth

## Troubleshooting Common Issues

### OAuth Redirect Mismatch Error

**Error Message**: `redirect_uri_mismatch`

**Causes**:
- Callback URL in OAuth provider doesn't match exactly
- Missing `http://` or `https://` in URL
- Localhost vs 127.0.0.1 mismatch

**Solutions**:
1. Check that callback URLs match exactly between OAuth provider and your environment
2. Ensure protocol (http/https) matches your deployment
3. For local development, use `localhost`, not `127.0.0.1`

### No Email Returned from Provider

**Error**: User account creation fails

**Causes**:
- OAuth app doesn't have email permission
- User denied email access during OAuth flow
- OAuth scopes not configured correctly

**Solutions**:
1. Verify OAuth scopes include email access:
   - Google: `profile` and `email` scopes
   - GitHub: `user:email` scope
2. Check OAuth consent screen configuration
3. Ask user to re-authorize with email permission

### Session Not Persisting After OAuth

**Error**: User not staying logged in after OAuth

**Causes**:
- Session configuration issues
- Cookie domain/path problems
- CSRF token mismatch

**Solutions**:
1. Check session configuration in backend
2. Verify cookie settings allow OAuth domain
3. Ensure `FRONTEND_BASE_URL` is set correctly

### Environment Variables Not Loading

**Error**: OAuth buttons redirect to error page

**Causes**:
- Environment variables not set
- Backend not restarted after setting variables
- Docker container not seeing environment variables

**Solutions**:
1. Verify environment variables are set: `docker-compose exec backend env | grep GOOGLE`
2. Restart backend container: `docker-compose restart backend`
3. Check docker-compose.yml environment configuration

## Production Deployment Checklist

Before deploying social login to production:

- [ ] **OAuth Apps**: Create production OAuth apps with production callback URLs
- [ ] **HTTPS**: Ensure your domain has valid SSL certificate
- [ ] **Environment Variables**: Set production OAuth credentials
- [ ] **Domain Configuration**: Update OAuth apps with production domain
- [ ] **Testing**: Test OAuth flow on production environment
- [ ] **Monitoring**: Set up monitoring for OAuth success/failure rates
- [ ] **Backup**: Ensure OAuth configuration is included in backups

## Security Considerations

### Account Security

- **Account Takeover Protection**: Users must have access to the email address
- **Multiple Providers**: Users can link multiple social accounts safely
- **Password Reset**: OAuth users can still set passwords for alternative login

### OAuth Security

- **State Parameter**: OAuth requests include CSRF protection
- **Secure Tokens**: OAuth tokens are not stored in local storage
- **Session Security**: OAuth sessions follow same security as password logins

### Data Privacy

- **Minimal Scopes**: Only request necessary permissions (profile, email)
- **No Data Storage**: OAuth tokens are not permanently stored
- **User Control**: Users can unlink social accounts (future feature)

## Next Steps

After setting up social login:

1. **Test thoroughly** with all supported providers
2. **Monitor login metrics** to track adoption
3. **Update user documentation** to mention social login options
4. **Consider additional providers** (Microsoft, Apple) if needed

For additional system administration tasks, see:
- [System Settings](./system-settings.md) - Global configuration options
- [Security Overview](./security-overview.md) - System security practices and encryption management
- [Event Management](./event-management.md) - Creating and managing events
