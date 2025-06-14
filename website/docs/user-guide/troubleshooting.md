---
sidebar_position: 7
---

# Troubleshooting Guide

This guide covers common issues you might encounter while using Conducky and how to resolve them.

## Navigation Issues

### Sidebar Not Showing

**Problem**: The sidebar navigation is not visible when logged in.

**Causes & Solutions**:

1. **Not logged in properly**
   - Ensure you're fully logged in by checking if your name appears in the user menu
   - Try logging out and logging back in
   - Clear your browser cache and cookies

2. **No event roles**
   - The sidebar only appears when you have roles in at least one event
   - Contact an event administrator to get invited to an event
   - Check your profile to see which events you belong to

3. **Browser compatibility**
   - Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)
   - Disable browser extensions that might interfere with the UI
   - Try using an incognito/private browsing window

### Losing Login State When Navigating

**Problem**: You get logged out when clicking navigation links.

**Solution**: This was a known issue that has been fixed. If you're still experiencing this:

1. **Clear browser cache**: Old cached JavaScript might be causing the issue
2. **Hard refresh**: Press Ctrl+F5 (Windows) or Cmd+Shift+R (Mac) to force reload
3. **Check for mixed content**: Ensure you're accessing the site via HTTPS if configured

### Missing Navigation Items

**Problem**: Expected navigation items are not showing in the sidebar.

**Causes & Solutions**:

1. **Role-based access**: Navigation items are filtered based on your role in each event
   - **Reporters** only see: Event Dashboard, Submit Report, My Reports
   - **Responders** see: Event Dashboard, All Reports, Submit Report, Team (view only)
   - **Admins** see: Full navigation including Team Management and Event Settings

2. **Event context**: Some navigation items only appear when you're in an event context
   - Navigate to an event (e.g., `/events/your-event/dashboard`) to see event-specific navigation
   - Use the event switcher dropdown to select an event

3. **SuperAdmin vs Event roles**: SuperAdmins need explicit event roles to see event navigation
   - SuperAdmin system access is separate from event access
   - Ask an event admin to add you to specific events

### Event Switcher Not Showing

**Problem**: The event switcher dropdown is not visible.

**Causes & Solutions**:

1. **Single event user**: The switcher only appears when you belong to multiple events
2. **No events**: Users with no event roles won't see the switcher
3. **Context-dependent**: The switcher may not show in certain contexts (like system admin pages)

### Event Dashboard Shows 404 Error

**Problem**: Accessing an event dashboard returns a 404 error.

**Causes & Solutions**:

1. **Incorrect URL format**: Ensure you're using the correct URL structure
   - ✅ Correct: `/events/event-slug/dashboard`
   - ❌ Incorrect: `/event/event-slug` (old format)

2. **Event doesn't exist**: Verify the event slug is correct
3. **No access**: Ensure you have a role in the event
4. **Event disabled**: The event may have been disabled by a SuperAdmin

## Authentication Issues

### Can't Log In

**Problem**: Login attempts fail or redirect incorrectly.

**Solutions**:

1. **Check credentials**: Verify email and password are correct
2. **Account exists**: Ensure you have an account - try the "Forgot Password" link
3. **Browser issues**: Clear cookies and cache, try incognito mode
4. **Server issues**: Check if the backend server is running (for local development)

### Redirected to Wrong Page After Login

**Problem**: After login, you're not taken to the expected page.

**Expected Behavior**:
- **First-time users**: Global dashboard (`/dashboard`)
- **Single event users**: That event's dashboard
- **Multi-event users**: Global dashboard showing all events
- **SuperAdmins**: System admin dashboard (`/admin/dashboard`)

**Solutions**:
1. **Manual navigation**: Use the sidebar to navigate to your desired location
2. **Check roles**: Verify your roles in the profile section
3. **Clear cache**: Browser cache might have old redirect logic

### Session Expires Quickly

**Problem**: You get logged out frequently.

**Solutions**:
1. **Check session configuration**: Ensure `SESSION_SECRET` is set properly (for administrators)
2. **Browser settings**: Ensure cookies are enabled
3. **Network issues**: Unstable connections can cause session issues

## Event Access Issues

### Can't Access Event

**Problem**: You can't view or access a specific event.

**Causes & Solutions**:

1. **No role in event**: You need to be invited to the event
   - Contact the event administrator
   - Check if you have a pending invitation

2. **Event disabled**: The event may have been disabled
   - Contact a SuperAdmin if you believe this is an error

3. **Wrong URL**: Ensure you're using the correct event slug
   - Check the URL format: `/events/[correct-slug]/dashboard`

### Can't See Event Data

**Problem**: You can access the event but can't see reports, team members, etc.

**Solutions**:
1. **Check your role**: Different roles have different access levels
2. **Event permissions**: Some data may be restricted based on your role
3. **Data exists**: The event may not have any data yet

## Report Issues

### Can't Submit Reports

**Problem**: Report submission fails or form is not accessible.

**Solutions**:
1. **Check role**: Ensure you have at least Reporter role in the event
2. **Form validation**: Check that all required fields are filled correctly
3. **File uploads**: Ensure evidence files meet size and type requirements
4. **Network issues**: Large file uploads may timeout on slow connections

### Can't View Reports

**Problem**: Report lists are empty or specific reports can't be accessed.

**Role-based access**:
- **Reporters**: Can only see their own reports
- **Responders**: Can see all reports in the event
- **Admins**: Can see all reports in the event

**Solutions**:
1. **Check filters**: Report lists may have filters applied
2. **Verify role**: Ensure you have appropriate access
3. **Reports exist**: The event may not have any reports yet

## Mobile Issues

### Navigation Doesn't Work on Mobile

**Problem**: Sidebar or navigation is not functional on mobile devices.

**Solutions**:
1. **Use swipe gestures**: Swipe from the left edge to open the sidebar
2. **Tap the menu button**: Look for the hamburger menu icon
3. **Responsive design**: Ensure you're using a supported mobile browser
4. **Touch targets**: Navigation items are optimized for touch - tap directly on them

### Forms Difficult to Use on Mobile

**Problem**: Forms are hard to fill out on mobile devices.

**Solutions**:
1. **Zoom in**: Use pinch-to-zoom for better visibility
2. **Rotate device**: Some forms work better in landscape mode
3. **Use appropriate keyboards**: The system should automatically show the right keyboard type
4. **One field at a time**: Focus on one form field at a time

## Performance Issues

### Slow Loading

**Problem**: Pages load slowly or seem to hang.

**Solutions**:
1. **Check network**: Ensure you have a stable internet connection
2. **Clear cache**: Browser cache might be corrupted
3. **Reduce browser load**: Close unnecessary tabs and extensions
4. **Server performance**: For administrators, check server resources

### Images Not Loading

**Problem**: Event logos, avatars, or evidence files don't display.

**Solutions**:
1. **File format**: Ensure images are in supported formats (PNG, JPG)
2. **File size**: Large files may timeout - try smaller images
3. **Permissions**: Ensure you have access to view the content
4. **Network issues**: Images may fail to load on slow connections

## Getting Help

### Self-Service Options

1. **Check this guide**: Review the relevant sections above
2. **Navigation guide**: See the [Navigation Guide](./navigation.md) for detailed navigation help
3. **User roles**: Review [User Management](./user-management.md) to understand roles
4. **Event management**: See [Event Management](./event-management.md) for event-specific help

### Contact Support

If you can't resolve an issue:

1. **Event-related issues**: Contact your event administrator
2. **Account issues**: Contact your system administrator
3. **Technical issues**: Provide details about:
   - What you were trying to do
   - What happened instead
   - Your browser and device information
   - Any error messages you saw

### For Administrators

If you're an administrator troubleshooting issues:

1. **Check logs**: Review backend logs for error messages
2. **Database connectivity**: Ensure the database is accessible
3. **Environment variables**: Verify all required variables are set
4. **User roles**: Check user roles and permissions in the database
5. **Event status**: Verify events are enabled and properly configured

## Known Issues

### Recently Fixed

These issues have been resolved in recent updates:

- ✅ **Navigation authentication loss**: Fixed issue where clicking navigation links would log users out
- ✅ **Event dashboard 404 errors**: Fixed API endpoint mismatches
- ✅ **Missing sidebar in event context**: Fixed URL pattern matching for event pages
- ✅ **Profile duplication in navigation**: Removed duplicate profile section from sidebar

### Current Limitations

- **Anonymous reporting**: Not yet implemented
- **Email notifications**: Not yet implemented
- **Bulk operations**: Limited bulk actions available
- **Advanced search**: Basic search functionality only

If you encounter an issue not covered in this guide, please report it to your administrator with as much detail as possible. 