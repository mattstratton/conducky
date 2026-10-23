---
sidebar_position: 4
---

# Event Configuration

Event Admins can configure various aspects of their events through inline editing and dedicated settings pages. This page explains how to manage event metadata, branding, and operational settings.

## Inline Editing of Event Metadata

Event admins can edit event metadata directly from the main event page using an inline editing interface.

### Editable Fields

The following fields can be edited inline:

- **Name**: Event display name
- **Logo**: Event branding image
- **Start Date**: Event start date and time
- **End Date**: Event end date and time
- **Website**: Event website URL
- **Description**: Event description
- **Code of Conduct**: Community guidelines (Markdown supported)
- **Contact Email**: Primary contact for the event

{/* Screenshot Placeholder */}
> **Screenshot needed**: Event configuration page showing inline editing interface with edit icons

### Who Can Edit

- Only users with the `Admin` role for the event will see edit icons
- System Admins can edit if they have been assigned an Admin role for the event
- Non-admin users cannot edit event metadata

### How Inline Editing Works

1. **Click edit icon**: Pencil icon appears next to editable fields for admins
2. **Edit inline**: Click to enable editing directly on the page
3. **Save changes**: Click checkmark to save, or X to cancel
4. **Immediate updates**: Changes are reflected in the UI upon success
5. **Error handling**: Clear error messages for validation failures

## Event Logo Upload

Event admins can upload custom logos for visual branding.

### Upload Process

1. **Access logo section**: Click the pencil icon next to the current logo (or placeholder)
2. **Select image**: Choose a PNG or JPG file (max 5MB)
3. **Preview**: See how the logo will appear
4. **Save**: Confirm the upload

### Technical Details

- **Storage**: Logos are stored in the database as BLOBs
- **Access**: Retrieved via `GET /events/slug/:slug/logo`
- **Formats**: PNG and JPG supported
- **Size limit**: Maximum 5MB per file
- **Fallback**: Default placeholder shown if no logo uploaded

### Logo Best Practices

1. **Use square or horizontal logos** for best display
2. **Keep file sizes reasonable** (under 1MB recommended)
3. **Use high contrast** for visibility on different backgrounds
4. **Test on mobile devices** to ensure readability
5. **Consider brand consistency** with other event materials

## Event Settings Management

### Basic Event Information

**Event Name:**
- Displayed throughout the application
- Used in notifications and communications
- Should be clear and recognizable to attendees

**Event Description:**
- Markdown formatting supported
- Displayed on public event pages
- Can include links and formatted text

**Website URL:**
- Link to the main event website
- Displayed on public pages and in navigation
- Must be a valid URL starting with http:// or https://

**Contact Email:**
- Primary contact for event-related inquiries
- Used for system notifications and communications
- Should be monitored by event organizers

### Event Dates and Timing

**Start Date:**
- When the event begins
- Used for scheduling and context
- Displayed in event listings and details

**End Date:**
- When the event concludes
- Used for archival and historical context
- Optional but recommended for clarity

**Time Zone Considerations:**
- All times are stored in UTC
- Display times are converted to user's local time zone
- Event organizers should specify the event's local time zone

### Code of Conduct Configuration

**Markdown Support:**
- Full Markdown formatting available
- Supports headers, lists, links, and emphasis
- Preview available during editing

**Content Guidelines:**
- Should be clear and comprehensive
- Include reporting procedures
- Specify consequences for violations
- Provide contact information for questions

**Public Visibility:**
- Code of conduct is publicly accessible
- Available at `/events/[eventSlug]/code-of-conduct`
- No authentication required for viewing

## Advanced Configuration Options

### Event Status Management

**Active Status:**
- Controls whether the event is operational
- Inactive events have limited functionality
- Only Event Admins can change status

**Visibility Settings:**
- Public event listings (future enhancement)
- Search engine indexing preferences
- Social media sharing options

### Notification Preferences

**Event-Level Notifications:**
- Override global notification settings
- Configure notification frequency
- Set up escalation procedures

**Team Notifications:**
- Configure how team members are notified
- Set up role-specific notification rules
- Manage urgent incident alerts

### Integration Settings

**API Access:**
- Configure API keys for integrations
- Set up webhook endpoints
- Manage external service connections

**Data Export:**
- Configure automated backups
- Set up compliance reporting
- Manage data retention policies

## Configuration via API

Event configuration can also be managed programmatically:

### Update Event Settings

```bash
PATCH /api/events/slug/:slug
{
  "name": "Updated Event Name",
  "description": "Updated description",
  "website": "https://example.com",
  "contactEmail": "contact@example.com"
}
```

### Upload Event Logo

```bash
POST /api/events/slug/:slug/logo
Content-Type: multipart/form-data

[Binary image data]
```

### Get Event Configuration

```bash
GET /api/events/slug/:slug
```

Returns complete event configuration including metadata, settings, and current status.

## Configuration Best Practices

### Initial Setup

1. **Complete all basic information** before activating the event
2. **Upload a professional logo** for brand recognition
3. **Write a comprehensive code of conduct** with clear guidelines
4. **Set accurate dates** for proper scheduling and context
5. **Test all settings** before making the event public

### Ongoing Management

1. **Review settings regularly** to ensure accuracy
2. **Update information** as event details change
3. **Monitor feedback** about configuration clarity
4. **Keep contact information current** for communications
5. **Document any customizations** for future reference

### Security Considerations

1. **Limit admin access** to trusted team members
2. **Use strong passwords** for admin accounts
3. **Monitor configuration changes** through audit logs
4. **Validate all input** to prevent security issues
5. **Keep backups** of important configuration data

## Troubleshooting Configuration Issues

### Common Problems

**Cannot save changes:**
- Check your admin permissions for the event
- Verify all required fields are completed
- Ensure data formats are valid (URLs, emails, etc.)
- Try refreshing the page and attempting again

**Logo upload fails:**
- Check file size (must be under 5MB)
- Verify file format (PNG or JPG only)
- Ensure stable internet connection
- Try using a different image

**Changes not appearing:**
- Clear browser cache and refresh
- Check if changes were actually saved
- Verify you're viewing the correct event
- Contact administrators if issues persist

**Permission errors:**
- Confirm you have Event Admin role
- Check if the event is disabled
- Verify your session hasn't expired
- Contact system administrators for role issues

### Getting Help

For configuration issues:

1. **Check the audit log** for error messages
2. **Verify your permissions** and role assignments
3. **Test with different browsers** to rule out client issues
4. **Contact other event admins** for assistance
5. **Reach out to system administrators** for technical problems

## Future Configuration Enhancements

Planned improvements to event configuration include:

- **Theme customization**: Custom colors and styling for events
- **Advanced branding**: Multiple logo options and custom CSS
- **Workflow configuration**: Customizable incident management workflows
- **Integration templates**: Pre-configured integrations for common services
- **Bulk configuration**: Apply settings across multiple events

These enhancements will provide even more flexibility for event organizers while maintaining the current ease of use. 