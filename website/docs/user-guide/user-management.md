---
sidebar_position: 8
---
# User Management

This guide covers how event administrators manage users and roles within their events.

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

1. **Invite Links**: Create role-specific invite links that automatically assign roles when users register
2. **User Management Interface**: Change existing users' roles through the admin interface
3. **API**: Use the user management API endpoints for programmatic role assignment

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
- **Display**: Avatars appear in navigation, team lists, and report comments

## API Details

The backend endpoint `/events/slug/:slug/users` supports the following query parameters for user management:

- `search` (string): Filter by name or email
- `sort` (name|email|role): Sort field
- `order` (asc|desc): Sort order
- `page` (integer): Page number
- `limit` (integer): Users per page
- `role` (Admin|Responder|Reporter): Filter by event role

## Best Practices

### Role Assignment
- Assign the minimum necessary role for each user's responsibilities
- Regularly review user roles and remove access for inactive users
- Use invite links with expiration dates for temporary access

### User Onboarding
- Create clear documentation for new users about their roles and responsibilities
- Use role-specific invite links to streamline the onboarding process
- Monitor new user registrations and follow up as needed

### Security
- Regularly audit user access and roles
- Remove users who no longer need access to the event
- Monitor the audit log for suspicious user activity

See [API Endpoints](../developer-docs/api-endpoints.md) for complete technical details on user management endpoints. 