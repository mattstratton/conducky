---
sidebar_position: 8
---
# User Management

This guide covers how event administrators manage users and roles within their events.

## Team Management Overview

The team management system provides comprehensive tools for managing event team members, tracking their activity, and viewing detailed user profiles. Access team management through the **Team** tab in your event navigation.

## Team List Interface

The main team page (`/events/[eventSlug]/team`) provides a powerful interface for managing all team members:

### Search and Filtering
- **Search:** Filter users by name or email using the search box. The list updates as you type.
- **Role Filter:** Filter users by event role (SuperAdmin, Admin, Responder, Reporter) using the role dropdown.
- **Sort Options:** Sort users by name (A-Z, Z-A) or email (A-Z, Z-A) using the sort dropdown.

### Team Member Information
Each team member entry displays:
- **Avatar and Name:** Profile picture (or initials) with full name
- **Email Address:** Contact information
- **Roles:** Color-coded badges showing all assigned roles
- **Join Date:** When the user joined the event
- **Last Activity:** Most recent activity timestamp
- **Actions Menu:** (Admin only) Options to view profile, change roles, or remove user

### Mobile-Responsive Design
The team list adapts to different screen sizes:
- **Desktop:** Full table with all columns visible
- **Tablet:** Hides "Last Active" column for better fit
- **Mobile:** Hides both "Joined" and "Last Active" columns, shows essential info only

## Individual User Profiles

Click on any team member to view their detailed profile page (`/events/[eventSlug]/team/[userId]`):

### Profile Header
- **Avatar:** Large profile picture or initials
- **Basic Info:** Name, email, and join date
- **Role Badges:** All assigned roles with color coding
- **Last Activity:** When the user was last active

### Profile Tabs

#### Overview Tab
- **Role Information:** Detailed view of all assigned roles
- **Statistics:** Total reports, recent activities, and membership duration
- **Quick Stats:** At-a-glance summary of user engagement

#### Activity Tab
- **Timeline View:** Chronological list of user activities
- **Activity Types:** 
  - **Reports:** Report submissions and updates
  - **Comments:** Comment additions to reports
  - **Audit:** System actions and role changes
- **Activity Details:** Each entry shows action, timestamp, and relevant details
- **Icons:** Visual indicators for different activity types

#### Reports Tab
- **User's Reports:** All reports submitted by or assigned to the user
- **Report Cards:** Clickable cards showing title, type, state, and urgency
- **Quick Navigation:** Click any report to view full details
- **Status Indicators:** Color-coded badges for report states

## User Management Interface

Event Admins can manage users for their event using a powerful user list UI with the following features:

- **Search:** Filter users by name or email using the search box above the table. The list updates as you type.
- **Sort:** Sort users by name, email, or role using the sort dropdown. Toggle ascending/descending order with the arrow button.
- **Pagination:** Navigate through users with page controls below the table. Change the number of users per page (10, 20, 50) using the selector.
- **Role Filter:** Filter users by event role (Admin, Responder, Reporter) using the role dropdown. Only users with the selected role will be shown.

All these controls can be combined for advanced filtering and navigation.

## Role Management

### Role Types

- **SuperAdmin**: Global system administrator (can create events, manage all users)
- **Admin**: Event administrator (can manage users and settings for their event)
- **Responder**: Can respond to and manage reports for their event
- **Reporter**: Can submit reports for their event

### Assigning Roles

Event Admins can assign roles to users through:

1. **Team Management Interface**: Use the actions menu on any team member to change their role
2. **Invite Links**: Create role-specific invite links that automatically assign roles when users register
3. **User Management Interface**: Change existing users' roles through the admin interface
4. **API**: Use the user management API endpoints for programmatic role assignment

### Role Management Actions (Admin Only)

From the team list, administrators can:
- **View Profile:** Access detailed user profile and activity
- **Change Role:** Update a user's role using a simple prompt
- **Remove User:** Remove a user from the event entirely

## Activity Tracking

The system automatically tracks user activity across several categories:

### Tracked Activities
- **Report Submissions:** When users create new reports
- **Report Updates:** Changes to report status, assignments, or details
- **Comments:** When users add comments to reports
- **Role Changes:** Administrative changes to user permissions
- **Login Activity:** User authentication events

### Activity Display
- **Timeline Format:** Activities appear in reverse chronological order
- **Rich Details:** Each activity includes context and relevant information
- **Visual Icons:** Different icons for different activity types
- **Timestamps:** Precise timing information for all activities

## Invite Link Management

Event Admins can create and manage invite links to onboard new users:

- **Role-Specific Links**: Create links that automatically assign specific roles
- **Expiration**: Set expiration dates for invite links
- **Usage Limits**: Limit how many times an invite link can be used
- **Tracking**: Monitor invite link usage and disable links as needed

See [Invite Links](./invite-links) for detailed instructions.

## User Avatars

Users can personalize their accounts by uploading avatars (profile pictures). As an admin, you should be aware that:

- **Privacy**: Only users can upload or remove their own avatars
- **File Limits**: Avatar uploads are limited to PNG/JPG files, max 2MB
- **Fallback**: Users without avatars display their initials
- **Display**: Avatars appear in navigation, team lists, user profiles, and report comments

## Permission Levels

### What Different Roles Can See

#### SuperAdmin/Admin
- View all team members and their profiles
- Access complete activity timelines for all users
- See all reports (submitted and assigned)
- Manage roles and remove users

#### Responder
- View team member profiles (limited access)
- See activity related to reports they're involved with
- Access reports they're assigned to or involved with

#### Reporter
- Cannot access team management features
- Can only see their own profile information
- Limited to reports they've submitted

## API Details

The backend provides several endpoints for team management:

### Team List Endpoint
`GET /api/events/slug/:slug/users` supports:
- `search` (string): Filter by name or email
- `sort` (name|email|role): Sort field
- `order` (asc|desc): Sort order
- `page` (integer): Page number
- `limit` (integer): Users per page
- `role` (Admin|Responder|Reporter): Filter by event role

### User Profile Endpoints
- `GET /api/events/slug/:slug/users/:userId` - Get user profile
- `GET /api/events/slug/:slug/users/:userId/activity` - Get user activity timeline
- `GET /api/events/slug/:slug/users/:userId/reports` - Get user's reports

### User Management Endpoints
- `PATCH /api/events/slug/:slug/users/:userId` - Update user role
- `DELETE /api/events/slug/:slug/users/:userId` - Remove user from event

## Best Practices

### Role Assignment
- Assign the minimum necessary role for each user's responsibilities
- Regularly review user roles and remove access for inactive users
- Use invite links with expiration dates for temporary access

### User Onboarding
- Create clear documentation for new users about their roles and responsibilities
- Use role-specific invite links to streamline the onboarding process
- Monitor new user registrations and follow up as needed
- Review new user profiles to ensure proper role assignment

### Team Management
- Regularly check the team list to monitor active members
- Use the activity tracking to identify inactive users
- Review user profiles to understand engagement levels
- Use search and filtering to quickly find specific team members

### Security
- Regularly audit user access and roles using the team management interface
- Remove users who no longer need access to the event
- Monitor the audit log and activity timelines for suspicious user activity
- Use individual user profiles to investigate unusual activity patterns

### Activity Monitoring
- Check user activity timelines to ensure appropriate engagement
- Look for patterns in user behavior that might indicate issues
- Use activity data to identify highly engaged team members
- Monitor report activity to ensure proper workflow

## Troubleshooting

### Common Issues

#### Can't See Team Members
- **Check Permissions:** Ensure you have Admin or Responder role
- **Verify Event Access:** Confirm you're accessing the correct event
- **Check Filters:** Clear any role or search filters that might hide users

#### User Profile Not Loading
- **Check User ID:** Verify the user exists in this event
- **Permission Error:** Ensure you have permission to view this user's profile
- **Network Issues:** Check your internet connection

#### Activity Timeline Empty
- **New User:** Recently added users may not have activity yet
- **Permission Limits:** You may only see activities you're authorized to view
- **Data Sync:** Activity tracking may have a slight delay

See [API Endpoints](../developer-docs/api-endpoints.md) for complete technical details on user management endpoints. 