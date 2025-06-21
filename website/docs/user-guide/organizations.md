---
sidebar_position: 15
---

# Organizations

Organizations provide a way to group related events under a single administrative umbrella. This feature allows for better organization management, shared branding, and centralized control over multiple events.

## Overview

Organizations in Conducky serve as containers for events, allowing:

- **Centralized Management**: Manage multiple events from a single organization dashboard
- **Shared Branding**: Apply consistent branding across all organization events
- **Role-Based Access**: Control who can manage the organization and its events
- **Streamlined Reporting**: View aggregated reports across all organization events

## Organization Roles

### Organization Admin (`org_admin`)
- Create and manage events within the organization
- Manage organization settings and branding
- Invite and manage organization members
- View all organization reports and analytics
- Upload and manage organization logo

### Organization Viewer (`org_viewer`)
- View organization events and basic information
- Limited access to organization reports
- Cannot modify organization settings or create events

## Getting Started with Organizations

### For SuperAdmins: Creating Organizations

Only SuperAdmins can create new organizations:

1. Navigate to **Admin** → **Organizations**
2. Click **Create New Organization**
3. Fill in the organization details:
   - **Name**: The display name for your organization
   - **Slug**: URL-friendly identifier (e.g., "my-org")
   - **Description**: Optional description of the organization
   - **Website**: Optional organization website URL
4. Click **Create Organization**

The creator automatically becomes an Organization Admin.

### For Organization Admins: Managing Your Organization

#### Organization Settings

Access organization settings through:
1. Navigate to your organization dashboard
2. Click **Settings** in the sidebar

Here you can:
- Update organization name and description
- Modify website URL
- Upload organization logo
- Configure organization-wide settings

#### Managing Members

Add team members to your organization:

1. Go to **Organization** → **Team**
2. Click **Invite Member**
3. Choose the role (Organization Admin or Viewer)
4. Share the generated invite link

#### Creating Events

Create events within your organization:

1. Navigate to **Organization** → **Events**
2. Click **Create New Event**
3. Fill in event details (name, slug, dates, etc.)
4. The event will be automatically associated with your organization

## Organization Invite System

Organizations use a secure invite system to add new members:

### Creating Invites

Organization Admins can create invite links:

1. Go to **Organization** → **Team** → **Invite Member**
2. Select the role for new members
3. Optionally set:
   - **Expiration Date**: When the invite expires
   - **Maximum Uses**: How many times the invite can be used
   - **Note**: Internal note about the invite

### Using Invites

Recipients can join organizations by:

1. Clicking the invite link
2. Logging into their Conducky account (or creating one)
3. Accepting the organization invitation
4. They'll be automatically added with the specified role

### Managing Invites

Organization Admins can:
- View all active invites
- Disable unused invites
- Track invite usage
- Update invite notes

## Organization Branding

### Logo Upload

Organizations can upload custom logos:

1. Go to **Organization Settings**
2. Click **Upload Logo** in the branding section
3. Select an image file (JPEG, PNG, GIF, WebP)
4. The logo will appear on:
   - Organization pages
   - Organization event pages
   - Email notifications (if configured)

### Consistent Branding

Organization branding is automatically applied to:
- All events within the organization
- Public event pages
- Email communications
- Report interfaces

## Event Management

### Organization Event Dashboard

View all organization events from a central dashboard:

1. Navigate to **Organization** → **Events**
2. See all events with their status, dates, and activity
3. Filter and search events
4. Access individual event management

### Event Creation

When creating events within an organization:
- Events inherit organization branding
- Organization members automatically have access
- Reports are aggregated at the organization level
- Event settings can override organization defaults

## Reporting and Analytics

### Organization-Level Reports

Organization Admins can view:
- Aggregated reports across all organization events
- Cross-event analytics and trends
- Member activity across events
- Organization-wide statistics

### Event-Specific Reports

Each event maintains its own reporting system while contributing to organization-level analytics.

## Migration from Standalone Events

Existing events can be migrated to organizations:

### For SuperAdmins

1. Create the target organization
2. Use the migration tools in **Admin** → **Organizations**
3. Select events to migrate
4. Assign appropriate organization roles to existing event admins

### For Event Admins

If your event is migrated to an organization:
- Your event admin permissions are preserved
- You gain access to organization features
- Event URLs and functionality remain the same
- You may be assigned an organization role

## Best Practices

### Organization Structure

- **Single Purpose**: Create organizations for logically related events
- **Clear Naming**: Use descriptive names and slugs
- **Role Assignment**: Assign roles based on actual responsibilities

### Member Management

- **Principle of Least Privilege**: Give users the minimum role needed
- **Regular Reviews**: Periodically review organization membership
- **Invite Hygiene**: Disable unused invites and set appropriate expiration dates

### Event Organization

- **Consistent Naming**: Use consistent event naming conventions
- **Shared Resources**: Leverage organization branding and settings
- **Documentation**: Document organization-specific procedures

## Security Considerations

### Access Control

- Organization data is isolated between organizations
- Members can only access organizations they belong to
- SuperAdmins can view all organizations but cannot access organization data without explicit membership

### Invite Security

- Invite links should be shared securely
- Set appropriate expiration dates
- Monitor invite usage for suspicious activity
- Disable compromised invites immediately

## Troubleshooting

### Common Issues

**Cannot create organization**
- Only SuperAdmins can create organizations
- Check your user role in **Profile** → **Settings**

**Invite link not working**
- Check if the invite has expired
- Verify the invite hasn't reached its usage limit
- Ensure the invite hasn't been disabled

**Missing organization features**
- Verify your organization role
- Organization Viewers have limited permissions
- Contact your Organization Admin for role changes

**Event not showing in organization**
- Events must be explicitly created within an organization
- Existing events may need migration by a SuperAdmin

### Getting Help

If you encounter issues with organizations:

1. Check your role and permissions
2. Review this documentation
3. Contact your Organization Admin (for member issues)
4. Contact system administrators (for technical issues)
5. Submit a support request through the platform

## API Access

Developers can interact with organizations through the API:

- **Organization Management**: Create, update, delete organizations
- **Membership Management**: Add, remove, update member roles
- **Event Management**: Create and manage organization events
- **Invite Management**: Create and manage invite links
