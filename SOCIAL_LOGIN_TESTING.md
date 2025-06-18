# Social Login Testing Guide

## Overview
This guide covers testing the Google and GitHub OAuth social login integration added to Conducky.

## Prerequisites for Testing

### 1. Environment Setup
Create OAuth applications for both Google and GitHub:

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - Local: `http://localhost:4000/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`
7. Copy Client ID and Client Secret

#### GitHub OAuth Setup
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in application details:
   - Application name: "Conducky Local" (or your app name)
   - Homepage URL: `http://localhost:3001` (or your frontend URL)
   - Authorization callback URL: `http://localhost:4000/api/auth/github/callback`
4. Copy Client ID and Client Secret

### 2. Environment Variables
Add to your backend `.env` file:
```bash
# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Frontend URL for OAuth redirects
FRONTEND_BASE_URL=http://localhost:3001
```

## Testing Scenarios

### 1. New User Registration via Social Login

#### Test Case: Google OAuth - New User
1. Navigate to `/login`
2. Click "Google" button
3. Complete Google OAuth flow with a Google account NOT already in the system
4. Verify:
   - User is redirected to `/dashboard` after successful auth
   - New user account is created in database
   - User's name and email are populated from Google profile
   - No password hash is set (passwordHash should be null)
   - SocialAccount record is created with Google provider data

#### Test Case: GitHub OAuth - New User
1. Navigate to `/login`
2. Click "GitHub" button
3. Complete GitHub OAuth flow with a GitHub account NOT already in the system
4. Verify:
   - User is redirected to `/dashboard` after successful auth
   - New user account is created in database
   - User's name and email are populated from GitHub profile
   - No password hash is set (passwordHash should be null)
   - SocialAccount record is created with GitHub provider data

### 2. Existing User Login via Social Login

#### Test Case: Existing User with Same Email
1. Create a user account with email `test@example.com` (via regular registration)
2. Navigate to `/login`
3. Click "Google" button and authenticate with Google account using `test@example.com`
4. Verify:
   - User is logged in to existing account
   - SocialAccount record is created linking Google account to existing user
   - User retains their existing data and event roles

#### Test Case: User with Multiple Social Accounts
1. Complete Test Case above (user has Google linked)
2. Log out
3. Navigate to `/login`
4. Click "GitHub" button and authenticate with GitHub account using same email
5. Verify:
   - User is logged in to same account
   - Second SocialAccount record is created for GitHub
   - User now has both Google and GitHub accounts linked

### 3. Error Handling

#### Test Case: OAuth Failure
1. Configure invalid OAuth credentials (wrong client secret)
2. Navigate to `/login`
3. Click "Google" or "GitHub" button
4. Verify:
   - User is redirected to `/login?error=oauth_failed`
   - Error message is displayed: "Social login failed. Please try again or use email/password."

#### Test Case: No Email from Provider
1. Use OAuth provider that doesn't return email (this is rare, but test if possible)
2. Verify appropriate error handling

#### Test Case: Missing OAuth Configuration
1. Remove OAuth environment variables
2. Navigate to `/login`
3. Verify:
   - Social login buttons still appear (they check for env vars on backend)
   - Clicking them should result in error or graceful failure

### 4. Mixed Authentication Methods

#### Test Case: Social User Tries Password Login
1. Create account via Google OAuth (no password set)
2. Log out
3. Try to log in with email/password on `/login`
4. Verify:
   - Login fails with message "Please sign in with your social account."

#### Test Case: Regular User Adds Social Account
1. Create account via regular email/password registration
2. Log in with email/password
3. Later log in via Google OAuth with same email
4. Verify:
   - User is logged into same account
   - Social account is linked to existing account
   - User can now log in via either method

### 5. Navigation and Redirects

#### Test Case: OAuth with Next URL
1. Navigate to a protected page (e.g., `/events/some-event/dashboard`)
2. Get redirected to login with `?next=` parameter
3. Complete OAuth login
4. Verify:
   - User is redirected to original intended page (if accessible)
   - Or appropriate fallback if not accessible

#### Test Case: Invite Flow with OAuth
1. Get an event invite link
2. Visit invite link while logged out
3. Use OAuth to log in during invite acceptance
4. Verify:
   - OAuth login completes
   - User is redirected to event dashboard
   - User has appropriate role in the event

## Database Verification

After each test, verify the database state:

### Users Table
```sql
SELECT id, email, name, "passwordHash" FROM "User" WHERE email = 'test@example.com';
```
- `passwordHash` should be null for OAuth-only users

### SocialAccounts Table
```sql
SELECT * FROM "SocialAccount" WHERE "userId" = 'user-id';
```
- Should have records for each linked social account
- `provider` should be 'google' or 'github'
- `providerId` should be the OAuth provider's user ID
- `providerEmail` should match the email from OAuth

## API Testing

### Manual API Testing
You can test OAuth endpoints directly:

1. **Initiate OAuth Flow:**
   ```
   GET http://localhost:4000/api/auth/google
   GET http://localhost:4000/api/auth/github
   ```

2. **Check Session After OAuth:**
   ```
   GET http://localhost:4000/api/session
   ```

### Integration Test Ideas
Consider adding these integration tests:

1. Test OAuth callback handling with mock OAuth responses
2. Test database state after OAuth login
3. Test account linking scenarios
4. Test error scenarios (invalid provider responses)

## Browser Testing

### Cross-Browser Testing
Test social login in:
- Chrome (desktop & mobile)
- Firefox
- Safari (desktop & mobile)
- Edge

### Mobile Testing
1. Test OAuth flow on mobile devices
2. Verify redirect handling works properly
3. Test switching between apps (browser → OAuth app → browser)

## Security Testing

### Test Cases to Verify
1. **State Parameter:** OAuth requests include and validate state parameter
2. **CSRF Protection:** OAuth callbacks are protected against CSRF
3. **Account Takeover:** Ensure email verification prevents account takeover
4. **Session Security:** OAuth sessions are properly secured

## Troubleshooting Common Issues

### OAuth Redirect Mismatch
**Error:** `redirect_uri_mismatch`
**Solution:** Ensure callback URLs in OAuth provider match exactly

### Missing Email Permission
**Error:** No email returned from provider
**Solution:** Verify OAuth scopes include email access

### CORS Issues
**Error:** CORS errors during OAuth flow
**Solution:** Check CORS configuration allows OAuth domain

### Session Not Persisting
**Error:** User not staying logged in after OAuth
**Solution:** Check session configuration and cookie settings

## Production Considerations

### Before Deploying to Production
1. Update OAuth callback URLs to production domains
2. Ensure HTTPS is used for all OAuth endpoints
3. Test with production OAuth apps (not dev apps)
4. Verify environment variables are properly set
5. Test with real Google/GitHub accounts

### Monitoring
Monitor these metrics in production:
- OAuth conversion rates (started vs completed)
- OAuth error rates
- Failed login attempts
- Account linking success rates

This testing plan should comprehensively cover the social login functionality. Remember to test both happy path and error scenarios! 