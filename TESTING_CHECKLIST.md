# Social Login Testing Checklist

## Setup Phase

### 1. OAuth Apps Configuration
Follow the [Social Login Configuration guide](website/docs/admin-guide/system-management.md#social-login-configuration):

- [ ] **Google OAuth App**:
  - [ ] Created Google Cloud project
  - [ ] Enabled Google Identity Services API (or Google+ API if available)
  - [ ] Configured OAuth consent screen
  - [ ] Created OAuth 2.0 credentials
  - [ ] Added redirect URI: `http://localhost:4000/api/auth/google/callback`
  - [ ] Copied Client ID and Client Secret

- [ ] **GitHub OAuth App**:
  - [ ] Created GitHub OAuth App
  - [ ] Set homepage URL: `http://localhost:3001`
  - [ ] Set callback URL: `http://localhost:4000/api/auth/github/callback`
  - [ ] Copied Client ID and Client Secret

### 2. Environment Configuration
- [ ] **Backend .env file updated** with:
  ```bash
  GOOGLE_CLIENT_ID=your_actual_google_client_id
  GOOGLE_CLIENT_SECRET=your_actual_google_client_secret
  GITHUB_CLIENT_ID=your_actual_github_client_id
  GITHUB_CLIENT_SECRET=your_actual_github_client_secret
  FRONTEND_BASE_URL=http://localhost:3001
  ```

- [ ] **Backend restarted** to load new environment variables:
  ```bash
  docker-compose restart backend
  ```

### 3. Environment Verification
- [ ] **Check environment variables are loaded**:
  ```bash
  docker-compose exec backend env | grep GOOGLE
  docker-compose exec backend env | grep GITHUB
  ```

## Testing Phase

### Test 1: UI Elements
- [ ] Navigate to `http://localhost:3001/login`
- [ ] **Verify social login buttons appear**:
  - [ ] Google button with Google logo
  - [ ] GitHub button with GitHub logo
  - [ ] Both buttons have proper styling and hover effects

### Test 2: Google OAuth - New User
- [ ] Click **"Google"** button
- [ ] **OAuth flow works**:
  - [ ] Redirects to Google login
  - [ ] Can complete Google authentication
  - [ ] Redirects back to Conducky
- [ ] **Results**:
  - [ ] Lands on `/dashboard` page
  - [ ] User is logged in (check top-right user menu)
  - [ ] Name and email from Google profile are shown

### Test 3: GitHub OAuth - New User  
- [ ] **Log out first** (if logged in from previous test)
- [ ] Click **"GitHub"** button
- [ ] **OAuth flow works**:
  - [ ] Redirects to GitHub login
  - [ ] Can complete GitHub authentication
  - [ ] Redirects back to Conducky
- [ ] **Results**:
  - [ ] Lands on `/dashboard` page
  - [ ] User is logged in (check top-right user menu)
  - [ ] Name and email from GitHub profile are shown

### Test 4: Account Linking (Existing User)
- [ ] **Create regular account first**:
  - [ ] Go to `/register`
  - [ ] Register with email/password using email: `test@yourdomain.com`
  - [ ] Complete registration and log out
- [ ] **Test account linking**:
  - [ ] Go to `/login`
  - [ ] Click Google/GitHub button
  - [ ] Use OAuth account with **same email** (`test@yourdomain.com`)
- [ ] **Results**:
  - [ ] Successfully logs in to existing account
  - [ ] Retains any existing data (events, roles, etc.)

### Test 5: Error Handling
- [ ] **Test OAuth failure**:
  - [ ] Temporarily set invalid `GOOGLE_CLIENT_SECRET` in .env
  - [ ] Restart backend: `docker-compose restart backend`
  - [ ] Try Google OAuth
- [ ] **Expected result**:
  - [ ] Redirects to `/login?error=oauth_failed`
  - [ ] Shows error message: "Social login failed. Please try again or use email/password."
- [ ] **Restore correct credentials** and restart backend

## Security Verification

### Test 6: Security Checks
- [ ] **No Token Storage**: Verify OAuth tokens are NOT stored in database:
  ```sql
  -- Should NOT have accessToken or refreshToken columns
  \d "SocialAccount"
  ```
- [ ] **Session Security**: Check OAuth redirect preserves intended destination
  - [ ] Go to `/login?next=/dashboard`  
  - [ ] Complete OAuth login
  - [ ] Should land on `/dashboard` (not hardcoded redirect)
- [ ] **Account Security**: Social accounts are properly linked by email
- [ ] **Minimal Permissions**: Only basic profile and email are requested during OAuth

## Database Verification

### Check User Records
Connect to your database and verify:

```sql
-- Check user was created properly
SELECT id, email, name, "passwordHash" FROM "User" WHERE email = 'your-test-email@domain.com';

-- Check social account linking
SELECT sa.*, u.email FROM "SocialAccount" sa 
JOIN "User" u ON sa."userId" = u.id 
WHERE u.email = 'your-test-email@domain.com';
```

**Expected results**:
- [ ] User record exists with correct email and name
- [ ] `passwordHash` is null for OAuth-only users
- [ ] SocialAccount record exists with correct provider ('google' or 'github')
- [ ] `providerEmail` matches user email

## Troubleshooting Quick Checks

If something doesn't work:

### Backend Issues
- [ ] **Check backend logs**: `docker-compose logs -f backend`
- [ ] **Verify environment variables**: `docker-compose exec backend env | grep -E "(GOOGLE|GITHUB)"`
- [ ] **Check OAuth endpoints work**: 
  - Visit `http://localhost:4000/api/auth/google` (should redirect to Google)
  - Visit `http://localhost:4000/api/auth/github` (should redirect to GitHub)

### Frontend Issues  
- [ ] **Check frontend logs**: `docker-compose logs -f frontend`
- [ ] **Check browser console** for JavaScript errors
- [ ] **Verify social login buttons render** properly

### OAuth App Issues
- [ ] **Verify callback URLs** match exactly in OAuth apps
- [ ] **Check OAuth app status** (enabled, not suspended)
- [ ] **Verify scopes** include email permissions

## Success Criteria

✅ **Implementation is working correctly if**:
- [ ] Both Google and GitHub OAuth buttons appear on login page
- [ ] OAuth flows complete successfully without errors
- [ ] New users can register via social login
- [ ] Existing users can link social accounts
- [ ] Proper error handling for OAuth failures
- [ ] Database records are created correctly
- [ ] Users remain logged in after OAuth

## Next Steps

After successful testing:
- [ ] Consider creating production OAuth apps
- [ ] Test on mobile devices
- [ ] Review security considerations in the admin guide
- [ ] Plan production deployment with HTTPS

---

**Need help?** Check the full [Social Login Configuration guide](website/docs/admin-guide/system-management.md#social-login-configuration) for detailed troubleshooting steps. 