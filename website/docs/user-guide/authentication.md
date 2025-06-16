---
sidebar_position: 3
---

# Authentication Guide

This guide covers all aspects of user authentication in Conducky, including account creation, login, password management, and security features.

## Account Creation

### User Registration (`/register`)

New users can create accounts directly through the registration page:

#### Registration Process
1. Navigate to `/register` or click "Create Account" from the login page
2. Fill out the registration form:
   - **Email Address**: Must be unique and valid
   - **Full Name**: Your display name in the application
   - **Password**: Must meet security requirements
   - **Confirm Password**: Must match your password
3. Accept the terms of service (if required)
4. Click "Create Account"
5. You'll be logged in automatically after successful registration

#### Password Requirements
Your password must meet the following security requirements:
- **Minimum 8 characters**
- **At least one uppercase letter** (A-Z)
- **At least one lowercase letter** (a-z)
- **At least one number** (0-9)
- **At least one special character** (!@#$%^&*()_+-=[]{}|;:,.&lt;&gt;?)

#### Special Registration Rules
- **First User**: The first person to register becomes a SuperAdmin automatically
- **Subsequent Users**: Need to be invited to events to access functionality
- **Email Uniqueness**: Each email address can only be used for one account

### Invitation-Based Registration

Most users join Conducky through event invitations:

#### Invitation Process
1. Receive an invitation link via email from an event administrator
2. Click the invitation link
3. If you don't have an account:
   - You'll be directed to create one
   - Fill out the registration form
   - Your account will be created and you'll automatically join the event
4. If you already have an account:
   - Log in with your existing credentials
   - Accept the invitation to join the event

#### Invitation Benefits
- **Automatic Event Access**: You're immediately added to the event with the specified role
- **Role Assignment**: Your role (Reporter, Responder, Admin) is pre-configured
- **Streamlined Onboarding**: No need to request access separately

## Login Process

### Standard Login (`/login`)

#### Login Steps
1. Navigate to `/login` or click "Sign In"
2. Enter your email address and password
3. Click "Sign In"
4. You'll be redirected based on your account type:
   - **First-time users**: Global dashboard
   - **Single event users**: That event's dashboard
   - **Multi-event users**: Global dashboard with all events
   - **SuperAdmins**: System admin dashboard

#### Login Features
- **Remember Me**: Your session persists across browser sessions
- **Auto-redirect**: After login, you're sent to the most appropriate page
- **Error Handling**: Clear messages for invalid credentials or account issues

### Session Management

#### Session Persistence
- Sessions remain active across browser restarts
- Sessions automatically expire after extended inactivity
- You can manually log out from any page

#### Security Features
- **Secure Cookies**: Session data is stored securely
- **HTTPS Required**: All authentication happens over secure connections (in production)
- **Session Validation**: Each request validates your current session

## Password Management

### Forgot Password Process

If you forget your password:

#### Reset Request
1. Go to the login page (`/login`)
2. Click "Forgot Password?"
3. Enter your email address
4. Click "Send Reset Link"
5. Check your email for a password reset link

#### Password Reset (`/reset-password`)
1. Click the reset link in your email
2. You'll be taken to the password reset page
3. Enter your new password (must meet security requirements)
4. Confirm your new password
5. Click "Reset Password"
6. You'll be automatically logged in with your new password

#### Reset Link Security
- **Time-limited**: Reset links expire after a set time period
- **Single-use**: Each link can only be used once
- **Secure tokens**: Links use cryptographically secure tokens

### Changing Your Password

To change your password while logged in:

#### Through Profile Settings
1. Navigate to `/profile/settings`
2. Find the "Change Password" section
3. Enter your current password
4. Enter your new password (must meet requirements)
5. Confirm your new password
6. Click "Update Password"
7. Your password is changed immediately

#### Security Considerations
- **Current Password Required**: You must know your current password
- **Immediate Effect**: Password changes take effect immediately
- **Session Maintenance**: You remain logged in after changing your password

## Account Security

### Password Security Best Practices

#### Strong Passwords
- Use a unique password for Conducky
- Consider using a password manager
- Don't share your password with others
- Change your password if you suspect it's been compromised

#### Security Requirements
- **Complexity**: Passwords must meet minimum complexity requirements
- **Uniqueness**: Each account must have a unique email address
- **Validation**: All password changes are validated for security

### Session Security

#### Automatic Protections
- **Session Timeout**: Inactive sessions expire automatically
- **Secure Storage**: Session data is stored securely
- **HTTPS Enforcement**: All authentication uses secure connections

#### Manual Security Actions
- **Log Out**: Always log out when using shared computers
- **Monitor Sessions**: Be aware of where you're logged in
- **Report Issues**: Contact administrators if you notice suspicious activity

## Troubleshooting Authentication

### Common Login Issues

#### "Invalid email or password"
- **Double-check credentials**: Verify your email and password are correct
- **Case sensitivity**: Passwords are case-sensitive
- **Account existence**: Ensure you have an account with that email
- **Use password reset**: If unsure, use the "Forgot Password" feature

#### "Account not found"
- **Check email spelling**: Verify your email address is correct
- **Multiple accounts**: You might have accounts with different email addresses
- **Registration needed**: You may need to create an account first

#### "Session expired"
- **Re-login required**: Your session has timed out, log in again
- **Browser issues**: Try clearing your browser cache
- **Network problems**: Check your internet connection

### Registration Issues

#### "Email already in use"
- **Existing account**: You already have an account with this email
- **Use login**: Try logging in instead of registering
- **Password reset**: If you forgot your password, use the reset feature

#### "Password doesn't meet requirements"
- **Check requirements**: Ensure your password meets all security criteria
- **Character types**: Include uppercase, lowercase, numbers, and symbols
- **Length**: Use at least 8 characters

#### "Registration failed"
- **Network issues**: Check your internet connection
- **Server problems**: Try again in a few minutes
- **Browser cache**: Clear your browser cache and try again

### Password Reset Issues

#### "Reset link not working"
- **Link expiration**: Reset links expire after a set time
- **Single use**: Each link can only be used once
- **Request new link**: Go through the reset process again

#### "Didn't receive reset email"
- **Check spam folder**: Reset emails might be in spam/junk
- **Email address**: Verify you entered the correct email
- **Wait time**: Allow a few minutes for email delivery
- **Contact support**: If persistent, contact your system administrator

### Browser and Technical Issues

#### "Page won't load"
- **Internet connection**: Check your network connection
- **Browser compatibility**: Use a modern, supported browser
- **JavaScript enabled**: Ensure JavaScript is enabled
- **Clear cache**: Clear your browser cache and cookies

#### "Form not submitting"
- **Required fields**: Ensure all required fields are filled
- **JavaScript errors**: Check browser console for errors
- **Network timeout**: Try again if the request timed out
- **Browser refresh**: Refresh the page and try again

## Getting Help

### Self-Service Options
1. **Password Reset**: Use the automated password reset feature
2. **Documentation**: Check this guide and other documentation
3. **Browser Troubleshooting**: Clear cache, try different browser

### Contact Support
If you can't resolve authentication issues:

#### For Account Issues
- **Event Administrators**: Contact admins for event-related access issues
- **System Administrators**: Contact for system-wide authentication problems

#### Information to Provide
When contacting support, include:
- Your email address (don't include your password)
- Description of the problem
- Steps you've already tried
- Browser and device information
- Any error messages you received

## Security Best Practices

### For Users
- **Use strong, unique passwords**
- **Log out when using shared computers**
- **Keep your email account secure**
- **Report suspicious activity immediately**
- **Don't share your login credentials**

### For Administrators
- **Monitor user registration patterns**
- **Regularly review user access**
- **Implement strong password policies**
- **Monitor authentication logs**
- **Provide security training to users**

## Future Authentication Features

### Planned Enhancements
- **Two-Factor Authentication (2FA)**: Additional security layer
- **Social Login**: Google, GitHub, and other OAuth providers
- **Magic Links**: Passwordless login via email
- **Single Sign-On (SSO)**: Enterprise authentication integration

### Email Verification
*Note: Email verification for new registrations is planned for future implementation*

Currently, new user registrations don't require email verification. This feature will be added when the email system is implemented.

The authentication system in Conducky is designed to be secure, user-friendly, and scalable. Follow the best practices outlined in this guide to ensure your account remains secure and accessible. 