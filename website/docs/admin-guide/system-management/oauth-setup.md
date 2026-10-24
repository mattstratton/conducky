---
sidebar_position: 3
---

# OAuth Configuration

Conducky supports social login with Google and GitHub OAuth, allowing users to sign in with their existing accounts. This guide walks System Admins through setting up and configuring social login.

## 🌟 Overview

Social login provides several benefits:

- **Faster registration**: Users can sign up instantly with existing accounts
- **Improved security**: No need to manage additional passwords
- **Better user experience**: One-click login for returning users
- **Account linking**: Users can link multiple social accounts to one Conducky account

## 📋 Prerequisites

Before configuring social login, you'll need:

- **Google Cloud Console access** (for Google OAuth)
- **GitHub account with Developer Settings access** (for GitHub OAuth)
- **SSL certificate (HTTPS)** for production deployments
- **System Admin access** to your Conducky instance

## 🔧 Setting Up Google OAuth

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

## 🐙 Setting Up GitHub OAuth

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

## ⚙️ Conducky Configuration

### OAuth Settings Location

OAuth configuration for Google and GitHub is managed directly in the Conducky database through the System Settings UI.

### Configuring OAuth Providers

1. **Log in as a System Admin**
2. Navigate to **System Admin → System Settings** in the sidebar
3. Go to the **"OAuth Providers"** section

Here you can:

- Add or update the **Client ID** and **Client Secret** for Google and GitHub
- Set the **Authorized Redirect URIs** (these must match your OAuth app configuration)
- Enable or disable each provider as needed

**Note:** Changes take effect immediately after saving.

### Production Configuration

For production deployments:

- Enter your production OAuth credentials and redirect URIs in the System Settings UI
- Ensure your OAuth app configuration in Google and GitHub matches the redirect URIs shown in the settings screen
- No changes to `.env` or `docker-compose.yml` are required for OAuth

## 🔒 Security Considerations

### Credential Protection

- Only System Admins can view or modify OAuth credentials
- Credentials are encrypted at rest in the database
- Use strong, unique client secrets from providers

### Redirect URI Security

- Always use HTTPS in production
- Verify redirect URIs match exactly between provider and Conducky
- Regularly audit and update OAuth app configurations

### Access Scope Limitations

- Request only necessary scopes (email, profile)
- Review and minimize data access permissions
- Document what data is accessed and why

## 🧪 Testing Social Login

### Local Testing Setup

1. **Configure OAuth apps** with local callback URLs (as shown above)
2. **Test the setup** by following the testing scenarios below

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

Two failures look different. Test both.

**4a. The provider authenticates the user, but Conducky rejects the sign-in** (an
unverified provider email, a provider account with no email, or a social account
already linked to a different Conducky user):

1. Sign in with such an account
2. **Expected Results**:
   - The user is redirected to `/login?error=oauth_failed`
   - The login page shows: "Social login failed. If you used Google or GitHub, make sure the email address on that account is verified, then try again, or sign in with email and password."

**4b. The OAuth client itself is misconfigured** (a wrong Client ID or Secret, or
a redirect URI that does not exactly match the callback URL):

1. Save an invalid Client ID or Secret in System Settings
2. Navigate to `/login`
3. Click **"Google"** or **"GitHub"** button
4. **Expected Results**:
   - The user does **not** land on `/login?error=oauth_failed`; that redirect is
     reserved for a sign-in the app rejects after the provider succeeds
   - The provider may show its own error page, or the callback fails with a
     `500` from the API origin
   - The backend request log shows the failed callback (with the error stack in
     development); correct the credentials or the authorized redirect URI, then
     try again

### Database Verification

After testing, verify the database state:

**Check Users Table:**
```sql
SELECT id, email, name, "passwordHash" FROM "User" WHERE email = 'test@example.com';
```
- `passwordHash` should be null for OAuth-only users

**Check SocialAccounts Table:**
```sql
SELECT * FROM "SocialAccount" WHERE "userId" = 'user-id';
```
- Should contain provider data and access tokens

## 🚨 Troubleshooting

### Common Issues

**Users Cannot Log In via Social Providers**
- Double-check OAuth credentials and redirect URIs in System Settings
- Ensure OAuth app configuration matches exactly (including protocol and domain)
- Review error messages for hints about misconfiguration

**Redirect URI Mismatch**
- Verify redirect URIs in provider settings match Conducky configuration
- Check for trailing slashes or protocol mismatches
- Ensure development vs production URLs are correctly configured

**OAuth App Not Approved**
- For Google: Submit OAuth app for verification if needed
- For GitHub: Ensure OAuth app is properly registered
- Check provider-specific approval requirements

**Missing User Information**
- Verify requested scopes include email and profile
- Check provider permissions and consent screen
- Review user's privacy settings on provider platform

### Error Messages

**"OAuth configuration not found"**
- Solution: Configure OAuth providers in System Settings
- Check: Ensure Client ID and Secret are properly saved

**"Invalid redirect URI"**
- Solution: Update redirect URIs in provider settings
- Check: Verify exact match including protocol and domain

**"OAuth provider disabled"**
- Solution: Enable the provider in System Settings
- Check: Verify provider toggle is set to enabled

### Debugging Steps

1. **Check System Settings**: Verify OAuth configuration is complete
2. **Review Provider Settings**: Ensure OAuth apps are properly configured
3. **Test Credentials**: Use provider's testing tools to verify credentials
4. **Check Logs**: Review application logs for detailed error messages
5. **Verify Network**: Ensure proper connectivity to provider APIs

## 📈 Best Practices

### Configuration Management

- **Document settings**: Keep records of OAuth app configurations
- **Regular updates**: Review and update OAuth credentials periodically
- **Testing procedures**: Establish regular testing of social login flows
- **Backup configurations**: Maintain backups of OAuth app settings

### User Experience

- **Clear instructions**: Provide clear guidance for social login
- **Fallback options**: Always provide email/password as alternative
- **Error handling**: Implement graceful error handling and user feedback
- **Account linking**: Allow users to link multiple social accounts

### Security Maintenance

- **Regular audits**: Review OAuth app permissions and access
- **Credential rotation**: Periodically rotate client secrets
- **Monitoring**: Monitor for unusual OAuth-related activity
- **Updates**: Stay current with provider security recommendations 