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
5. What happens next depends on whether your Conducky instance has email set up:
   - **Email is set up**: You'll be asked to check your email. Click the verification link to confirm your address, then sign in. See [Verifying your email address](#verifying-your-email-address).
   - **Email is not set up**: Your account is created without verification and you can sign in right away.

#### Password Requirements
Your password must meet the following security requirements:
- **Minimum 8 characters**
- **At least one uppercase letter** (A-Z)
- **At least one lowercase letter** (a-z)
- **At least one number** (0-9)
- **At least one special character** (!@#$%^&*()_+-=[]{}|;:,.&lt;&gt;?)

#### Special Registration Rules
- **First User**: The first person to register becomes a System Admin automatically
- **Subsequent Users**: Need to be invited to events to access functionality
- **Email Uniqueness**: Each email address can only be used for one account
- **First Account**: The first account on an instance is verified automatically, so setting up a new instance never locks you out

### Verifying your email address

When the instance has email configured, new email/password accounts (including accounts created through an invitation link) must verify their email address before they can sign in.

#### Verification Steps
1. After you register, Conducky emails a verification link to the address you used
2. Click the link. It opens a page confirming your email is verified
3. Sign in with your email and password

This is for new accounts: the link verifies your address as soon as it opens. A link for changing the email address on an existing account works differently and asks you to select **Confirm email change** first. See [Changing Your Email Address](./getting-started/profile-management.md#changing-your-email-address).

#### If the email doesn't arrive
- Check your spam folder
- Try to sign in with your email and password. The sign-in page shows "check your email" with a **Resend** button
- Typed the wrong address? Use **Wrong address?** on that screen to fix the typo (you'll need your password) and the verification email is sent to the corrected address

#### Verification link details
- **Expires after 24 hours**: Request a new one with **Resend**
- **Single-use**: Each link works once
- **Address-bound**: A link only works for the address it was sent to
- **Unverified accounts are deleted after 7 days**: If you never verify, the account is removed and you can register again. The 7 days count from the last verification email that was sent successfully; an account whose verification email never went out is not deleted
- **Reusing a pending address**: If someone started a signup with an address that is still waiting for verification, a new signup with the same address replaces the pending one only if its last verification email (or, if none was ever sent, the signup itself) is more than an hour old. Otherwise you'll see "Email already registered."

#### Signing in with Google or GitHub
Accounts created with Google or GitHub are verified from the start, but only when the provider reports your email address as verified. If it doesn't, sign-in is rejected. If the provider's email matches an existing account that wasn't verified yet, signing in with the provider links to that account and marks it verified. If that account was a new signup still waiting for verification, its password is removed; use **Forgot Password** if you want to set one.

#### Accounts created before verification existed
You are never locked out. If you have an email/password account that isn't verified and the instance has email set up, you'll see a banner with a **Send verification email** button. You can keep using Conducky without verifying. You can request at most one email per minute. Accounts that are verified, or that only use Google or GitHub, never see the banner.

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
   - **System Admins**: System admin dashboard

#### Login Features
- **Remember Me**: Your session persists across browser sessions
- **Auto-redirect**: After login, you're sent to the most appropriate page
- **Error Handling**: Clear messages for invalid credentials or account issues
- **Unverified email**: If your new account hasn't verified its email yet, sign-in shows "check your email" instead of signing you in

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