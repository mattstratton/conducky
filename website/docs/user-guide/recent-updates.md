---
sidebar_position: 2
---

# Recent Updates

## December 2024

### 💬 Enhanced Comment System (New Features)

The comment system has been significantly upgraded with advanced collaboration features:

**Markdown Support:**

- **Rich Text Formatting**: Bold, italic, headers, lists, links, and code blocks
- **GitHub-style Markdown**: Familiar syntax with toolbar assistance
- **Universal Rendering**: All comments render as markdown (like GitHub Issues)
- **Preview Mode**: Toggle between edit and preview while writing

**Advanced Search & Navigation:**

- **Real-time Search**: Find comments instantly with debounced search
- **Smart Pagination**: Navigate large comment threads efficiently (10-100 per page)
- **Direct Linking**: Permalink to specific comments with #comment-123 anchors
- **Cross-page Navigation**: Search results span multiple comment pages

**Enhanced User Experience:**

- **Quote Reply**: Click any comment to quote it in your response
- **Inline Editing**: Edit comments in place with markdown toolbar
- **Role-based Filtering**: Filter by public/internal visibility
- **Mobile Optimized**: Full functionality on mobile devices for field response

**Security & Performance:**

- **XSS Prevention**: Secure handling of user-generated content
- **Efficient Pagination**: Database-optimized queries with proper indexing
- **Role Enforcement**: Strict visibility controls for internal comments

The enhanced comment system significantly improves incident response coordination while maintaining security and performance standards.

### 🔔 Notification Center (New Feature)

A comprehensive notification system has been added to keep you informed about important incident-related activities:

**Key Features:**

- **Centralized Hub**: All notifications accessible from Dashboard > Notifications
- **Automatic Creation**: Notifications are automatically generated for report events
- **Advanced Filtering**: Filter by type, priority, and read status
- **Real-Time Updates**: Stay current with the latest incident activities
- **Mobile Responsive**: Optimized for both desktop and mobile use

**Notification Types:**

- Report submitted (notifies responders and admins)
- Report assigned (notifies assigned responder)
- Report status changed (notifies reporter and assigned responder)
- New comments added (notifies relevant parties)
- Event invitations and role changes

**Benefits:**

- Never miss important incident updates
- Faster response times to critical reports
- Better coordination between team members
- Clear audit trail of incident activities

See the [Notification Center Guide](./notification-center.md) for complete documentation.

### 📋 Cross-Event Reports Dashboard

Enhanced multi-event report management with advanced filtering and quick actions:

**New Features:**

- View reports across all events where you have access
- Role-based filtering (reporters see only their reports, responders see all)
- Quick assignment actions ("Assign to Me" button)
- Status change quick actions
- Advanced search and filtering capabilities

See the [Cross-Event Reports Guide](./cross-event-reports.md) for details.

### 🎨 UI/UX Improvements

- **Dark Mode**: Full dark mode support across all pages
- **Mobile Optimization**: Improved mobile experience with touch-friendly interfaces
- **Responsive Tables**: Tables automatically convert to cards on mobile devices
- **Modern Design**: Updated typography, spacing, and color schemes
- **Consistent Components**: Unified design system across all pages

### 🔐 Security Enhancements

- **Role-Based Access Control**: Stricter enforcement of permissions
- **Event Data Isolation**: Enhanced multi-tenancy security
- **SuperAdmin Restrictions**: SuperAdmins cannot access event data without explicit roles
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

For older updates and detailed changelogs, see the [GitHub releases](https://github.com/mattstratton/conducky/releases).
