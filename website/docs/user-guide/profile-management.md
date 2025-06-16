---
sidebar_position: 4
---

# Profile Management

This guide covers all aspects of managing your personal profile and account settings in Conducky.

## Profile Settings (`/profile/settings`)

Your profile settings page allows you to manage your personal account information and preferences.

### Personal Information

#### Basic Profile Details
- **Full Name**: Your display name shown throughout the application
- **Email Address**: Your login email and contact information
- **Avatar**: Your profile picture (optional)

#### Updating Your Information
1. Navigate to `/profile/settings`
2. Click the edit button next to any field you want to change
3. Make your changes and save
4. Changes are applied immediately

### Avatar Management

#### Uploading an Avatar
1. Go to your profile settings
2. Click "Upload Avatar" or the camera icon
3. Select a PNG or JPG image (maximum 2MB)
4. Your avatar will appear throughout the application

#### Avatar Display Locations
Your avatar appears in several places:
- Navigation bar (top right)
- Event team member lists
- Report comments and activity
- Profile pages

#### Removing Your Avatar
1. Go to your profile settings
2. Click "Remove Avatar" if you have one uploaded
3. The system will fall back to showing your initials

### Password Management

#### Changing Your Password
1. Navigate to `/profile/settings`
2. Find the "Change Password" section
3. Enter your current password
4. Enter your new password (must meet security requirements)
5. Confirm your new password
6. Save changes

#### Password Requirements
- Minimum 8 characters
- Mix of uppercase and lowercase letters
- At least one number
- At least one special character

### Notification Preferences

*Note: Notification features are planned for future implementation*

- Email notifications for report updates
- In-app notification preferences
- Event-specific notification settings

## Event Management (`/profile/events`)

The event management page shows all events you belong to and allows you to manage your event memberships.

### Viewing Your Events

#### Event List
Your events are displayed with the following information:
- **Event Name**: The full name of the event
- **Your Role**: Your permission level in that event
- **Event Status**: Whether the event is active or disabled
- **Quick Actions**: Links to common tasks for that event

#### Role Information
Each event shows your current role:
- **Reporter**: Can submit reports and view your own reports
- **Responder**: Can handle reports and view all reports in the event
- **Admin**: Full event management capabilities

### Joining New Events

#### Using Invite Codes
1. Navigate to `/profile/events`
2. Find the "Join Event" section
3. Enter the invite code provided by an event administrator
4. Click "Join Event"
5. You'll be added to the event with the role specified in the invitation

#### Invite Code Format
- Invite codes are alphanumeric strings
- Minimum 3 characters
- Case-sensitive
- Each code is unique to a specific event and role

#### Validation
The system validates invite codes before joining:
- Checks if the code exists and is active
- Verifies you're not already a member of the event
- Confirms the code hasn't expired (if applicable)

### Leaving Events

#### How to Leave an Event
1. Go to `/profile/events`
2. Find the event you want to leave
3. Click "Leave Event"
4. Confirm your decision in the dialog
5. You'll be removed from the event immediately

#### Important Notes
- Leaving an event removes all your access to that event's data
- You cannot view reports or participate in the event after leaving
- Event administrators can re-invite you if needed
- SuperAdmins cannot leave events through this interface

### Event Quick Actions

Each event in your list provides quick action buttons:

#### For Reporters
- **View Event**: Go to the event dashboard
- **Submit Report**: Quick link to report submission
- **My Reports**: View your reports in this event

#### For Responders
- **View Event**: Go to the event dashboard
- **All Reports**: View all reports you can access
- **Submit Report**: Submit a new report

#### For Admins
- **Manage Event**: Go to event administration
- **Team Management**: Manage event team members
- **Event Settings**: Configure event details

## Account Security

### Session Management
- Your login session persists across browser sessions
- Sessions automatically expire after extended inactivity
- You can log out manually from any page

### Data Privacy
- Your profile information is only visible to:
  - Event team members in events you belong to
  - System administrators (for account management)
- Your reports and comments are scoped to specific events
- Avatar images are stored securely and only displayed in appropriate contexts

### Account Deletion
*Note: Account deletion features are planned for future implementation*

Currently, account removal must be handled by system administrators. Contact your system administrator if you need to delete your account.

## Troubleshooting

### Common Issues

#### Can't Upload Avatar
- **File too large**: Maximum size is 2MB
- **Wrong format**: Only PNG and JPG files are supported
- **Browser issues**: Try refreshing the page and uploading again

#### Invite Code Not Working
- **Invalid code**: Double-check the code for typos
- **Already a member**: You might already belong to this event
- **Expired code**: Contact the event administrator for a new code

#### Can't Change Password
- **Current password incorrect**: Verify you're entering your current password correctly
- **New password requirements**: Ensure your new password meets all security requirements
- **Browser issues**: Try clearing your browser cache

#### Profile Changes Not Saving
- **Network issues**: Check your internet connection
- **Session expired**: Try logging out and back in
- **Browser cache**: Clear your browser cache and try again

### Getting Help

If you encounter issues not covered here:
1. Check the [Troubleshooting Guide](./troubleshooting.md)
2. Contact your event administrators
3. For system-wide issues, contact your system administrator

## Best Practices

### Profile Maintenance
- Keep your profile information up to date
- Use a professional avatar if participating in work-related events
- Regularly review your event memberships
- Update your password periodically

### Event Participation
- Understand your role in each event before participating
- Use descriptive names and professional email addresses
- Be cautious when leaving events - you'll lose access to all event data
- Keep invite codes secure and don't share them with unauthorized users 