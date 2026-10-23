---
sidebar_position: 2
---

# Role-Based Navigation

The sidebar navigation automatically adapts based on your user role and current context. This page explains what navigation options are available for each role type.

## System Admin Navigation

System Admins have access to both system management and personal event participation:

**System Admin Section** (always visible to System Admins):

- 🏠 **System Dashboard** (`/admin/dashboard`)
- 🎯 **Events Management** (`/admin/events`)
  - All Events
  - Create Event (`/admin/events/new`)
  - Event Settings and Invite Management
- ⚙️ **System Settings** (`/admin/system/settings`) - Configure global system settings

**Personal Navigation** (same as regular users):

- 🏠 **Home** (`/dashboard`)
- 📋 **All Reports** (`/dashboard/reports`)
- 🔔 **Notifications** (`/dashboard/notifications`)
- **My Events** section with event switcher

:::warning[System Admin Event Access]
System Admins do **not** automatically have access to event data. They must be explicitly added to events by Event Admins to view or manage incident reports.
:::

## Event Admin Navigation

Event Admins see full event management capabilities:

**Global Navigation**:

- 🏠 **Home** (Dashboard)
- 📋 **All Reports** (Cross-Event Reports Dashboard)
- 🔔 **Notifications** (Notification Center)

**Event Navigation** (when in `/events/[eventSlug]/`):

- 🏠 **Event Dashboard**
- 📋 **Reports**
  - All Reports
  - Submit Report
- 👥 **Team**
  - Team Members
  - Send Invites
  - User Management
- ⚙️ **Event Settings**
  - Event Details
  - Code of Conduct
  - Notifications

**My Events Section**:

- Event switcher dropdown
- Quick access to all events you belong to
- Role indication for each event

## Event Responder Navigation

Responders see report management and team information:

**Global Navigation**:

- 🏠 **Home** (Dashboard)
- 📋 **All Reports** (Cross-Event Reports Dashboard)
- 🔔 **Notifications** (Notification Center)

**Event Navigation**:

- 🏠 **Event Dashboard**
- 📋 **Reports**
  - All Reports
  - Submit Report
- 👥 **Team** (view only)

**My Events Section**:

- Event switcher with role indicators
- Quick navigation between events

:::info[Responder Permissions]
Responders can view and manage all incidents in events where they have the Responder role, but cannot manage team members or event settings.
:::

## Event Reporter Navigation

Reporters see basic event information and their own reports:

**Global Navigation**:

- 🏠 **Home** (Dashboard)
- 📋 **All Reports** (Cross-Event Reports Dashboard)
- 🔔 **Notifications** (Notification Center)

**Event Navigation**:

- 🏠 **Event Dashboard**
- 📋 **Reports**
  - My Reports
  - Submit Report

**My Events Section**:

- Event switcher
- Access to events where you're a reporter

:::note[Reporter Limitations]
Reporters can only see their own incident reports and cannot view reports submitted by others. They also cannot access team management features.
:::

## Navigation Permissions Matrix

| Feature | Reporter | Responder | Event Admin | System Admin* |
|---------|----------|-----------|-------------|---------------|
| View own reports | ✅ | ✅ | ✅ | ❌** |
| View all event reports | ❌ | ✅ | ✅ | ❌** |
| Submit reports | ✅ | ✅ | ✅ | ❌** |
| Team management | ❌ | View only | ✅ | ❌** |
| Event settings | ❌ | ❌ | ✅ | ❌** |
| Create events | ❌ | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ❌ | ✅ |

*System Admins need event roles to access event data
**System Admins without event roles cannot access event-specific data

## Role Indicators

Throughout the navigation, you'll see role indicators that help you understand your permissions:

- **Admin badge**: Shows when you have Event Admin role
- **Responder badge**: Shows when you have Responder role  
- **Reporter badge**: Shows when you have Reporter role
- **System Admin indicator**: Shows in the user menu when you have system-level access

## Switching Between Contexts

### For System Admins
System Admins can easily switch between system administration and personal contexts:

1. **System Admin Context**: Use the dedicated admin section in the sidebar
2. **Personal Context**: Use the regular navigation to access your events
3. **Event Context**: Join events as needed to access event-specific data

### For Multi-Role Users
If you have different roles in different events:

1. **Event switcher** shows your role in each event
2. **Navigation adapts** when you switch events
3. **Permissions change** based on your role in the current event
4. **Global features** remain consistent across all events

## Understanding Navigation Changes

When you switch roles or contexts, you may notice:

- **Menu items appear/disappear** based on permissions
- **Submenu options change** depending on your role
- **Action buttons** are shown/hidden based on what you can do
- **Event-specific sections** only show for events you belong to

This dynamic navigation ensures you only see options you can actually use, reducing confusion and improving the user experience. 