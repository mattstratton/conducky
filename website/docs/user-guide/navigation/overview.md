---
sidebar_position: 1
---

# Navigation Overview

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
- Access organization-level features (if applicable)

#### 2. **Event Context** (`/events/[eventSlug]/`)

Event-specific functionality when working within a particular event:

- Event dashboard and reports
- Team management (role-dependent)
- Event settings (admin only)
- Event-specific navigation adapts to your role

#### 3. **Organization Context** (`/orgs/[orgSlug]/`)

Organization-level functionality for managing multiple events:

- Organization dashboard and overview
- Cross-event management and coordination
- Organization settings and policies
- Multi-event analytics and reporting

#### 4. **System Admin Context** (`/admin/`)

System-level management for System Admins only:

- Manage all organizations and events in the installation
- System settings and configuration
- User management across organizations and events
- No access to event data without explicit event roles

### Context-Aware Sidebar

The sidebar navigation automatically adapts based on your current context and role:

- **Global Navigation**: Home, All Reports, Notifications always visible
- **Organization Section**: Shows when you belong to organizations, with organization-level navigation
- **Event Section**: Shows when you belong to events, with event-specific navigation
- **System Admin Section**: Only visible to System Admins, provides system management access
- **User Menu**: Profile, settings, and logout options

## Quick Navigation Tips

### For New Users
1. **Start with the global dashboard** to understand your event access
2. **Check your role** in each event to understand available actions
3. **Use the event switcher** to move between different events
4. **Follow breadcrumbs** to understand your current location

### For Mobile Users
1. **Tap the hamburger menu** to access full navigation
2. **Swipe to open/close** the sidebar
3. **All touch targets** are optimized for mobile interaction
4. **Responsive design** adapts to your screen size

### For Administrators
1. **System Admins**: Use the dedicated admin section for system management
2. **Event Admins**: Access event settings through event navigation
3. **Remember**: System Admins need event roles to access event data
4. **Switch contexts** easily between admin and personal functions

## Navigation Sections

This guide is organized into focused sections:

- **[Role-Based Navigation](./role-based-navigation)** - How navigation changes by user role
- **[Organization Navigation](./organization-navigation)** - Managing organizations and cross-event features
- **[Event Switching](./event-switching)** - Managing multiple events
- **[URL Structure](./url-structure)** - Understanding Conducky's URL patterns
- **[Mobile Navigation](./mobile-navigation)** - Mobile-specific features
- **[Troubleshooting](./troubleshooting)** - Common navigation issues and solutions

## Getting Help

If you're having trouble with navigation:
1. Check the [troubleshooting section](./troubleshooting)
2. Verify your user roles and permissions
3. Try refreshing the page or clearing browser cache
4. Contact your event administrators for role-related issues 