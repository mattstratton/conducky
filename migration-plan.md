# Migration Plan: Event Slug-Based Routing and Permissions

## Overview & Desired Outcome

- The home page `/` lists all events (public, no login required). Users can click an event to go to its dashboard.
- Each event has its own page at `/event/[event-slug]`:
  - If the user is a Responder, Admin, or SuperAdmin for that event: show all reports for the event, state change controls, and the ability to create a report.
  - If the user is a regular user: show the ability to create a report, and if they have submitted reports, show their own reports and a link to see details.
  - If not logged in: optionally allow anonymous report submission (if supported).
- All event-specific backend and frontend logic uses the event slug in the path, not the eventId.
- Permissions and UI are always scoped to the event, based on the user's role for that event.
- The SuperAdmin page `/superadmin` remains as is, for global event management and admin tools.

## Backend

### 1. Add Utility and Endpoint
- [X] Add a utility function to resolve event slug to eventId.
- [X] Add endpoint: GET /event/slug/:slug to fetch event details by slug.

### 2. Refactor Event-Related Endpoints to Use Slugs
- [X] For each event-related endpoint (reports, users, roles, etc.), add a new route using /events/slug/:slug/... instead of /events/:eventId/...
- [X] In each handler, resolve the slug to eventId using the utility function.
- [X] Use eventId for all DB queries and permission checks.
- [X] Update RBAC middleware to accept event slug and resolve to eventId for permission checks.
- [X] Leave old eventId-based routes for backward compatibility (optional, for testing).
- [X] Update all report, user, and role endpoints to work with slugs.

### 3. Testing
- [ ] Test all new slug-based endpoints with sample requests for all roles (user, responder, admin, superadmin).
- [ ] Remove or deprecate old eventId-based endpoints if no longer needed.

## Frontend

### 1. Home Page
- [X] Update / to list all events (public, no login required).
- [X] Each event links to /event/[event-slug].

### 2. Event Page
- [X] Create /event/[event-slug].js for event homepage/dashboard.
- [X] Show all reports and controls for Responder/Admin/SuperAdmin.
- [X] Show only user's own reports and report creation for regular users.
- [X] Allow anonymous report submission if not logged in (if supported).
- [X] Update all event-related links and API calls to use slug.

### 3. Dashboard/Report Logic
- [X] Update dashboard and report logic to use slugs, not eventId.
- [X] Ensure report creation, listing, and state change all work via slug-based routing.

### 4. SuperAdmin Page
- [X] Keep /superadmin as is for SuperAdmin-only features.

### 5. Testing
- [ ] Test all frontend flows for all roles (user, responder, admin, superadmin).
- [ ] Ensure navigation, permissions, and UI are correct for each role.

## Deployment & Final Steps
- [ ] Rebuild Docker environment: `docker compose down -v && docker compose build --no-cache && docker compose up`
- [ ] Test all new flows end-to-end.
- [ ] Update documentation as needed. 