---
sidebar_position: 2
---

# Roles and Permissions

Conducky uses a unified Role-Based Access Control (RBAC) system that provides granular permissions across system, organization, and event scopes. This system ensures security while enabling flexible management of users and access.

## Role Hierarchy

The unified RBAC system operates on three scopes:

### System Scope

- **System Admin**: Global administrative access to all organizations and events
  - Can create and manage organizations
  - Has access to all events across all organizations (with explicit role assignment)
  - Can perform system-level administrative tasks
  - Cannot access event data without explicit event roles

### Organization Scope

- **Organization Admin**: Full administrative control within their organization
  - Can create and manage events within their organization
  - Does not automatically have access to event data
  - When creating a new event, all current Org Admins are explicitly added as Event Admins for that event
  - Can manage organization members and settings
  - Can invite users to the organization
- **Organization Viewer**: Read-only access to organization information
  - Can view organization details and event list
  - No administrative permissions

### Event Scope

- **Event Admin**: Full administrative control within a specific event
  - Can manage event settings and participants
  - Can manage all incident reports for their event
  - Can assign roles to other users within the event
  - Can view all incident types and sensitive information
- **Responder**: Can respond to and manage incident reports
  - Can view and respond to assigned incident reports
  - Can update incident status and add internal comments
  - Can view reporter contact information when needed
- **Reporter**: Can submit and view their own incident reports
  - Can submit new incident reports
  - Can view and comment on their own reports
  - Can view public updates on their reports

## Access Rules

1. **System Admins** have system-level capabilities but need explicit event roles to access event data
2. **Organization Admins** do not inherit event permissions; they must be explicitly assigned Event Admin on each event (automatically assigned on creation only)
3. **Organization Viewers** have read-only access to organization details and event list
4. **Event roles** are specific to individual events

## Permission Matrix

### System-Level Permissions

| Action | System Admin | Org Admin | Org Viewer | Event Admin | Responder | Reporter |
|--------|--------------|-----------|------------|-------------|-----------|----------|
| Create Organizations | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage System Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View All Organizations | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| System-wide Audit Logs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Organization-Level Permissions

| Action | System Admin* | Org Admin | Org Viewer | Event Admin | Responder | Reporter |
|--------|---------------|-----------|------------|-------------|-----------|----------|
| Create Events | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Organization Settings | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Organization Details | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Organization Members | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Organization Invite Links | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

*System Admins need explicit organization roles to access organization data

### Event-Level Permissions (explicit roles only)

| Action | System Admin* | Org Admin | Org Viewer | Event Admin | Responder | Reporter |
|--------|---------------|-------------|--------------|-------------|-----------|----------|
| View All Reports | ❌ | ❌ | ❌ | ✅ | ✅*** | ❌ |
| Create Reports | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Edit Any Report | ❌ | ❌ | ❌ | ✅ | ✅*** | ❌ |
| Delete Reports | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Assign Reports | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Change Report Status | ❌ | ❌ | ❌ | ✅ | ✅*** | ❌ |
| View Reporter Details | ❌ | ❌ | ❌ | ✅ | ✅*** | ❌ |
| Manage Event Settings | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Manage Event Users | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Create Invite Links | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Add Internal Comments | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| View Internal Comments | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |

*System Admins need explicit event roles to access event data  
**Organization Admins do not inherit Event Admin permissions; explicit assignment is required (automatically assigned on event creation only).  
***Responders can only access reports assigned to them or public reports

## Special Permission Rules

### Data Isolation

- **Event Data Isolation**: All incident data is strictly scoped to specific events
- **Organization Boundaries**: Users cannot access data outside their assigned organizations
- **Cross-Event Access**: Users must have explicit roles in multiple events to access them

### Reporter Permissions

- **Own Reports**: Reporters can always view and comment on their own reports
- **Assigned Reports**: If a reporter is assigned to investigate another report, they gain responder-level access to that specific report
- **Anonymous Reports**: Anonymous reporters cannot edit reports after submission

### System Admin Limitations

- **Explicit Access Required**: System Admins cannot access organization or event data without explicit role assignment
- **Audit Logging**: All System Admin actions are extensively logged
- **Separation of Duties**: System administration is separated from operational event management

## Role Assignment

### Assignment Levels

1. **System Level**: Only other System Admins can assign system roles
2. **Organization Level**: Organization Admins can assign organization and event roles within their organization
3. **Event Level**: Event Admins can assign event roles within their specific events

### Assignment Rules

- Users can have multiple roles across different scopes
- Higher-level roles can assign lower-level roles within their scope
- Role assignments can have optional expiration dates
- All role changes are logged for audit purposes

### Invite Links

- Organization Admins can create invite links that automatically assign organization or event roles
- Event Admins can create invite links for their specific events
- Invite links can be time-limited and have usage limits

## Security Considerations

### Access Control

- All API endpoints enforce role-based permissions
- UI elements are hidden based on user permissions
- Database queries are automatically scoped by user permissions

### Audit Logging

- All role assignments and changes are logged
- Permission checks are logged for security monitoring
- Failed access attempts are tracked and monitored

### Data Privacy

- Users can only access data within their permitted scope
- Reporter contact information is protected based on role permissions
- Internal comments are isolated from reporters unless explicitly shared

## Managing Roles

### For System Admins

1. Access **Admin** → **Organizations** to manage organization roles
2. Use **System Settings** to assign system-level roles
3. Monitor role assignments through audit logs

### For Organization Admins

1. Access **Organization Settings** → **Members** to manage organization roles
2. Create invite links for new organization members
3. Manage event roles for events within your organization

### For Event Admins

1. Access **Event Settings** → **Team** to manage event roles
2. Create event-specific invite links
3. Assign responder roles to team members

## Best Practices

### Role Assignment

- **Principle of Least Privilege**: Assign the minimum role necessary for users to perform their duties
- **Regular Review**: Periodically review role assignments and remove unnecessary access
- **Temporary Access**: Use expiration dates for temporary role assignments
- **Documentation**: Document why specific roles were assigned for audit purposes

### Security

- **Multi-Factor Authentication**: Require MFA for admin-level roles
- **Regular Monitoring**: Monitor role assignment changes and access patterns
- **Incident Response**: Have procedures for rapidly revoking access when needed
- **Training**: Ensure users understand their permissions and responsibilities

### Organization Management

- **Clear Hierarchy**: Maintain clear organizational structure with appropriate role inheritance
- **Delegation**: Use organization roles to delegate management responsibilities effectively
- **Backup Admins**: Ensure multiple people have necessary administrative access
- **Cross-Training**: Train backup administrators on role management procedures

## Related Documentation

- [Organization Management](./organization-management.md)
- [System Configuration](./system-configuration.md)
- [User Management](../user-guide/user-management.md)
- [API Authentication](../developer-docs/api-documentation.md#authentication-testing)
