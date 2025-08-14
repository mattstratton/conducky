---
sidebar_position: 5
---

# Role Management

Understanding event roles and permissions is crucial for effective event management. This page explains the role hierarchy, permissions matrix, and how to manage team members in your events.

## Event Role Hierarchy

Each event can have users with different roles that determine their access and capabilities:

### Reporter
**Basic incident submission and viewing**
- Can submit new incident reports
- Can view their own submitted reports
- Can add comments to their own reports
- Cannot view reports submitted by others
- Cannot manage team members or event settings

### Responder
**Incident response and team coordination**
- Can view and manage all incident reports in the event
- Can assign incidents to team members
- Can change incident status and add internal comments
- Can view team member information (read-only)
- Cannot manage team membership or event settings

### Event Admin
**Full event management capabilities**
- All Responder permissions plus:
- Can manage team members and send invitations
- Can configure event settings and metadata
- Can upload logos and customize event appearance
- Can manage the code of conduct and community guidelines
- Can view audit logs and administrative information

## Permission Matrix

| Action | Reporter | Responder | Admin | System Admin* |
|--------|----------|-----------|-------|-------------|
| View own reports | ✅ | ✅ | ✅ | ❌** |
| View all reports | ❌ | ✅ | ✅ | ❌** |
| Submit reports | ✅ | ✅ | ✅ | ❌** |
| Manage reports | ❌ | ✅ | ✅ | ❌** |
| Invite users | ❌ | ❌ | ✅ | ❌** |
| Event settings | ❌ | ❌ | ✅ | ❌** |
| Create events | ❌ | ❌ | ❌ | ✅ |
| System admin | ❌ | ❌ | ❌ | ✅ |

*System Admins need explicit event roles to access event data
**System Admins can access event data only when assigned an event role

## System Admin Event Access

:::warning Important: System Admin Isolation
System Admins do **not** automatically have access to event data. This is a security feature that ensures proper data isolation between events.
:::

### How System Admins Access Event Data

1. **Event Admin assigns role**: An Event Admin must explicitly assign a role to the System Admin
2. **Role-based access**: System Admin gains access based on the assigned role (Reporter, Responder, or Admin)
3. **No special privileges**: System Admin has the same permissions as any other user with that role
4. **Event-specific**: Role assignment is per-event and doesn't transfer to other events

### Why This Separation Exists

- **Data privacy**: Ensures sensitive incident data cannot be accessed without proper authorization
- **Role clarity**: Separates system administration from event management responsibilities
- **Compliance**: Supports data protection requirements and audit trails
- **Security**: Prevents accidental or unauthorized access to event data

## Managing Team Members

### Inviting New Team Members

Event Admins can invite users to join their event team:

1. **Navigate to team management**: Go to the Team section in event navigation
2. **Click "Send Invites"**: Access the invitation interface
3. **Enter email addresses**: Add one or more email addresses
4. **Select role**: Choose the appropriate role for each invitee
5. **Add personal message**: Optional message to include with the invitation
6. **Send invitations**: Generate and send invitation links

<!-- Screenshot Placeholder -->
> **Screenshot needed**: Team invitation interface showing role selection and email entry

### Invitation Process

**For existing users:**
- Receive email with invitation link
- Click link to accept invitation
- Automatically added to event with specified role
- Can immediately access event features

**For new users:**
- Receive email with invitation link
- Click link and create new account
- Accept invitation during account creation
- Added to event with specified role

### Managing Existing Team Members

**View team members:**
- See all users with roles in the event
- View each member's role and join date
- See last activity and engagement level

**Change roles:**
- Promote/demote team members as needed
- Changes take effect immediately
- Role changes are logged in audit trail

**Remove team members:**
- Remove users from the event
- User loses all access to event data
- Can be re-invited if needed later

## Role Assignment Best Practices

### Choosing the Right Role

**Assign Reporter role when:**
- User only needs to submit incident reports
- User is an event attendee or participant
- User doesn't need to see other people's reports
- User has no incident response responsibilities

**Assign Responder role when:**
- User is part of the incident response team
- User needs to see and manage all incident reports
- User will be assigned incidents to investigate
- User needs to coordinate with other responders

**Assign Event Admin role when:**
- User is an event organizer or manager
- User needs to configure event settings
- User will manage team membership
- User has overall responsibility for the event

### Team Structure Recommendations

**Small Events (1-50 attendees):**
- 1-2 Event Admins
- 2-3 Responders
- All other attendees as Reporters

**Medium Events (50-200 attendees):**
- 2-3 Event Admins
- 4-6 Responders
- Specialized roles (e.g., legal, HR)
- All other attendees as Reporters

**Large Events (200+ attendees):**
- 3-5 Event Admins
- 8-12 Responders
- Specialized response teams
- Clear escalation procedures
- All other attendees as Reporters

## Role Changes and Audit Trail

### When Roles Change

All role changes are tracked in the audit log:

- **Who made the change**: User who performed the action
- **What changed**: Old role and new role
- **When it happened**: Timestamp of the change
- **Why it changed**: Optional reason or note

### Automatic Role Changes

Some role changes happen automatically:

- **Event creation**: All current Organization Admins are explicitly added as Event Admins for the new event (including the creator)
- **User removal**: All roles removed when user leaves event
- **Event deactivation**: Roles preserved but access suspended

### Manual Role Changes

Event Admins can manually change roles:

- **Immediate effect**: Changes take effect immediately
- **Notification**: User may receive notification of role change
- **Audit logging**: All manual changes are logged
- **Reversible**: Role changes can be undone if needed

## Multi-Event Role Management

### Different Roles in Different Events

Users can have different roles in different events:

- **Independent assignment**: Roles don't transfer between events
- **Context switching**: Navigation adapts to current event role
- **Separate permissions**: Actions available based on current event role
- **Audit separation**: Actions logged separately for each event

### Managing Multiple Event Roles

**For users:**
- Check role indicators in event switcher
- Understand permissions change between events
- Use appropriate features for each event context
- Contact event admins for role questions

**For administrators:**
- Assign roles based on event-specific needs
- Don't assume roles transfer between events
- Communicate role differences to team members
- Monitor role effectiveness across events

## Troubleshooting Role Issues

### Common Role Problems

**User cannot access event features:**
- Verify user has appropriate role in the event
- Check if user account is active and verified
- Confirm event is active and not disabled
- Ensure user is logged in properly

**System Admin cannot access event data:**
- Remember: System Admins need explicit event roles
- Have Event Admin assign appropriate role
- Verify role assignment was successful
- Check audit log for role assignment

**Role changes not taking effect:**
- Refresh the page or clear browser cache
- Check if role change was actually saved
- Verify user is in the correct event context
- Contact system administrators if issues persist

**Team member permissions seem wrong:**
- Review the permission matrix above
- Confirm user's actual role in the event
- Check if event has custom permission settings
- Verify user understands role limitations

### Getting Help with Roles

For role-related issues:

1. **Check the audit log** for recent role changes
2. **Verify user permissions** and current role assignments
3. **Test role functionality** with different user accounts
4. **Contact other event admins** for assistance
5. **Reach out to system administrators** for technical problems

## Security Considerations

### Role Security Best Practices

1. **Principle of least privilege**: Assign minimum necessary role
2. **Regular role review**: Periodically review team member roles
3. **Prompt role removal**: Remove roles when team members leave
4. **Audit monitoring**: Monitor role changes in audit logs
5. **Clear communication**: Ensure team members understand their roles

### Protecting Event Data

- **Role validation**: System validates roles for every action
- **Event isolation**: Roles don't grant access to other events
- **Audit trails**: All role-based actions are logged
- **Access controls**: UI and API enforce role-based permissions

Understanding these role management concepts helps ensure your event team has appropriate access while maintaining security and data privacy. 