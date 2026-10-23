---
sidebar_position: 2
---

# Creating Events

Events can be created by System Admins globally or by Organization Admins within their organizations. This page explains the different creation methods and workflows.

## Creating Events (System Admin)

System Admins can create events globally for any organization:

### Step-by-Step Process

1. **Navigate to System Admin**: Use the sidebar to access **System Admin → Events Management**
2. **Access creation form**: Click **"Create Event"** or go to `/admin/events/new`
3. **Fill event information**:
   - **Name**: Display name for the event (e.g., "DevConf 2024")
   - **Slug**: URL-safe identifier (e.g., "devconf-2024")
   - **Description**: Brief description of the event
   - **Organization**: Select target organization (if applicable)
4. **Create event**: Click **"Create Event"**
5. **Assign Event Admin**: Assign appropriate Event Admin role to the designated organizer

The event will be created and ready for configuration by the assigned Event Admin.

### Event Slug Requirements

Event slugs are critical for URL routing and must follow specific rules:

- **Format**: Lowercase letters, numbers, and hyphens only
- **Uniqueness**: Must be unique across the entire system
- **Immutability**: Cannot be changed after creation (to preserve URLs)
- **URL pattern**: `/events/[eventSlug]/` for all event-scoped pages

**Examples:**
- Event: "DevConf 2024" → Slug: "devconf-2024"
- Event: "PyData Chicago" → Slug: "pydata-chicago"
- Event: "RustConf" → Slug: "rustconf"

### Generating Admin Invites

After creating an event, System Admins can generate invite links for event organizers:

1. **Navigate to event management**: Go to **System Admin → Events Management** (`/admin/events`)
2. **Select event**: Click on the event you want to manage
3. **Access settings**: Navigate to the **Settings** tab
4. **Create invite**:
   - Click **"Create Admin Invite"**
   - Add a note (email address recommended for tracking)
   - Set expiration date (optional, defaults to 30 days)
   - Set maximum uses (optional, defaults to 1)
5. **Share invite**: Copy the generated invite link and send to the event organizer

{/* Screenshot Placeholder */}
> **Screenshot needed**: System Admin event creation form showing required fields

## Creating Events (Organization Admin)

Organization Admins can create events within their organization:

### Step-by-Step Process

1. **Navigate to Organization Dashboard**: Access your organization's event management section
2. **Create New Event**: Click **"Create Event"**
3. **Fill event information**:
   - **Name**: Display name for the event (e.g., "DevConf 2024")
   - **Slug**: URL-safe identifier (e.g., "devconf-2024")
   - **Description**: Brief description of the event
   - **Organization**: Automatically set to your organization
4. **Create event**: Click **"Create Event"**
5. **Configure settings**: Complete event setup in the Event Admin interface

### Automatic Role Assignment

When Organization Admins create events:
- **Event Admin role** is automatically assigned to the creator
- **Organization context** is inherited by the event
- **Event becomes available** for immediate configuration
- **Team management** can begin immediately

## Creating Events via API

System Admins can use the API for programmatic event creation:

### Basic Event Creation

```bash
POST /api/admin/events
{
  "name": "My Conference 2024",
  "slug": "my-conference-2024",
  "description": "Annual technology conference"
}
```

### Generate Admin Invite

```bash
POST /api/admin/events/{eventId}/invites
{
  "note": "admin@myconference.org",
  "maxUses": 1,
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### API Requirements

- Must be authenticated as a System Admin
- Slug must be unique across the system
- Slug must be URL-safe (lowercase, alphanumeric, hyphens only)
- All required fields must be provided

## Event Creation Best Practices

### Choosing Good Event Slugs

1. **Keep them short** but descriptive
2. **Use year indicators** for recurring events (e.g., "devconf-2024")
3. **Include location** if relevant (e.g., "pydata-chicago")
4. **Avoid abbreviations** that might be unclear
5. **Consider consistency** across related events

### Event Naming Conventions

1. **Use clear, descriptive names** that attendees will recognize
2. **Include year/edition** for recurring events
3. **Avoid special characters** that might cause URL issues
4. **Keep names concise** for better mobile display
5. **Consider branding** and consistency with other materials

### Planning Event Setup

Before creating an event:

1. **Identify the Event Admin** who will configure the event
2. **Prepare event details** (dates, website, contact info)
3. **Plan the team structure** (who needs which roles)
4. **Consider the code of conduct** and community guidelines
5. **Prepare any custom branding** (logos, colors)

## After Event Creation

Once an event is created, the next steps are:

### For System Admins

1. **Generate admin invite** for the designated event organizer
2. **Share the invite link** securely with the organizer
3. **Monitor event setup** progress if needed
4. **Provide support** during initial configuration

### For Event Admins

1. **Accept the admin invitation** if created by System Admin
2. **Complete event configuration** using the Event Admin interface
3. **Upload event branding** and customize appearance
4. **Configure the code of conduct** and community guidelines
5. **Begin team setup** by inviting responders and other team members

### Initial Configuration Checklist

- [ ] **Event details** (name, description, dates, website)
- [ ] **Event branding** (logo upload, visual customization)
- [ ] **Code of conduct** (community guidelines and policies)
- [ ] **Contact information** (primary contact email)
- [ ] **Team setup** (invite responders and other team members)
- [ ] **Event activation** (make the event live and accessible)

## Troubleshooting Event Creation

### Common Issues

**Event creation fails:**
- **Check slug uniqueness**: Ensure the slug isn't already in use
- **Verify slug format**: Only lowercase letters, numbers, and hyphens
- **Confirm permissions**: Ensure you have System Admin or Organization Admin role
- **Review required fields**: All mandatory fields must be completed

**Invite links not working:**
- **Check expiration**: Verify the invite hasn't expired
- **Verify usage limits**: Ensure the invite hasn't exceeded max uses
- **Test link format**: Copy the complete URL including any parameters
- **Check user registration**: Ensure the invitee can create an account

**Event not appearing in lists:**
- **Verify event status**: Check if the event is active
- **Check role assignment**: Ensure users have appropriate event roles
- **Review permissions**: Confirm users have access to the event
- **Refresh data**: Try refreshing the page or clearing cache

### Getting Help

For event creation issues:

1. **Check system logs** for error messages
2. **Verify user permissions** and role assignments
3. **Test with different browsers** to rule out client issues
4. **Contact system administrators** for technical problems
5. **Review the [troubleshooting guide](../navigation/troubleshooting)** for additional solutions

## Security Considerations

### Event Creation Security

- **Role validation**: Only authorized users can create events
- **Slug validation**: Prevents injection attacks through URL manipulation
- **Invite security**: Admin invites use secure, time-limited tokens
- **Audit logging**: All event creation activities are logged

### Access Control

- **Immediate isolation**: New events are isolated from existing data
- **Role-based access**: Only assigned users can access event data
- **Admin invite protection**: Invite links are single-use and time-limited
- **Organization scoping**: Events inherit appropriate organizational context

Understanding these security measures helps ensure safe event creation and management. 