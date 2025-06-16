---
sidebar_position: 3
---

# Navigation Guide

Conducky features a sophisticated three-level navigation architecture designed to provide clear context and role-based access to functionality. This guide explains how navigation works across different user roles and contexts.

## Navigation Architecture

### Three Navigation Contexts

Conducky organizes functionality into three distinct navigation contexts:

#### 1. **Global Dashboard Context** (`/dashboard`)
Your personal multi-event overview where you can:
- View all events you belong to with role-based previews
- Access cross-event reports and notifications
- Manage your profile and settings
- Switch between events

#### 2. **Event Context** (`/events/[eventSlug]/`)
Event-specific functionality when working within a particular event:
- Event dashboard and reports
- Team management (role-dependent)
- Event settings (admin only)
- Event-specific navigation adapts to your role

#### 3. **System Admin Context** (`/admin/`)
System-level management for SuperAdmins only:
- Manage all events in the installation
- System settings and configuration
- User management across events
- No access to event data without explicit event roles

### Context-Aware Sidebar

The sidebar navigation automatically adapts based on your current context and role:

- **Always visible**: Global navigation items (Home, All Reports, Notifications)
- **Event section**: Shows when in event context with event-specific navigation
- **Role-based filtering**: Only shows navigation items you have permission to access
- **Event switcher**: Dropdown to switch between events (when applicable)

## Navigation by User Role

### SuperAdmin Navigation

SuperAdmins have access to both system management and personal event participation:

**System Admin Context** (`/admin/`):
- 🏠 System Dashboard
- 🎯 Events Management
  - All Events
  - Create Event
  - Event Settings
- ⚙️ System Settings
- 👤 User Management

**Personal Context** (`/dashboard`):
- Same navigation as regular users for events they belong to
- Can switch between system admin and personal contexts

### Event Admin Navigation

Event Admins see full event management capabilities:

**Global Context**:
- 🏠 Home (Dashboard)
- 📋 All Reports (Cross-Event Reports Dashboard)
- 👤 Profile (Settings and Event Management)
- 📝 Notifications (Future)

**Event Context** (when in `/events/[eventSlug]/`):
- 🏠 Event Dashboard
- 📋 Reports
  - All Reports
  - Submit Report
- 👥 Team
  - Team Members
  - Send Invites
  - User Management
- ⚙️ Event Settings
  - Event Details
  - Code of Conduct
  - Notifications

### Event Responder Navigation

Responders see report management and team information:

**Global Context**:
- 🏠 Home (Dashboard)
- 📋 All Reports (Cross-Event Reports Dashboard)
- 👤 Profile (Settings and Event Management)
- 📝 Notifications (Future)

**Event Context**:
- 🏠 Event Dashboard
- 📋 Reports
  - All Reports
  - Submit Report
- 👥 Team (view only)

### Event Reporter Navigation

Reporters see basic event information and their own reports:

**Global Context**:
- 🏠 Home (Dashboard)
- 📋 All Reports (Cross-Event Reports Dashboard)
- 👤 Profile (Settings and Event Management)
- 📝 Notifications (Future)

**Event Context**:
- 🏠 Event Dashboard
- 📋 Reports
  - My Reports
  - Submit Report

## Event Switching

### Event Switcher Dropdown

When you belong to multiple events, the event switcher appears in the sidebar:

- **Location**: Below the global navigation section
- **Functionality**: Quick switching between events
- **Context preservation**: Maintains your current page type when switching (e.g., dashboard to dashboard)

### Multi-Event Dashboard

The global dashboard (`/dashboard`) provides:

- **Event cards**: Role-based previews of each event you belong to
- **Quick actions**: Role-specific actions for each event
- **Recent activity**: Cross-event activity summary
- **Event switching**: Click any event card to enter that event's context

## URL Structure

### Global URLs
- `/dashboard` - Multi-event overview
- `/dashboard/reports` - All reports across events (Cross-Event Reports Dashboard)
- `/dashboard/notifications` - Cross-event notifications (Future)
- `/profile/settings` - User profile and account settings
- `/profile/events` - Event membership management

### Event URLs
- `/events/[eventSlug]/dashboard` - Event-specific dashboard
- `/events/[eventSlug]/reports` - Event reports (role-scoped)
- `/events/[eventSlug]/reports/new` - Submit new report
- `/events/[eventSlug]/reports/[reportId]` - Report details
- `/events/[eventSlug]/team` - Team management (admin/responder)
- `/events/[eventSlug]/settings` - Event settings (admin only)

### System Admin URLs
- `/admin/dashboard` - System overview
- `/admin/events` - Event management
- `/admin/events/new` - Create new event
- `/admin/system/settings` - System configuration

## Mobile Navigation

### Responsive Design

The navigation system is fully responsive and mobile-optimized:

- **Collapsible sidebar**: Automatically collapses on mobile devices
- **Touch-friendly**: All navigation elements are optimized for touch interaction
- **Context awareness**: Mobile navigation maintains the same context-aware behavior
- **Event switcher**: Optimized dropdown for mobile event switching

### Mobile-Specific Features

- **Swipe gestures**: Swipe to open/close sidebar on mobile
- **Bottom-safe areas**: Navigation respects mobile browser UI
- **Touch targets**: All navigation items meet minimum touch target sizes (44px)

## Authentication and Navigation

### Login Flow

1. **First-time users**: Directed to global dashboard with "No events" message
2. **Single event users**: Directed to that event's dashboard
3. **Multi-event users**: Directed to global dashboard showing all events
4. **SuperAdmins**: Directed to system admin dashboard

### Authentication State

- **Logged out**: Only public pages accessible
- **Logged in**: Full navigation based on roles
- **Session persistence**: Navigation state maintained across browser sessions
- **Auto-redirect**: Unauthenticated users redirected to login when accessing protected pages

## Navigation Best Practices

### For Users

1. **Use the global dashboard** to get an overview of all your events
2. **Use event context** for focused work within a specific event
3. **Use the event switcher** to quickly move between events
4. **Check your role** in each event to understand available functionality

### For Admins

1. **Start with global dashboard** to see all events you manage
2. **Use event context** for detailed event management
3. **Use system admin context** (if SuperAdmin) for installation management
4. **Remember role separation**: SuperAdmin ≠ automatic event access

## Troubleshooting Navigation

### Common Issues

**"I can't see the sidebar"**
- Ensure you're logged in
- Check that you have roles in at least one event
- Try refreshing the page

**"I can't access an event"**
- Verify you have a role in that event
- Check with an event admin if you should have access
- SuperAdmins need explicit event roles to access event data

**"Navigation items are missing"**
- Navigation is role-based - you only see what you have permission to access
- Contact an event admin to request additional permissions

**"Event switcher not showing"**
- Event switcher only appears when you belong to multiple events
- Single-event users don't see the switcher

### Getting Help

If you encounter navigation issues:

1. Check your user roles in the profile section
2. Verify you're in the correct context (global vs event vs system)
3. Contact your event administrator for role-related issues
4. Contact your system administrator for technical issues

## Technical Implementation

### Context Detection

The navigation system automatically detects context based on the current URL:

- URLs starting with `/admin/` → System Admin context
- URLs starting with `/events/[slug]/` → Event context
- All other authenticated URLs → Global context

### Role-Based Rendering

Navigation items are filtered based on:

- **System roles**: SuperAdmin access to system features
- **Event roles**: Admin/Responder/Reporter access to event features
- **Authentication state**: Logged in vs logged out users

### Performance Optimization

- **Lazy loading**: Event data loaded only when needed
- **Caching**: Navigation state cached for performance
- **Responsive**: Navigation adapts to screen size and device capabilities 