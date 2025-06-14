# Conducky Sitemap Implementation Plan

## Overview
This document outlines the plan to restructure the frontend pages to match the recommended sitemap from `reference/conducky-sitemap.md`. The goal is to implement a proper three-level navigation pattern: System Level (SuperAdmin), Global Level (User Dashboard), and Event Level (Event Context).

## Current vs. Recommended Structure Analysis

### 🏠 Public/Unauthenticated Pages

#### ✅ Existing & Correct
- `/` - `frontend/pages/index.tsx` (landing page with proper logic)
- `/login` - `frontend/pages/login.tsx` 
- `/invite/[token]` - `frontend/pages/invite/[code].tsx` (accept invite to event)

#### 📝 Need to Create (New Pages)
- [ ] `/register` - User registration page (stub for now)
- [ ] `/forgot-password` - Password reset request page (stub for now)
- [ ] `/reset-password` - Password reset form page (stub for now)
- [ ] `/[eventSlug]/report` - Anonymous reporting (future feature, stub for now)

### 🎯 Global User Dashboard (authenticated)

#### 🔄 Needs Migration/Enhancement
- [ ] **MIGRATE**: Current global dashboard logic is in `/` (`frontend/pages/index.tsx` lines 139-170)
  - **Action**: Extract global dashboard logic to new `/dashboard` page
  - **Current**: Shows "Your Global Dashboard" with event cards in index.tsx
  - **Target**: Move to dedicated `/dashboard/index.tsx` page
  - **Keep in index.tsx**: Landing page logic for unauthenticated users and first-time setup
  - **Add to index.tsx**: Redirect authenticated users to `/dashboard`

#### 📝 Need to Create (New Pages)
- [ ] `/dashboard/index.tsx` - Multi-event overview (migrate from index.tsx)
- [ ] `/dashboard/reports.tsx` - All reports across events (stub for now)
- [ ] `/dashboard/notifications.tsx` - Future notifications (stub for now)

### 📊 Event-Scoped Pages

#### ✅ Existing & Correct Structure
- `/events/[eventSlug]/` - Base event context exists
- `/events/[eventSlug]/code-of-conduct.tsx` - ✅ Correct
- `/events/[eventSlug]/report/[id].tsx` - ✅ Correct (report detail)

#### 🔄 Needs Migration/Renaming
- [ ] **MIGRATE**: `/event/[event-slug].tsx` → `/events/[eventSlug]/dashboard.tsx`
  - **Current**: `frontend/pages/event/[event-slug].tsx` (event dashboard)
  - **Target**: `frontend/pages/events/[eventSlug]/dashboard.tsx`
  - **Action**: Move file and update all internal links

- [ ] **MIGRATE**: `/event/[event-slug]/admin.tsx` → `/events/[eventSlug]/settings/index.tsx`
  - **Current**: `frontend/pages/event/[event-slug]/admin.tsx` (event settings)
  - **Target**: `frontend/pages/events/[eventSlug]/settings/index.tsx`
  - **Action**: Move file and update navigation

- [ ] **MIGRATE**: `/event/[event-slug]/report/index.tsx` → `/events/[eventSlug]/reports/index.tsx`
  - **Current**: `frontend/pages/event/[event-slug]/report/index.tsx` (reports list)
  - **Target**: `frontend/pages/events/[eventSlug]/reports/index.tsx`
  - **Action**: Move file and update navigation

- [ ] **MIGRATE**: `/event/[event-slug]/report/[id].tsx` → `/events/[eventSlug]/reports/[reportId]/index.tsx`
  - **Current**: `frontend/pages/event/[event-slug]/report/[id].tsx` (report detail)
  - **Target**: `frontend/pages/events/[eventSlug]/reports/[reportId]/index.tsx`
  - **Action**: Move file and update all report links

#### 📝 Need to Create (New Pages)
- [ ] `/events/[eventSlug]/reports/new.tsx` - Submit new report (stub for now)
- [ ] `/events/[eventSlug]/team/index.tsx` - Team member list (admin/responder only, stub for now)
- [ ] `/events/[eventSlug]/team/invite.tsx` - Send invites (stub for now)
- [ ] `/events/[eventSlug]/team/[userId].tsx` - User profile/role management (stub for now)
- [ ] `/events/[eventSlug]/settings/code-of-conduct.tsx` - Edit CoC (stub for now)
- [ ] `/events/[eventSlug]/settings/notifications.tsx` - Future notifications (stub for now)

#### 🗑️ Pages to Remove/Consolidate Later
- `/event/[event-slug]/admin/reports.tsx` - Consolidate into main reports list with role-based filtering
- `/event/[event-slug]/admin/user/[user-id].tsx` - Move to team management
- `/event/[event-slug]/admin/reports/user/[user-id].tsx` - Consolidate into reports filtering
- `/event/[event-slug]/user/index.tsx` - Remove (minimal content)
- `/event/[event-slug]/user/[user-id]/index.tsx` - Move to team management

### 🔧 System Admin Pages (SuperAdmin only)

#### 🔄 Needs Migration
- [ ] **MIGRATE**: `/admin.tsx` → `/admin/dashboard.tsx`
  - **Current**: `frontend/pages/admin.tsx` (system admin with event management)
  - **Target**: `frontend/pages/admin/dashboard.tsx`
  - **Action**: Move file and update navigation

#### 📝 Need to Create (New Pages)
- [ ] `/admin/events/index.tsx` - All events table (migrate from admin.tsx)
- [ ] `/admin/events/new.tsx` - Create new event form (migrate from admin.tsx)
- [ ] `/admin/events/[eventId]/edit.tsx` - Edit event details (stub for now)
- [ ] `/admin/events/[eventId]/settings.tsx` - System-level configuration (stub for now)
- [ ] `/admin/events/[eventId]/users.tsx` - View event users (future, stub for now)
- [ ] `/admin/events/disabled.tsx` - List of disabled events (stub for now)
- [ ] `/admin/system/settings.tsx` - Future email config, etc. (stub for now)
- [ ] `/admin/system/backups.tsx` - Future backups (stub for now)
- [ ] `/admin/system/logs.tsx` - Future logs (stub for now)
- [ ] `/admin/users/index.tsx` - Future global user management (stub for now)

### 👤 Profile Pages

#### ✅ Existing & Correct
- `/profile.tsx` - ✅ User profile with avatar management

#### 📝 Need to Create (New Pages)
- [ ] `/profile/settings.tsx` - Preferences, notifications (stub for now)
- [ ] `/profile/events.tsx` - List of events user belongs to with role management (stub for now)

## Implementation Priority & Phases

### Phase 1: Create All Stub Pages (High Priority) ✅ COMPLETE
Create the complete directory structure and stub pages first:

1. [x] **Create all stub pages** using the template provided
2. [x] **Create directory structure** for new page organization
3. [x] **Verify all stub pages load** without errors

### Phase 2: Critical Path Migrations (High Priority)
These are essential for the new navigation structure to work:

4. [x] **Create `/dashboard/index.tsx`** - Extract global dashboard from index.tsx
5. [ ] **Migrate `/event/[event-slug].tsx` → `/events/[eventSlug]/dashboard.tsx`**
6. [x] **Migrate `/admin.tsx` → `/admin/dashboard.tsx`**
7. [ ] **Update all internal navigation links** to use new paths
8. [ ] **Update sidebar navigation** to reflect new structure

### Phase 3: Reports & Team Management (Medium Priority)
9. [ ] **Migrate report pages** to new `/events/[eventSlug]/reports/` structure
10. [ ] **Create team management stubs** under `/events/[eventSlug]/team/`
11. [ ] **Create settings stubs** under `/events/[eventSlug]/settings/`

### Phase 4: System Admin Enhancement (Medium Priority)
12. [ ] **Create admin subpages** under `/admin/events/`, `/admin/system/`
13. [ ] **Migrate event management** from admin.tsx to dedicated pages

### Phase 5: Profile & Auth Pages (Lower Priority)
14. [ ] **Create profile subpages** under `/profile/`
15. [ ] **Create auth pages** (register, forgot-password, reset-password)

### Phase 6: Future Features (Lowest Priority)
16. [ ] **Anonymous reporting** pages
17. [ ] **Notification** pages
18. [ ] **Advanced admin** features

## Detailed Migration Steps

### Step 1: Create Global Dashboard
```bash
# Create dashboard directory
mkdir -p frontend/pages/dashboard

# Create dashboard index page
touch frontend/pages/dashboard/index.tsx
touch frontend/pages/dashboard/reports.tsx
touch frontend/pages/dashboard/notifications.tsx
```

**Actions:**
- Extract lines 139-170 from `frontend/pages/index.tsx` (global dashboard logic)
- Move to new `frontend/pages/dashboard/index.tsx`
- Update index.tsx to redirect ALL authenticated users to `/dashboard` (not just those with events)
- Keep unauthenticated user logic (welcome page, first user setup) in index.tsx
- Update navigation links from `/` to `/dashboard` for authenticated users

### Step 2: Migrate Event Pages
```bash
# Create new events directory structure
mkdir -p frontend/pages/events/[eventSlug]/{dashboard,reports,team,settings}
mkdir -p frontend/pages/events/[eventSlug]/reports/[reportId]
mkdir -p frontend/pages/events/[eventSlug]/team
mkdir -p frontend/pages/events/[eventSlug]/settings

# Move existing files
mv frontend/pages/event/[event-slug].tsx frontend/pages/events/[eventSlug]/dashboard.tsx
mv frontend/pages/event/[event-slug]/admin.tsx frontend/pages/events/[eventSlug]/settings/index.tsx
mv frontend/pages/event/[event-slug]/report/index.tsx frontend/pages/events/[eventSlug]/reports/index.tsx
mv frontend/pages/event/[event-slug]/report/[id].tsx frontend/pages/events/[eventSlug]/reports/[reportId]/index.tsx
```

**Actions:**
- Update all internal links from `/event/` to `/events/`
- Update dynamic route parameters from `[event-slug]` to `[eventSlug]`
- Update API calls and router usage to match new parameter names

### Step 3: Migrate System Admin
```bash
# Create admin directory structure
mkdir -p frontend/pages/admin/{dashboard,events,system,users}
mkdir -p frontend/pages/admin/events/[eventId]

# Move existing file
mv frontend/pages/admin.tsx frontend/pages/admin/dashboard.tsx
```

**Actions:**
- Split admin.tsx functionality between dashboard and events pages
- Update navigation to use `/admin/dashboard` instead of `/admin`
- Create event management pages under `/admin/events/`

### Step 4: Create Stub Pages
For each new page that doesn't exist yet, create a stub with this template:

```tsx
import React from 'react';
import { Card } from '@/components/ui/card';

export default function PageName() {
  return (
    <div className="min-h-screen bg-background py-8 px-4 transition-colors duration-200">
      <Card className="w-full max-w-4xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-4">Page Title</h1>
        <p className="text-muted-foreground">This page is coming soon.</p>
      </Card>
    </div>
  );
}
```

## Navigation Updates Required

### Sidebar Navigation (`frontend/components/app-sidebar.tsx`)
- [ ] Update navigation items to use new paths
- [ ] Add context-aware navigation (system admin vs global vs event)
- [ ] Update role-based navigation visibility

### Internal Links
- [ ] Update all `Link` components throughout the app
- [ ] Update `router.push()` calls
- [ ] Update API redirects in backend (if any)

### URL Parameter Updates
- [ ] Change `[event-slug]` to `[eventSlug]` in all files
- [ ] Update `router.query` usage to match new parameter names
- [ ] Update API calls that use route parameters

## Testing Checklist

After each migration:
- [ ] Verify page loads correctly
- [ ] Verify navigation links work
- [ ] Verify role-based access control still works
- [ ] Verify API calls still work with new parameters
- [ ] Test mobile responsiveness
- [ ] Test dark mode

## Files That Need Link Updates

Based on the grep search, these files contain navigation links that need updating:
- `frontend/components/app-sidebar.tsx`
- `frontend/components/shared/EventCard.tsx`
- `frontend/components/shared/JoinEventWidget.tsx`
- `frontend/components/nav-user.tsx`
- `frontend/pages/admin.tsx` (after migration)
- All event-scoped pages after migration

## Backend API Considerations

The backend API endpoints should remain the same, but we need to verify:
- [ ] Route parameter extraction still works with new frontend paths
- [ ] Any hardcoded redirects in backend need updating
- [ ] Session management and authentication flows still work

## Navigation Context Best Practices

Based on modern web app patterns, the recommended approach for context-aware navigation is:

### Contextual Sidebar Strategy
- **Different nav items per context**: System Admin, Global Dashboard, Event Context
- **Context switcher**: Clear indicator of current context (breadcrumbs + dropdown)
- **Consistent layout**: Same sidebar position and styling, different content
- **Role-based visibility**: Show/hide nav items based on user permissions

### Context Switching Pattern
```
[System Admin ▼] > Events > Create Event
[Global Dashboard ▼] > My Events
[DevConf 2024 ▼] > Reports > New Report
```

### Implementation Approach
- Sidebar content changes based on current URL path
- Context switcher in header shows current context
- Breadcrumbs show navigation hierarchy
- Mobile: Collapsible sidebar with context-aware content

## Success Criteria

✅ **Phase 1 Complete When:**
- Global dashboard works at `/dashboard`
- Event dashboard works at `/events/[eventSlug]/dashboard`
- System admin works at `/admin/dashboard`
- All navigation links updated
- No broken links or 404 errors

✅ **Full Implementation Complete When:**
- All pages from sitemap exist (even if stubs)
- Navigation matches three-level pattern
- Role-based access control works correctly
- Mobile responsiveness maintained
- All tests pass

## Notes

- **Docker Development**: Remember to use `docker-compose exec frontend npm run dev` for development
- **Database**: No database migrations needed for this frontend restructuring
- **Styling**: Maintain existing dark mode and responsive design patterns
- **Components**: Reuse existing UI components (Card, Button, Input, etc.)
- **TypeScript**: Maintain strict TypeScript compliance throughout

This plan provides a comprehensive roadmap for restructuring the frontend to match the recommended sitemap while maintaining all existing functionality. 