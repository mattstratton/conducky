# Conducky New Pages Implementation Checklist

## Phase 1: Authentication & Core User Management (High Priority)
These pages are foundational and needed for most other features to work properly.

### Authentication Pages
- [x] **Issue #164**: Implement User Registration Page (`/register`)
  - User registration form with email verification
  - Password strength validation
  - Terms of service acceptance
  - Links to/from login page

- [x] **Issue #163**: Implement Password Reset Form Page (`/reset-password`)
  - Reset password using token from email
  - Password strength validation
  - Show/hide password toggle
  - Handle invalid/expired tokens

### Profile Management
- [X] **Issue #171**: Implement User Profile Settings Page (`/profile/settings`)
  - Profile information management
  - Notification preferences
  - Privacy and security settings
  - Password change functionality

- [X] **Issue #170**: Implement User Profile Events Management Page (`/profile/events`)
  - View and manage event memberships
  - Join events via invite codes
  - Leave events with confirmation
  - Request role changes

## Phase 2: Global Dashboard Features (Medium Priority)
These provide cross-event functionality for users with multiple event memberships.

### Global Dashboard
- [ ] **Issue #165**: Implement Cross-Event Reports Dashboard (`/dashboard/reports`)
  - View reports across all accessible events
  - Role-based filtering and permissions
  - Search, filter, and pagination
  - Quick actions and export functionality

- [ ] **Issue #167**: Implement Notification Center (`/dashboard/notifications`)
  - Centralized notifications across events
  - Real-time updates
  - Mark as read/unread functionality
  - Notification preferences management

## Phase 3: Event-Specific Features (Medium Priority)
These enhance the event-scoped functionality with better forms and team management.

### Event Report Management
- [ ] **Issue #168**: Implement Event Report Submission Form (`/events/[eventSlug]/reports/new`)
  - Complete incident report submission
  - Multiple file upload support
  - Auto-save draft functionality
  - Event-specific field customization
  - Note that we have a component that can be used here (might need updating) which is `components/ReportForm.tsx`

### Event Team Management
- [ ] **Issue #169**: Implement Event Team Management Page (`/events/[eventSlug]/team/index`)
  - Display and manage team members
  - Role-based access control
  - Search, filter, and manage users
  - Add/remove team members

- [ ] **Issue #174**: Implement Team Member Invitation Page (`/events/[eventSlug]/team/invite`)
  - Send single and bulk invitations
  - Role selection for invited users
  - Invitation tracking and management
  - Custom invitation messages

- [ ] **Issue #175**: Implement Team Member Profile Page (`/events/[eventSlug]/team/[userId]`)
  - View individual team member details
  - Role and permission management
  - Activity timeline and reports
  - Contact and removal functionality

## Phase 4: System Administration (Lower Priority)
These are SuperAdmin-only features for system management.

### System Admin Features
- [ ] **Issue #172**: Implement System Admin Events Management Page (`/admin/events/index`)
  - Display all events in system
  - Create, enable/disable events
  - System-wide statistics
  - Bulk operations on events

- [ ] **Issue #173**: Implement Event Creation Form (`/admin/events/new`)
  - Multi-step event creation wizard
  - Slug generation and validation
  - Logo upload and branding
  - Initial admin assignment

- [ ] **Issue #166**: Enable Application Configuration Settings in Admin UI
  - Email server configuration
  - Google authentication settings
  - GitHub authentication settings
  - System-level configuration management

## Implementation Notes

### Dependencies
- **Phase 1** should be completed first as it provides the foundation for user management
- **Phase 2** requires Phase 1 to be complete for proper user authentication
- **Phase 3** can be worked on in parallel with Phase 2 but after Phase 1
- **Phase 4** is lowest priority and can be done last

### Technical Considerations
- All pages must be mobile-responsive and support dark mode
- Implement proper role-based access control for each page
- Use existing API endpoints where available
- Follow established patterns for forms, validation, and error handling
- Ensure comprehensive testing for each implementation

### Key Priorities
1. **Authentication flow completion** (164, 163) - Critical for user onboarding
2. **Profile management** (171, 170) - Essential for user experience
3. **Cross-event functionality** (165, 167) - Important for multi-event users
4. **Enhanced event features** (168, 169, 174, 175) - Improves event management
5. **System admin features** (172, 173, 166) - Nice to have but not critical