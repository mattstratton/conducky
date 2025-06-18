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