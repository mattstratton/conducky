---
sidebar_position: 4
---

# Understanding Roles

Learn about the different user roles in Conducky and what permissions each role provides.

---

## Role Overview

Conducky uses a comprehensive role-based access control system with two types of roles:

### System-Level Roles
- **System Admin**: System-wide management capabilities
- **Regular User**: Standard user with no system privileges (most users)

### Event-Level Roles
- **Event Admin**: Full management of a specific event
- **Responder**: Report management and team coordination within an event
- **Reporter**: Basic report submission and viewing within an event

### Organization-Level Roles
- **Organization Admin**: Management of multiple events within an organization
- **Organization Viewer**: Read-only access to multiple events within an organization

:::info Multi-Role Support
You can have different roles in different events. For example, you might be an Event Admin for one conference and a Reporter for another.
:::

---

## System-Level Roles

### System Admin

**Capabilities:**
- Create and manage all events in the system
- Access system-wide configuration settings
- Manage users across all events
- View system analytics and logs
- Control global system features

**Important limitation:** System Admins do **not** automatically have access to event data. They must be explicitly added to events by Event Admins.

**Typical workflow:**
1. Set up and configure the Conducky system
2. Create events and assign Event Admins
3. Manage system-wide settings and maintenance
4. Monitor overall system health and usage

**Screenshot needed:** *System admin interface showing event management and system settings*

### Regular User

**Capabilities:**
- Participate in events where they have been assigned roles
- Manage their own profile and account settings
- Access features based on their event-specific roles

**Limitations:**
- No system-wide administrative access
- Cannot create events
- Cannot access system configuration

---

## Event-Level Roles

### Event Admin

**Full event management capabilities:**

**User Management:**
- Invite new team members with any role
- Change user roles within the event
- Remove users from the event
- View team member activity and statistics

**Event Configuration:**
- Modify event details (name, description, dates)
- Upload event logos and branding
- Configure Code of Conduct content
- Set up event-specific settings and policies
- Control event visibility and public pages

**Report Management:**
- View and manage all reports in the event
- Change report states and assignments
- Add internal and external comments
- Access sensitive information and evidence
- Generate reports and analytics

**Screenshot needed:** *Event admin dashboard showing management options and team overview*

**Typical workflow:**
1. Set up event before it starts
2. Invite and train response team
3. Monitor incident activity during event
4. Ensure proper response to all reports
5. Conduct post-event analysis and improvements

### Responder

**Report management and team coordination:**

**Report Access:**
- View all reports in events where they have Responder role
- Change report states (submitted → investigating → resolved → closed)
- Assign reports to team members
- Add internal and external comments
- Access evidence and sensitive information

**Team Collaboration:**
- See team member information and roles
- Participate in internal discussions
- Coordinate response efforts
- View team activity and workload

**Limitations:**
- Cannot invite new users or change roles
- Cannot modify event settings
- Cannot access system administration features

**Screenshot needed:** *Responder interface showing report list and management options*

**Typical workflow:**
1. Monitor for new report submissions
2. Acknowledge and begin investigating reports
3. Coordinate with team members on response
4. Document actions and decisions in comments
5. Update report states as situations progress

### Reporter

**Basic reporting and viewing:**

**Report Capabilities:**
- Submit new incident reports
- View their own submitted reports
- Add comments to their own reports
- Upload evidence and documentation
- Track the status of their reports

**Limitations:**
- Cannot see reports from other users
- Cannot change report states or assignments
- Cannot access team management features
- Cannot see internal team discussions

**Screenshot needed:** *Reporter interface showing personal reports and submission form*

**Typical workflow:**
1. Submit reports when incidents occur
2. Provide additional information when requested
3. Track progress on their submitted reports
4. Communicate with response team through comments

---

## Permission Matrix

Here's a detailed breakdown of what each role can do:

| Action | Reporter | Responder | Event Admin | Org Admin | Org Viewer | System Admin* |
|--------|----------|-----------|-------------|-----------|------------|-------------|
| **Reports** |
| Submit reports | ✅ | ✅ | ✅ | ✅ | ❌ | ❌** |
| View own reports | ✅ | ✅ | ✅ | ✅ | ❌ | ❌** |
| View all reports | ❌ | ✅ | ✅ | ✅ | ✅ | ❌** |
| Change report states | ❌ | ✅ | ✅ | ✅ | ❌ | ❌** |
| Assign reports | ❌ | ✅ | ✅ | ✅ | ❌ | ❌** |
| Add internal comments | ❌ | ✅ | ✅ | ✅ | ❌ | ❌** |
| Add external comments | ✅ | ✅ | ✅ | ✅ | ❌ | ❌** |
| **Team Management** |
| View team roster | ❌ | ✅ | ✅ | ✅ | ✅ | ❌** |
| Invite users | ❌ | ❌ | ✅ | ✅ | ❌ | ❌** |
| Change user roles | ❌ | ❌ | ✅ | ✅ | ❌ | ❌** |
| Remove users | ❌ | ❌ | ✅ | ✅ | ❌ | ❌** |
| **Event Management** |
| Modify event settings | ❌ | ❌ | ✅ | ✅ | ❌ | ❌** |
| Upload event branding | ❌ | ❌ | ✅ | ✅ | ❌ | ❌** |
| Configure Code of Conduct | ❌ | ❌ | ✅ | ✅ | ❌ | ❌** |
| **Organization Management** |
| Create events | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Manage organization settings | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Cross-event coordination | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **System Administration** |
| Create organizations | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| System configuration | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Global user management | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

*System Admins need explicit event roles to access event data  
**Requires specific event role assignment

---

## Understanding Role Assignment

Roles in Conducky are assigned based on functional needs and responsibilities, not seniority or progression:

### Role Assignment Principles

- **Functional necessity**: Users receive roles based on what they need to accomplish
- **Event-specific**: Role assignments are tailored to each event's requirements
- **Administrative decision**: Event Admins assign roles based on team needs
- **No hierarchy**: Roles represent different functions, not levels of authority

### Role Assignment Examples

**Reporter role** is assigned to:
- Event attendees who may need to submit incident reports
- Community members participating in the event
- Anyone who needs basic access to report incidents

**Responder role** is assigned to:
- Code of conduct team members
- Safety officers and event staff
- Volunteers trained in incident response

**Event Admin role** is assigned to:
- Event organizers and coordinators
- Lead safety officers
- Those responsible for team management

**Organization Admin role** is assigned to:
- Multi-event coordinators
- Organization safety directors
- Those responsible for coordinating multiple events
- Regional or national event managers

**Organization Viewer role** is assigned to:
- Oversight committees
- Compliance officers
- External auditors
- Those who need read-only access to multiple events

**System Admin role** is assigned to:
- Technical administrators
- Platform maintainers
- Those responsible for system-wide operations

---

## Multi-Event Role Management

### Different Roles in Different Events

You can have completely different roles across events:

**Example scenarios:**
- **Conference A**: Event Admin (you organize this conference)
- **Conference B**: Responder (you volunteer for their safety team)
- **Conference C**: Reporter (you attend as a regular participant)

### Managing Multiple Roles

**Navigation considerations:**
- Sidebar changes based on your role in the current event
- Global dashboard shows all your events with role indicators
- Cross-event features respect your highest permission level

**Responsibility management:**
- Set different notification preferences for different roles
- Use the global reports dashboard to manage Responder/Admin workload
- Switch between events easily using the event selector

**Screenshot needed:** *Multi-event dashboard showing different role indicators for each event*

---

## Getting Help with Roles

### Understanding Your Current Role

**To check your role in an event:**
1. Go to the event dashboard
2. Look at the sidebar navigation (shows role-appropriate options)
3. Check the event card on your global dashboard
4. Visit the team page (if you have access)

### Role-Related Questions

**Common questions:**
- **"Why can't I see other reports?"** - You likely have Reporter role
- **"Why can't I invite users?"** - You need Event Admin role
- **"Why can't I access event data as System Admin?"** - System Admins need explicit event roles

### Requesting Role Changes

**To request a role change:**
1. Contact the Event Admin for the specific event
2. Explain why you need additional permissions
3. Demonstrate competence in your current role
4. Be patient - role changes require trust and consideration

---

## Next Steps

Now that you understand roles and permissions:

1. **[Set up your profile](./profile-management)** - Complete your personal information
2. **[Get role-specific guidance](./next-steps)** - Follow recommendations for your specific role
3. **[Learn about navigation](../navigation/overview)** - Understand how the interface changes based on your role

**Questions about permissions?** Check our [FAQ](../faq/overview) or contact your event administrators.

---

**Continue with:** [Profile Management →](./profile-management) 