# Navigation Test Guide - Conducky Sitemap Implementation

## Overview
This guide helps you test the complete three-level navigation system that was implemented. The navigation is now context-aware and changes based on your current location and user role.

## 🎯 Three Navigation Contexts

### 1. **Global Dashboard Context** (`/dashboard`)
**When**: Default context for authenticated users
**Navigation Features**:
- Dashboard (home)
- All Reports (cross-event)
- Notifications
- Profile (with sub-items)
- System Admin (if SuperAdmin)
- Event switcher dropdown

### 2. **Event Context** (`/events/[eventSlug]/`)
**When**: Inside any specific event
**Navigation Features**:
- Event Dashboard
- Reports (with sub-items)
- Team (with sub-items)
- Event Settings (with sub-items)
- Event switcher dropdown

### 3. **System Admin Context** (`/admin/`)
**When**: SuperAdmin accessing system management
**Navigation Features**:
- System Dashboard
- Events Management (with sub-items)
- System Settings (with sub-items)
- User Management
- No event switcher (system-level only)

## 🧪 Complete Navigation Test Plan

### Test 1: Global Dashboard Navigation
1. **Start**: Go to `http://localhost:3001/dashboard`
2. **Verify Sidebar Shows**:
   - 🏠 Dashboard (active)
   - 📋 All Reports
   - 📖 Notifications
   - 👤 Profile (expandable)
     - Profile Settings
     - My Events
   - 🛡️ System Admin (if SuperAdmin)
3. **Test Event Switcher**: Should show dropdown with your events
4. **Test Links**: Click each navigation item to verify they load

### Test 2: Event Context Navigation
1. **Start**: Go to `http://localhost:3001/events/test-event/dashboard`
2. **Verify Sidebar Shows**:
   - 🏠 Event Dashboard (active)
   - 📋 Reports (expandable)
     - All Reports
     - Submit Report
   - 👥 Team (expandable)
     - Team Members
     - Send Invites
   - ⚙️ Event Settings (expandable)
     - General Settings
     - Code of Conduct
     - Notifications
3. **Test Event Switcher**: Should show current event with dropdown
4. **Test Context Switching**: Switch to different event via dropdown

### Test 3: System Admin Navigation (SuperAdmin only)
1. **Start**: Go to `http://localhost:3001/admin/dashboard`
2. **Verify Sidebar Shows**:
   - 🏠 System Dashboard (active)
   - 👥 Events Management (expandable)
     - All Events
     - Create Event
     - Disabled Events
   - ⚙️ System Settings (expandable)
     - General Settings
     - Backups
     - Logs
   - 👤 User Management
3. **Verify No Event Switcher**: System admin is event-agnostic
4. **Test All Links**: Verify all admin pages load (even if stubs)

### Test 4: Context Switching
1. **Global → Event**: From `/dashboard`, click event in switcher
2. **Event → Global**: From event page, navigate to global dashboard
3. **Global → System**: From `/dashboard`, click "System Admin" (if SuperAdmin)
4. **System → Global**: From `/admin/dashboard`, navigate back to dashboard
5. **Event → Event**: Switch between different events using event switcher

### Test 5: Role-Based Navigation
1. **As SuperAdmin**: Should see all three contexts
2. **As Event Admin**: Should see global + event contexts, no system admin
3. **As Responder**: Should see global + event contexts with appropriate permissions
4. **As Reporter**: Should see global + event contexts with limited options

## 📱 Mobile Navigation Test

### Mobile Sidebar Behavior
1. **Collapsed State**: Sidebar should collapse to icons only
2. **Event Switcher**: Should show as icon button when collapsed
3. **Touch Targets**: All navigation items should be touch-friendly
4. **Responsive**: Test on mobile viewport (< 768px width)

### Mobile Test Steps
1. **Resize Browser**: Make window narrow (< 768px)
2. **Test Sidebar**: Should auto-collapse to icon mode
3. **Test Navigation**: Click icons to expand/navigate
4. **Test Event Switcher**: Should work in collapsed mode

## 🔗 URL Structure Verification

### Global URLs
- ✅ `/dashboard` - Global dashboard
- ✅ `/dashboard/reports` - Cross-event reports
- ✅ `/dashboard/notifications` - Notifications
- ✅ `/profile` - User profile
- ✅ `/profile/settings` - Profile settings
- ✅ `/profile/events` - User's events

### Event URLs (replace `test-event` with actual event slug)
- ✅ `/events/test-event/dashboard` - Event dashboard
- ✅ `/events/test-event/reports` - Event reports list
- ✅ `/events/test-event/reports/new` - Submit report
- ✅ `/events/test-event/reports/[reportId]` - Report detail
- ✅ `/events/test-event/team` - Team members
- ✅ `/events/test-event/team/invite` - Send invites
- ✅ `/events/test-event/settings` - Event settings
- ✅ `/events/test-event/code-of-conduct` - Public CoC

### System Admin URLs (SuperAdmin only)
- ✅ `/admin/dashboard` - System dashboard
- ✅ `/admin/events` - All events management
- ✅ `/admin/events/new` - Create event
- ✅ `/admin/system/settings` - System settings
- ✅ `/admin/users` - User management

## 🎨 Visual Navigation Test

### Active State Indicators
1. **Current Page**: Should be highlighted/bold in sidebar
2. **Breadcrumbs**: Should show current context clearly
3. **Event Switcher**: Should show current event name
4. **Context Awareness**: Sidebar should change based on current page

### Dark Mode Test
1. **Toggle Dark Mode**: Use the theme switcher
2. **Navigation Visibility**: All nav items should be readable
3. **Active States**: Should be visible in both light/dark modes
4. **Event Switcher**: Should work properly in both themes

## 🚨 Error Scenarios to Test

### Permission Errors
1. **Non-SuperAdmin**: Try accessing `/admin/dashboard` - should redirect or show error
2. **No Event Access**: Try accessing event you don't belong to
3. **Invalid Event**: Try accessing `/events/nonexistent-event/dashboard`

### Navigation Edge Cases
1. **Direct URL Access**: Type URLs directly in browser
2. **Back Button**: Use browser back/forward buttons
3. **Refresh**: Refresh page in different contexts
4. **Deep Links**: Share and access deep links to specific pages

## ✅ Success Criteria

### Navigation is Working Correctly When:
- [x] All URLs return HTTP 200 status
- [ ] Sidebar navigation changes based on current context
- [ ] Event switcher shows appropriate events
- [ ] Role-based navigation items appear/disappear correctly
- [ ] Mobile navigation works on small screens
- [ ] Active states highlight current page
- [ ] Context switching works smoothly
- [ ] All stub pages load with "coming soon" message
- [ ] No broken links or 404 errors
- [ ] Dark mode navigation is fully functional

## 🐛 Common Issues to Watch For

### Navigation Issues
- Sidebar not updating when switching contexts
- Event switcher not showing current event
- Active states not highlighting correctly
- Mobile navigation not collapsing properly

### URL Issues
- Old `/event/` URLs still being used anywhere
- Parameter mismatches (`event-slug` vs `eventSlug`)
- Broken internal links
- API calls using old endpoints

### Permission Issues
- SuperAdmin seeing event data they shouldn't
- Non-SuperAdmin accessing system admin pages
- Event navigation showing for users without event access

## 📝 Test Results Template

```
## Navigation Test Results - [Date]

### Global Dashboard Context
- [ ] Sidebar navigation correct
- [ ] Event switcher working
- [ ] All links functional
- [ ] Active states correct

### Event Context
- [ ] Context-aware navigation
- [ ] Event switcher shows current event
- [ ] Sub-navigation working
- [ ] Role-based items correct

### System Admin Context
- [ ] System navigation only
- [ ] No event switcher
- [ ] All admin links working
- [ ] SuperAdmin access only

### Mobile Navigation
- [ ] Sidebar collapses correctly
- [ ] Touch targets adequate
- [ ] Event switcher works collapsed
- [ ] All contexts work on mobile

### Issues Found
- Issue 1: [Description]
- Issue 2: [Description]

### Overall Status
- [ ] ✅ All navigation working correctly
- [ ] ⚠️ Minor issues found
- [ ] ❌ Major issues need fixing
```

## 🎉 What You Should See

The navigation system now provides:
1. **Clear Context Separation**: You always know if you're in global, event, or system context
2. **Intuitive Navigation**: Related features are grouped logically
3. **Role-Based Access**: You only see what you have permission to access
4. **Mobile-Friendly**: Works great on all screen sizes
5. **Future-Ready**: All planned features have navigation stubs in place

**Happy Testing!** 🚀 