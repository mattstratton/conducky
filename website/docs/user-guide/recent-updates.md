---
sidebar_position: 2
---

# Recent Updates

This page highlights the most recent updates and improvements to Conducky. For detailed changelogs and release notes, see the [GitHub releases](https://github.com/mattstratton/conducky/releases).

## Latest Updates

### ♻️ Reopen Incidents (New Feature)
- Added a dedicated Reopen action to the Incident detail State & Assignment section
- Notes are required; optional assignment determines target state:
  - With assignee → moves to Investigating
  - Without assignee → moves to Acknowledged
- Available to Responder, Event Admin, and System Admin roles

### 🔖 Per-user Incident Pins
- Pins are now stored per user and sync across devices
- New API endpoints under Users API to list, pin, and unpin incidents

### 🏗️ Organization Management
- Enhanced organization-level role management
- Improved cross-event coordination features
- Better organization-level analytics and reporting

## Recent Major Features

### 💬 Enhanced Comment System
The comment system has been significantly upgraded with advanced collaboration features:

**Markdown Support:**
- Rich text formatting with GitHub-style markdown
- Universal rendering across all comments
- Preview mode for editing

**Advanced Search & Navigation:**
- Real-time search with debounced input
- Smart pagination for large comment threads
- Direct linking to specific comments

**Enhanced User Experience:**
- Quote reply functionality
- Inline editing capabilities
- Role-based filtering
- Mobile-optimized interface

### 🔔 Notification Center
A comprehensive notification system for staying informed about important activities:

**Key Features:**
- Centralized hub accessible from Dashboard > Notifications
- Automatic notification generation for incident events
- Advanced filtering by type, priority, and read status
- Real-time updates and mobile responsiveness

### 📋 Cross-Event Incidents Dashboard
Enhanced multi-event incident management with:
- View incidents across all accessible events
- Role-based filtering and access control
- Quick assignment and status change actions
- Advanced search and filtering capabilities

## UI/UX Improvements

- **Dark Mode**: Full dark mode support across all pages
- **Mobile Optimization**: Improved mobile experience with touch-friendly interfaces
- **Responsive Tables**: Tables automatically convert to cards on mobile devices
- **Modern Design**: Updated typography, spacing, and color schemes
- **Consistent Components**: Unified design system across all pages

## Security Enhancements

- **Role-Based Access Control**: Stricter enforcement of permissions
- **Event Data Isolation**: Enhanced multi-tenancy security
- **System Admin Restrictions**: System Admins cannot access event data without explicit roles
- **Audit Logging**: Improved tracking of user actions

## Previous Updates

### User Profile Management
- Avatar upload and management
- Profile settings page
- Event membership management

### Authentication Improvements
- Magic link authentication
- Password reset functionality
- Enhanced session management

### Event Management
- Inline editing of event metadata
- Code of conduct management
- Team member management with search and filtering

---

**For complete release history and detailed changelogs, visit the [GitHub releases page](https://github.com/mattstratton/conducky/releases).**
