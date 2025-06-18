---
sidebar_position: 3
---

# Navigation Guide

Conducky features a sophisticated sidebar-based navigation architecture designed to provide clear context and role-based access to functionality. This guide explains how navigation works across different user roles and contexts.

## Navigation Architecture

### Sidebar Navigation System

Conducky uses a modern sidebar navigation that adapts to your role and current context:

- **Always visible**: Core navigation items you have access to
- **Context-aware**: Changes based on whether you're in system admin, global, or event context
- **Role-based**: Only shows items you have permission to access
- **Responsive**: Collapses on mobile devices for optimal mobile experience

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

- **Global Navigation**: Home, All Reports, Notifications always visible
- **Event Section**: Shows when you belong to events, with event-specific navigation
- **System Admin Section**: Only visible to SuperAdmins, provides system management access
- **User Menu**: Profile, settings, and logout options

## Navigation by User Role

### SuperAdmin Navigation

SuperAdmins have access to both system management and personal event participation:

**System Admin Section** (always visible to SuperAdmins):

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

### Event Admin Navigation

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

### Event Responder Navigation

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

### Event Reporter Navigation

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

## Event Switching

### Event Switcher in Sidebar

The "My Events" section in the sidebar provides:

- **Event List**: All events you belong to with role indicators
- **Quick Switching**: Click any event to switch context
- **Role Visibility**: Shows your role in each event (Admin, Responder, Reporter)
- **Context Preservation**: Maintains your current page type when switching

### Multi-Event Dashboard

The global dashboard (`/dashboard`) provides:

- **Event Cards**: Role-based previews of each event you belong to
- **Quick Actions**: Role-specific actions for each event
- **Recent Activity**: Cross-event activity summary
- **Event Navigation**: Click any event card to enter that event's context

## URL Structure

### Global URLs

- `/dashboard` - Multi-event overview
- `/dashboard/reports` - All reports across events
- `/dashboard/notifications` - Cross-event notifications
- `/profile` - User profile and settings
- `/profile/events` - Event membership management

### Event URLs

- `/events/[eventSlug]/` - Public event page (no authentication required)
- `/events/[eventSlug]/dashboard` - Event-specific dashboard
- `/events/[eventSlug]/reports` - Event reports (role-scoped)
- `/events/[eventSlug]/reports/new` - Submit new report
- `/events/[eventSlug]/reports/[reportId]` - Report details
- `/events/[eventSlug]/team` - Team management (admin/responder)
- `/events/[eventSlug]/settings` - Event settings (admin only)
- `/events/[eventSlug]/code-of-conduct` - Public code of conduct page

### System Admin URLs

- `/admin/dashboard` - System overview
- `/admin/events` - Event management
- `/admin/events/new` - Create new event
- `/admin/events/[eventId]/settings` - Event settings and invite management
- `/admin/system/settings` - System configuration and settings

## Mobile Navigation

### Responsive Design

The sidebar navigation is fully responsive and mobile-optimized:

- **Collapsible sidebar**: Automatically collapses on mobile devices with hamburger menu
- **Touch-friendly**: All navigation elements are optimized for touch interaction
- **Context awareness**: Mobile navigation maintains the same context-aware behavior
- **Event switcher**: Optimized for mobile event switching

### Mobile-Specific Features

- **Overlay mode**: Sidebar overlays content on mobile instead of pushing it
- **Swipe gestures**: Swipe to open/close sidebar on mobile
- **Touch targets**: All navigation items meet minimum touch target sizes (44px)
- **Smooth animations**: Optimized transitions for mobile devices

## Authentication and Navigation

### Login Flow

1. **First-time users**: Directed to global dashboard with "No events" message
2. **Single event users**: Directed to that event's dashboard
3. **Multi-event users**: Directed to global dashboard showing all events
4. **SuperAdmins**: Directed to system admin dashboard with full system navigation

### Authentication State

- **Logged out**: Only public pages accessible
- **Logged in**: Full navigation based on roles
- **Session persistence**: Navigation state maintained across browser sessions
- **Auto-redirect**: Unauthenticated users redirected to login when accessing protected pages

## Performance Optimizations

### Recent Improvements

The navigation system has been optimized for performance:

- **Reduced API calls**: Sidebar now fetches data efficiently to minimize server requests
- **Optimized polling**: Notification polling reduced from 30 seconds to 2 minutes
- **Better caching**: User roles and events are cached to prevent redundant fetches
- **Parallel data loading**: Multiple API calls are made in parallel where possible

### Navigation Loading

- **Fast initial load**: Core navigation appears immediately
- **Progressive enhancement**: Additional features load as data becomes available
- **Error handling**: Graceful fallbacks when navigation data fails to load
- **Offline support**: Basic navigation works even with poor connectivity

## Navigation Best Practices

### For Users

1. **Use the global dashboard** to get an overview of all your events
2. **Leverage the event switcher** for quick navigation between events
3. **Check your role** in each event to understand what actions are available
4. **Use breadcrumbs** to understand your current location in the application

### For Admins

1. **SuperAdmins**: Use the system admin section for installation management
2. **Event Admins**: Use event settings for detailed event configuration
3. **Invite Management**: Generate admin invites through the system admin interface
4. **Context Switching**: Switch between system admin and personal contexts as needed

### Mobile Users

1. **Use the hamburger menu** to access the full navigation on mobile
2. **Swipe gestures** can quickly open/close the sidebar
3. **Touch-friendly design** ensures easy navigation on small screens
4. **Responsive layout** adapts to your device size automatically

## Troubleshooting Navigation

### Common Issues

- **Sidebar not showing**: Check authentication status and refresh the page
- **Missing navigation items**: Verify your role permissions for the current context
- **Event switcher empty**: Ensure you belong to at least one event
- **Performance issues**: Clear browser cache and check network connectivity

### SuperAdmin Issues

- **System admin section missing**: Verify SuperAdmin role assignment
- **Cannot access events**: Remember that SuperAdmins need event roles to access event data
- **Navigation slow**: Check for excessive API calls in browser developer tools

### Getting Help

For navigation issues:

1. Check browser console for errors
2. Verify your user roles and permissions
3. Try refreshing the page or clearing cache
4. Contact system administrators for role-related issues
5. Consult the [troubleshooting guide](troubleshooting) for detailed solutions

## Future Enhancements

Planned navigation improvements include:

- **Advanced search**: Global search across all accessible content
- **Keyboard shortcuts**: Quick navigation using keyboard commands
- **Customizable sidebar**: User-configurable navigation preferences
- **Breadcrumb improvements**: Enhanced location awareness
- **Accessibility enhancements**: Better screen reader support and keyboard navigation
