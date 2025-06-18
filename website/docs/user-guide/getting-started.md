---
sidebar_position: 2
---
# Getting Started

Welcome to the Conducky User Guide!

## Account Creation and Authentication

### Creating an Account

New users can create an account in several ways:

1. **Direct Registration**: Visit `/register` to create a new account
   - Enter your email address, full name, and password
   - Password must meet security requirements (8+ characters, mix of letters, numbers, symbols)
   - The first user to register becomes a SuperAdmin automatically
   - Subsequent users need to be invited to events to access functionality

2. **Invitation Links**: Most users join through event invitations
   - Click the invitation link sent by an event administrator
   - Create an account or log in if you already have one
   - Accept the invitation to join the event with the specified role

### Password Management

- **Forgot Password**: Use the "Forgot Password" link on the login page
- **Reset Password**: Check your email for a reset link that takes you to `/reset-password`
- **Change Password**: Update your password anytime from your profile settings

## First Steps

After logging into Conducky, you'll be directed to your appropriate starting point:

- **First-time users**: Global dashboard with information about joining events
- **Single event users**: Global dashboard showing that event
- **Multi-event users**: Global dashboard showing all your events
- **SuperAdmins**: Global dashboard with access to system admin features

## Home Page for Visitors

Before logging in, the Conducky home page provides different content based on system configuration:

- **Public Event Listing Enabled**: Shows a list of all active events with links to public event pages
- **Public Event Listing Disabled**: Shows login and registration options only

The public event listing can be controlled by SuperAdmins through the System Settings.

## Understanding Navigation

Conducky uses a three-level navigation system:

1. **Global Dashboard** (`/dashboard`) - Your multi-event overview
2. **Event Context** (`/events/[eventSlug]/`) - Event-specific functionality
3. **System Admin** (`/admin/`) - Installation management (SuperAdmins only)

See the [Navigation Guide](./navigation.md) for detailed information about how navigation works.

## Profile Management

### Profile Settings (`/profile/settings`)

Manage your personal account information:

- **Profile Information**: Update your name, email, and avatar
- **Password**: Change your account password
- **Notification Preferences**: Control how you receive notifications (when implemented)
- **Privacy Settings**: Manage your privacy preferences

### Event Management (`/profile/events`)

View and manage your event memberships:

- **Current Events**: See all events you belong to and your role in each
- **Join Events**: Use invite codes to join new events
- **Leave Events**: Remove yourself from events (with confirmation)
- **Role Information**: Understand your permissions in each event

## Your First Event

### Joining an Event

Most users join events through invitation links sent by event administrators. When you receive an invitation:

1. Click the invitation link
2. Log in or create an account if needed
3. Accept the invitation to join the event with the specified role
4. You'll be redirected to the event dashboard

Alternatively, if you have an invite code, you can join events through your profile:

1. Go to `/profile/events`
2. Enter the invite code in the "Join Event" section
3. Confirm your participation

### Understanding Your Role

Your role in each event determines what you can see and do:

- **Reporter**: Submit reports, view your own reports, see event information
- **Responder**: Handle reports, view all reports, manage report states
- **Admin**: Full event management, team management, event settings

## Cross-Event Features

### Global Reports Dashboard (`/dashboard/reports`)

If you belong to multiple events, you can view reports across all your events:

- **Role-Based Access**: See reports based on your role in each event
- **Advanced Filtering**: Filter by event, status, assignment, and search terms
- **Unified View**: Manage reports from multiple events in one place
- **Quick Actions**: Perform common actions without switching event contexts

### Notification Center (`/dashboard/notifications`)

Stay informed about important activities across all your events:

- **Automatic Notifications**: Receive notifications for report submissions, assignments, status changes, and comments
- **Priority Levels**: Notifications are categorized by urgency (urgent, high, normal, low)
- **Advanced Filtering**: Filter by type, priority, and read status
- **Direct Actions**: Click notifications to navigate directly to related reports
- **Mobile Optimized**: Fully responsive design for mobile and desktop use

See the [Notification Center Guide](./notification-center.md) for complete details.

## Environment Variables

Before running Conducky, you must set the required environment variables for both backend and frontend. See the [Developer Docs Introduction](../developer-docs/intro.md#environment-variables-standardized) for the full list and details.

## Installing Conducky

TODO

## Configuring Conducky

TODO
