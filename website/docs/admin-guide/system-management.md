---
sidebar_position: 3
---

# System Management

This guide covers SuperAdmin functions for managing the overall Conducky system.

## SuperAdmin Role

SuperAdmins have system-wide access and can:

- Create new events
- View all events in the system
- Access any event's data (with proper authorization)
- Manage global system settings
- Monitor system health and usage

## Creating Events

Only SuperAdmins can create new events in the system.

### Via the UI

1. Log in as a SuperAdmin
2. Go to the Admin page (available in the main navigation)
3. Click "Create New Event"
4. Fill in the event details:
   - **Name**: Display name for the event
   - **Slug**: URL-safe identifier (lowercase, letters, numbers, hyphens only)
5. Click "Create Event"

The event will be created and you'll be automatically assigned as an Admin for that event.

### Via the API

Use the `POST /events` endpoint with:

```json
{
  "name": "My Conference 2024",
  "slug": "my-conference-2024"
}
```

Requirements:
- Must be authenticated as a SuperAdmin
- Slug must be unique across the system
- Slug must be URL-safe (lowercase, alphanumeric, hyphens only)

## Managing Events

### Listing All Events

SuperAdmins can view all events in the system:

- **UI**: The Admin page shows a list of all events
- **API**: `GET /events` returns all events (SuperAdmin only)

### Event Access

SuperAdmins can access any event, but they must be explicitly assigned a role within that event to manage it. This ensures proper audit trails and role-based access control.

To manage a specific event:
1. Assign yourself an Admin role for that event
2. Use the standard event management interface

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

- **Cannot create events**: Verify SuperAdmin role assignment
- **Cannot access event data**: Assign yourself an event role first
- **Database connection errors**: Check `DATABASE_URL` and database status
- **Performance issues**: Monitor database queries and system resources

### Getting Help

For system-level issues:
1. Check the application logs
2. Verify environment variables
3. Test database connectivity
4. Review the [troubleshooting guide](../user-guide/troubleshooting)
5. Consult the [Developer Docs](../developer-docs/intro) for technical details

## Future Features

Planned SuperAdmin features include:
- Web-based user management interface
- System analytics and reporting
- Automated backup management
- Advanced security monitoring 