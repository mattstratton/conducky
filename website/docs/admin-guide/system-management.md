---
sidebar_position: 3
---

# System Management

This guide covers SuperAdmin functions for managing the overall Conducky system.

## SuperAdmin Role

SuperAdmins have system-wide access and can:

- Create new events
- View all events in the system
- Generate admin invite links for events
- Manage global system settings (including public event listing)
- Monitor system health and usage

**Important**: SuperAdmins have separate permissions from event-level roles. To access event data (reports, users, etc.), SuperAdmins must be explicitly assigned an event role by an event admin.

## SuperAdmin Navigation

SuperAdmins have access to a dedicated system administration interface through the sidebar navigation:

### Accessing System Admin Features

1. **Login as SuperAdmin**: The sidebar will automatically show system admin navigation
2. **System Admin Section**: Look for the "System Admin" section in the sidebar with:
   - 🏠 **System Dashboard** - Overview of all events and system health
   - 🎯 **Events Management** - Create and manage events
   - ⚙️ **System Settings** - Global configuration

### Context Switching

SuperAdmins can switch between two contexts:
- **System Administration**: Managing the Conducky installation (pages starting with `/admin/`)
- **Personal Dashboard**: Participating in events as a regular user (`/dashboard` and pages starting with `/events/`)

## Creating Events

The event creation workflow has been streamlined for better user experience:

### New Simplified Workflow

1. **SuperAdmin creates basic event** (name, slug, description only)
2. **Event is created as inactive** (`isActive: false`) until fully configured
3. **SuperAdmin generates admin invite link** for the event organizer
4. **Event organizer accepts invite** and becomes event admin
5. **Event admin completes detailed setup** (contact info, dates, CoC, etc.)
6. **Event becomes active** once fully configured

### Via the UI

1. Log in as a SuperAdmin
2. Navigate to **System Admin → Events Management** in the sidebar
3. Click **"Create Event"** or go to `/admin/events/new`
4. Fill in the basic event details:
   - **Name**: Display name for the event
   - **Slug**: URL-safe identifier (lowercase, letters, numbers, hyphens only)
   - **Description**: Brief description of the event
5. Click **"Create Event"**

The event will be created in an inactive state, ready for admin assignment.

### Generating Admin Invites

After creating an event:

1. Go to **System Admin → Events Management** (`/admin/events`)
2. Click on the event you want to manage
3. Navigate to the **Settings** tab
4. In the **Invite Management** section:
   - Click **"Create Admin Invite"**
   - Optionally add a note (email address recommended)
   - Copy the generated invite link
5. Send the invite link to your designated event organizer

### Via the API

Use the `POST /api/admin/events` endpoint with:

```json
{
  "name": "My Conference 2024",
  "slug": "my-conference-2024",
  "description": "Annual technology conference"
}
```

Requirements:
- Must be authenticated as a SuperAdmin
- Slug must be unique across the system
- Slug must be URL-safe (lowercase, alphanumeric, hyphens only)

## Social Login Configuration

Conducky supports social login with Google and GitHub OAuth, allowing users to sign in with their existing accounts. This section guides SuperAdmins through setting up and configuring social login.

### Overview

Social login provides several benefits:
- **Faster registration**: Users can sign up instantly with existing accounts
- **Improved security**: No need to manage additional passwords
- **Better user experience**: One-click login for returning users
- **Account linking**: Users can link multiple social accounts to one Conducky account

### Prerequisites

Before configuring social login, you'll need:
- Google Cloud Console access (for Google OAuth)
- GitHub account with Developer Settings access (for GitHub OAuth)
- SSL certificate (HTTPS) for production deployments
- Admin access to your Conducky environment variables

### Setting Up Google OAuth

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. In the project dashboard, ensure you're in the correct project

#### Step 2: Enable Google+ API

1. Navigate to **APIs & Services → Library**
2. Search for "Google+ API" 
3. Click on "Google+ API" and click **"Enable"**

#### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. If prompted, configure the OAuth consent screen first:
   - **User Type**: External (for most cases)
   - **App Information**:
     - App name: "Conducky" (or your installation name)
     - User support email: Your admin email
     - Developer contact information: Your admin email
   - **Scopes**: Add `../auth/userinfo.email` and `../auth/userinfo.profile`
   - **Test users**: Add your test email addresses
4. Return to create OAuth 2.0 Client ID:
   - **Application type**: Web application
   - **Name**: "Conducky OAuth Client"
   - **Authorized redirect URIs**:
     - Local development: `http://localhost:4000/api/auth/google/callback`
     - Production: `https://yourdomain.com/api/auth/google/callback`
5. Click **"Create"**
6. **Copy the Client ID and Client Secret** - you'll need these for configuration

#### Step 4: Configure OAuth Consent Screen (Production)

For production use:
1. Go to **APIs & Services → OAuth consent screen**
2. Fill in all required fields
3. Add your domain to **Authorized domains**
4. Submit for verification if needed (required for external users)

### Setting Up GitHub OAuth

#### Step 1: Create GitHub OAuth App

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

### Environment Configuration

#### Required Environment Variables

Add these variables to your backend `.env` file:

```bash
# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# Frontend URL for OAuth redirects
FRONTEND_BASE_URL=http://localhost:3001
```

#### Production Configuration

For production deployments:

```bash
# OAuth Configuration (Production)
GOOGLE_CLIENT_ID=your_production_google_client_id
GOOGLE_CLIENT_SECRET=your_production_google_client_secret
GITHUB_CLIENT_ID=your_production_github_client_id
GITHUB_CLIENT_SECRET=your_production_github_client_secret

# Production frontend URL
FRONTEND_BASE_URL=https://yourdomain.com
```

#### Docker Compose Configuration

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

### Testing Social Login

#### Local Testing Setup

1. **Configure OAuth apps** with local callback URLs (as shown above)
2. **Set environment variables** in your `.env` file
3. **Restart your backend** to load new environment variables:
   ```bash
   docker-compose restart backend
   ```
4. **Test the setup** by following the testing scenarios below

#### Testing Scenarios

##### Test Case 1: New User Registration via Google

1. Navigate to `http://localhost:3001/login`
2. Click the **"Google"** button
3. Complete Google OAuth flow with a Google account NOT already in Conducky
4. **Expected Results**:
   - User is redirected to `/dashboard` after successful auth
   - New user account is created in database
   - User's name and email are populated from Google profile
   - No password hash is set (passwordHash should be null)
   - SocialAccount record is created with Google provider data

##### Test Case 2: New User Registration via GitHub

1. Navigate to `http://localhost:3001/login`
2. Click the **"GitHub"** button  
3. Complete GitHub OAuth flow with a GitHub account NOT already in Conducky
4. **Expected Results**:
   - User is redirected to `/dashboard` after successful auth
   - New user account is created in database
   - User's name and email are populated from GitHub profile
   - No password hash is set (passwordHash should be null)
   - SocialAccount record is created with GitHub provider data

##### Test Case 3: Existing User Account Linking

1. Create a user account with email `test@example.com` (via regular registration)
2. Navigate to `/login`
3. Click **"Google"** button and authenticate with Google account using `test@example.com`
4. **Expected Results**:
   - User is logged in to existing account
   - SocialAccount record is created linking Google account to existing user
   - User retains their existing data and event roles

##### Test Case 4: OAuth Error Handling

1. Configure invalid OAuth credentials in environment variables
2. Navigate to `/login`
3. Click **"Google"** or **"GitHub"** button
4. **Expected Results**:
   - User is redirected to `/login?error=oauth_failed`
   - Error message is displayed: "Social login failed. Please try again or use email/password."

#### Database Verification

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

### Troubleshooting Common Issues

#### OAuth Redirect Mismatch Error

**Error Message**: `redirect_uri_mismatch`

**Causes**:
- Callback URL in OAuth provider doesn't match exactly
- Missing `http://` or `https://` in URL
- Localhost vs 127.0.0.1 mismatch

**Solutions**:
1. Check that callback URLs match exactly between OAuth provider and your environment
2. Ensure protocol (http/https) matches your deployment
3. For local development, use `localhost`, not `127.0.0.1`

#### No Email Returned from Provider

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

#### Session Not Persisting After OAuth

**Error**: User not staying logged in after OAuth

**Causes**:
- Session configuration issues
- Cookie domain/path problems
- CSRF token mismatch

**Solutions**:
1. Check session configuration in backend
2. Verify cookie settings allow OAuth domain
3. Ensure `FRONTEND_BASE_URL` is set correctly

#### Environment Variables Not Loading

**Error**: OAuth buttons redirect to error page

**Causes**:
- Environment variables not set
- Backend not restarted after setting variables
- Docker container not seeing environment variables

**Solutions**:
1. Verify environment variables are set: `docker-compose exec backend env | grep GOOGLE`
2. Restart backend container: `docker-compose restart backend`
3. Check docker-compose.yml environment configuration

### Production Deployment Checklist

Before deploying social login to production:

- [ ] **OAuth Apps**: Create production OAuth apps with production callback URLs
- [ ] **HTTPS**: Ensure your domain has valid SSL certificate
- [ ] **Environment Variables**: Set production OAuth credentials
- [ ] **Domain Configuration**: Update OAuth apps with production domain
- [ ] **Testing**: Test OAuth flow on production environment
- [ ] **Monitoring**: Set up monitoring for OAuth success/failure rates
- [ ] **Backup**: Ensure OAuth configuration is included in backups

### Security Considerations

#### Account Security
- **Email Verification**: OAuth accounts are linked by email address
- **Account Takeover Protection**: Users must have access to the email address
- **Multiple Providers**: Users can link multiple social accounts safely

#### OAuth Security
- **State Parameter**: OAuth requests include CSRF protection
- **Secure Tokens**: OAuth tokens are not stored in local storage
- **Session Security**: OAuth sessions follow same security as password logins

#### Data Privacy
- **Minimal Scopes**: Only request necessary permissions (profile, email)
- **No Data Storage**: OAuth tokens are not permanently stored
- **User Control**: Users can unlink social accounts (future feature)

## System Settings

SuperAdmins can manage global system settings that affect the entire Conducky installation.

### Accessing System Settings

1. Log in as a SuperAdmin
2. Navigate to **System Admin → System Settings** in the sidebar
3. Go to `/admin/system/settings`

### Available Settings

#### Public Event Listing

Control whether public event listings are shown on the home page:

- **Setting**: Show Public Event List
- **Description**: When enabled, the home page displays a list of all active events for unauthenticated users
- **Default**: Disabled (false)
- **Impact**: 
  - **Enabled**: Unauthenticated users see all events on the home page with links to public event pages
  - **Disabled**: Home page shows only login/registration options for unauthenticated users

#### Managing the Setting

1. Go to **System Admin → System Settings** (`/admin/system/settings`)
2. Use the toggle switch to enable/disable "Show Public Event List"
3. Changes take effect immediately on the home page

### API Access

System settings can also be managed via API:

- **GET** `/api/system/settings` - View current settings (public access)
- **PATCH** `/api/admin/system/settings` - Update settings (SuperAdmin only)

Example API usage:
```json
PATCH /api/admin/system/settings
{
  "showPublicEventList": true
}
```

## Managing Events

### Listing All Events

SuperAdmins can view all events in the system:

- **UI**: Navigate to **System Admin → Events Management** (`/admin/events`)
- **API**: `GET /api/admin/events` returns all events (SuperAdmin only)

### Event Details and Settings

From the events list, SuperAdmins can:
- **View event details**: Click on any event to see full information
- **Manage invites**: Create and manage admin invite links
- **View basic stats**: See user counts and activity summaries

### Event Access Restrictions

SuperAdmins can access event management interfaces, but they **cannot** access event data (reports, detailed user information, etc.) unless they are explicitly assigned an event role.

To access event data:
1. Have an event admin assign you a role in the event
2. Use the standard event interface (`/events/[slug]/`)

## Admin API Endpoints

### New SuperAdmin Endpoints

The following endpoints are available for SuperAdmin system management:

#### Event Management
- `POST /api/admin/events` - Create new event
- `GET /api/admin/events` - List all events
- `GET /api/admin/events/:eventId` - Get specific event details

#### Invite Management
- `GET /api/admin/events/:eventId/invites` - List invites for an event
- `POST /api/admin/events/:eventId/invites` - Create new admin invite
- `PATCH /api/admin/events/:eventId/invites/:inviteId` - Update invite (disable/enable)

All admin endpoints require SuperAdmin authentication and return appropriate error responses for unauthorized access.

## User Management

### Global User Overview

SuperAdmins can view system-wide user statistics and activity, but individual user management is done at the event level by Event Admins.

### Role Assignment

SuperAdmins can assign global roles (like creating additional SuperAdmins) through direct database access or future admin interfaces.

## System Monitoring

### Audit Logs

SuperAdmins should regularly review audit logs for:
- Event creation and deletion
- Role assignments and changes
- System access patterns
- Security-related events

### Database Health

Monitor the PostgreSQL database for:
- Storage usage and growth
- Query performance
- Connection limits
- Backup status

## Security Best Practices

### SuperAdmin Account Security

- Use strong, unique passwords
- Enable two-factor authentication when available
- Regularly review SuperAdmin access
- Limit the number of SuperAdmin accounts

### System Security

- Keep Conducky updated to the latest version
- Monitor failed login attempts
- Review user registration patterns
- Regularly audit event and user access

### Data Protection

- Ensure regular database backups
- Implement proper SSL/TLS encryption
- Follow data retention policies
- Monitor for unusual data access patterns

## Troubleshooting System Issues

### Common SuperAdmin Issues

- **Cannot see system admin navigation**: Verify SuperAdmin role assignment
- **Cannot create events**: Check SuperAdmin permissions and database connectivity
- **Cannot access event data**: Assign yourself an event role first
- **Invite links not working**: Verify invite generation and expiration settings

### Navigation Issues

- **Sidebar not showing admin options**: Check user session and role assignment
- **Cannot switch contexts**: Verify authentication and role permissions
- **Performance issues**: Monitor API call frequency and database queries

### Getting Help

For system-level issues:
1. Check the application logs
2. Verify environment variables
3. Test database connectivity
4. Review the [troubleshooting guide](../user-guide/troubleshooting)
5. Consult the [Developer Docs](../developer-docs/intro) for technical details

## Recent Updates

### Navigation Improvements
- **New sidebar navigation**: Context-aware navigation that adapts to user roles
- **Improved event switching**: Easier switching between system admin and personal contexts
- **Mobile optimization**: Responsive navigation that works well on all devices

### Event Creation Workflow
- **Simplified initial creation**: Only requires name, slug, and description
- **Admin invite system**: Generate secure invite links for event organizers
- **Inactive event state**: Events remain inactive until fully configured by admins

### Performance Optimizations
- **Reduced API calls**: Optimized sidebar navigation to minimize server requests
- **Better caching**: Improved session and role data management
- **Faster loading**: Streamlined data fetching for better user experience

## Future Features

Planned SuperAdmin features include:
- Web-based user management interface
- System analytics and reporting
- Automated backup management
- Advanced security monitoring
- Bulk event management tools 