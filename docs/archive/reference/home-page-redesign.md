# Home Page & Dashboard Redesign Implementation Plan

> **Status (June 2024):**
> - All core backend and frontend dashboard features are implemented except for the bottom navigation (skipped in favor of sidebar nav).
> - Universal context switcher dropdown is now live for all users; SuperAdmins use it to access the System Admin dashboard, and all users see their personal dashboard at `/`.
> - Next step: implement sidebar navigation (see UI Improvements notepad and Shadcn sidebar-07 block).

## Background & Goals

This document outlines the plan for redesigning the Conducky home page and global dashboard, addressing:
- [Issue #152: Home page redesign](https://github.com/mattstratton/conducky/issues/152)
- [Issue #153: Home page should show list of all events (if enabled)](https://github.com/mattstratton/conducky/issues/153)
- [reference/global-dashboard-design.md]
- [reference/conducky-sitemap.md]

**Goals:**
- Provide a welcoming, informative landing page for unauthenticated users.
- Show a mobile-first, role-aware dashboard for authenticated users.
- Handle empty state (no events), and SuperAdmin context.
- Allow public event listing on the home page if enabled by a system setting.

## Key Requirements & User Flows

### Unauthenticated Users
- See a welcome/overview page with login button.
- If event listing is enabled, show a public list of events with "Join"/"View" actions.
- Links to documentation, code of conduct, and "Learn More".

### Authenticated Users
- **No events:** Show empty state with invite instructions.
- **One event:** Show the global dashboard with just that event (no auto-redirect).
- **Multiple events:** Show global dashboard with all events.
  - Quick stats (events, reports, items needing response)
  - Event cards (role-aware, contextual actions)
  - Recent activity feed
  - Join Event widget
  - Bottom navigation (mobile)
- **SuperAdmin:** Route to `/admin/dashboard` with context switcher.

### System Setting: Public Event Listing
- System-level boolean config to enable/disable public event listing.
- Admin UI for SuperAdmins to toggle this setting.
- If enabled, unauthenticated users see all events on home page.

## Reference Files & Issues
- [reference/global-dashboard-design.md]
- [reference/conducky-sitemap.md]
- [Issue #152](https://github.com/mattstratton/conducky/issues/152)
- [Issue #153](https://github.com/mattstratton/conducky/issues/153)

## Design & UX Notes
- Mobile-first layouts (see global-dashboard-design.md)
- Role-based event cards (Admin, Responder, Reporter)
- Quick actions and stats per event
- Accessibility: headings, ARIA, color contrast, touch targets
- Interaction: swipe, pull-to-refresh, context switching
- SuperAdmin has separate system dashboard and context switcher

## Ordered Task List

### 1. Backend
- [x] Add system setting (e.g., `SHOW_PUBLIC_EVENT_LIST`) to config/database
- [x] Expose system settings via API (e.g., `/api/system/settings`)
- [ ] Add/extend admin UI for SuperAdmins to toggle event listing
- [x] Ensure event listing endpoint supports public access if enabled
- [x] Add `/api/users/me/events` endpoint for user event/role listing

### 2. Frontend
- [x] Redesign `/` route:
    - [x] Show unauthenticated landing page (welcome, login, docs, event list if enabled)
    - [x] Show authenticated dashboard for all users (no auto-redirect)
- [x] Add logic for user state (no events, one event, multiple events, SuperAdmin)
- [ ] Implement global dashboard (`/dashboard`) per design doc:
    - [x] QuickStats component
    - [x] EventCard component (role-aware, with actions)
    - [x] ActivityFeed component
    - [x] JoinEventWidget
    - [x] Universal context switcher dropdown (avatar-triggered, right-aligned, all users; SuperAdmins see System Admin Dashboard link)
    - [ ] ~~Bottom navigation (mobile)~~ **[Skipped: Will implement sidebar nav instead. See UI Improvements notepad. Use `npx shadcn@latest add sidebar-07` as a starting point.]**
- [ ] Add/extend context switcher for SuperAdmin **[Merged into universal context switcher above]**
- [ ] Ensure accessibility and mobile usability

### 3. Testing
- [ ] Unit tests for new backend endpoints and settings
- [ ] Unit/integration tests for new frontend components
- [ ] Manual testing for all user flows (mobile/desktop, all roles)
- [ ] Accessibility and performance checks

### 4. Documentation
- [ ] Update `/website/docs/developer-docs/AllComponents.mdx` with new/changed components
- [ ] Add/extend user and admin guides for new dashboard features

## Additional Notes
- The global dashboard is now always shown for authenticated users, regardless of event count. The auto-redirect for single-event users has been removed for a consistent experience.
- The event dashboard route (`/events/[eventSlug]/dashboard`) is not yet implemented.
- Use the wireframes and layouts from `global-dashboard-design.md` as the blueprint for UI/UX.
- Follow navigation/context patterns from `conducky-sitemap.md`.
- Prioritize mobile usability and accessibility throughout.
- If picking up this work later, review the referenced files and issues for the latest requirements and design updates.
- **Summary of changes:**
  - Removed single-event auto-redirect; global dashboard is now the landing page for all users.
  - Completed backend and frontend logic for system setting, event listing, and user dashboard state.
  - Next: implement full dashboard UI widgets and admin UI for system setting. 