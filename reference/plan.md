# Project Plan: Code of Conduct Report Management System

_Checklist items with a GitHub issue are now linked for traceability._

## Phase 1: Project Setup & Core Infrastructure

- [X] Initialize monorepo/project structure (Next.js frontend, Node.js backend)
- [X] Set up Dockerfile and docker-compose for local development (all services run locally in containers)
- [X] Document local development workflow using Docker (how to start, stop, debug, etc.)
- [X] Configure environment variables and secrets management
- [X] Set up database schema using ORM (support Postgres & MySQL)
- [X] Implement basic audit logging infrastructure

## Phase 2: Authentication & User Management

- [X] Implement email/password authentication (including magic link)
- [ ] Integrate social login (Google, GitHub) ([#3](https://github.com/mattstratton/conducky/issues/3))
- [X] Implement user roles: Reporter, Responder, Admin, Super Admin
- [X] Role-based access control (RBAC) middleware
- [X] Implement registration, login, logout, and session check endpoints
- [X] User email address needs to be unique in the database
- [X] User invite links for an event should be able to be set to the role (ie. Reporter, Responder, Admin)
- [ ] Once email system is implemented, we should be able to send invites to users
- [ ] Once email system is implemented, we should send email validation to new users who register with user/password
- [ ] Users need abilty to reset password (via email)

## Phase 2.5: Event Management UI

- [X] The list of users on the event page should be sortable and searchable
  - [X] Backend: Add support for search (by name/email) to /events/slug/:slug/users endpoint
  - [X] Backend: Add support for sorting (by name/email/role) to /events/slug/:slug/users endpoint
  - [X] Frontend: Add search input and sort controls to user list UI
  - [X] Frontend: Wire up search and sort controls to backend API
- [X] The list of users on the event page should paginate
  - [X] Backend: Add pagination (page, limit) to /events/slug/:slug/users endpoint
  - [X] Frontend: Add pagination controls to user list UI
  - [X] Frontend: Wire up pagination controls to backend API
- [X] The list of users on the event page should be filterable by role
  - [X] Backend: Add support for filtering by role to /events/slug/:slug/users endpoint
  - [X] Frontend: Add role filter controls to user list UI
  - [X] Frontend: Wire up role filter controls to backend API
- [X] The list of users on the event page should have a button to add a user
- [X] The list of users on the event page should have a button to remove a user
- [X] The list of users on the event page should have a button to edit a user
- [X] The list of users on the event page should have a button to view a user
  - [X] Frontend: Implement "View User" button to show user details (modal or page)
- [X] The list of users on the event page should have a button to view a user's reports
  - [X] Backend: Add endpoint to fetch all reports for a given user in an event
  - [X] Frontend: Implement "View User's Reports" button (link to filtered report list or modal)
- [X] The event logo should be able to be uploaded and displayed on the event page
- [X] UI/UX for user list search/sort/pagination is polished and fully wired up

## Phase 3: Multi-Tenancy & Event Management

- [X] Implement event (tenant) creation and management (Super Admin only)
- [X] List all events (Super Admin only)
- [X] Get event details (Admins of that event)
- [X] Assign/remove roles for users within an event
- [X] Enforce event scoping for all queries (users, reports, etc.)
  - [X] /events/:eventId/users (GET)
  - [X] /events/:eventId/roles (POST, DELETE)
  - [X] /events/:eventId/reports (GET, POST)
  - [X] /events/:eventId/reports/:reportId (GET, PATCH)
  - [X] /events/slug/:slug/users (GET, PATCH, DELETE)
  - [X] /events/slug/:slug/reports (GET, POST)
  - [X] /events/slug/:slug/reports/:reportId (GET, PATCH)
  - [X] /events/slug/:slug/invites (GET, POST, PATCH)
  - [X] /event/slug/:slug (GET)
- [X] List all users and their roles for an event
- [X] List all reports for an event (stub/placeholder)
- [X] Admin UI/API for managing event users and roles
- [X] Add metadata to the event (name, description, logo, code of conduct, dates, website)
  - [X] Events have their code of conduct available (markdown)
  - [X] Events have their dates of the event
  - [X] Events have a field for the website for the event
  - [X] All metadata fields are editable by Admins/SuperAdmins, with inline UI and PATCH endpoints
  - [X] Features are implemented, tested, and documented
- [X] Events should store their code of conduct as a field ([#2](https://github.com/mattstratton/conducky/issues/2))

## Phase 4: Report Submission & Management

- [X] Design and implement report submission form (with all required fields)
  - [X] Add a date and time of incident field to the report submission form
  - [X] Add a field for parties involved
  - [X] Both fields are present in both inline and modal forms, tested, and documented
- [X] Reports need the ability to have ongoing updates in text from the reporter, responder, and admin ([#24](https://github.com/mattstratton/conducky/issues/24))
- [ ] Reports should have a field for the resolution of the incident ([#25](https://github.com/mattstratton/conducky/issues/25))
- [X] Support evidence file uploads (currently one file per report; will add multiple files in the future)
- [X] Add support for multiple files per report
- [X] Implement report state machine (submitted, acknowledged, investigating, resolved, closed) ([#6](https://github.com/mattstratton/conducky/issues/6))
- [X] Dashboard as currently implemented is not appropriate, we should remove the dashboard and have a page for each event that shows the reports for that event
  - [X] The report page seems to be under a directory called dashboard/report/[id] and that doesn't seem right in the new design
- [ ] Admin/Responder UI for managing and responding to reports
  - [ ] Create Admin/Responder Reports List page (table view, responsive, dark mode)
  - [ ] Add filters and search to reports list (by state, type, reporter, responder, date, severity)
  - [ ] Add pagination to reports list
  - [X] Show evidence count, assigned responder(s), severity in list
  - [X] Link to report detail page from list
  - [ ] Build Report Detail UI for admins/responders (full metadata, evidence, comments, state, assignment, resolution)
  - [X] Add assignment controls (assign/unassign responders)
  - [X] Add state change controls (with allowed transitions)
  - [X] Add/require resolution field when state is resolved/closed
  - [X] Add comments section with markdown support, internal/external toggle, edit/delete
  - [X] Add evidence section with upload, download, and (if allowed) delete
  - [ ] Add audit log/history display (if available)
  - [ ] Ensure all actions are RBAC-protected and UI is role-aware
  - [ ] Add loading, error, and success feedback for all actions
  - [ ] Make UI fully responsive and accessible (ARIA, keyboard, color contrast)
  - [ ] Plan for future bulk actions (bulk state/assignment changes)
  - [ ] Trigger notifications on assignment, state change, new comments (future)
  - [ ] Test and polish for mobile and desktop
- [ ] Ability to search reports ([#27](https://github.com/mattstratton/conducky/issues/27))
- [ ] Ability to assign a responder to an incident ([#22](https://github.com/mattstratton/conducky/issues/22))
- [ ] Add support for severity and/or priority ([#21](https://github.com/mattstratton/conducky/issues/21))
- [ ] Add support for tagging reports ([#20](https://github.com/mattstratton/conducky/issues/20))
- [ ] Add support for events to limit report fields ([#19](https://github.com/mattstratton/conducky/issues/19))
- [ ] Comments on reports should be able to be privacy-scoped ([#24](https://github.com/mattstratton/conducky/issues/24))
- [ ] Metrics/Reporting Feature ([#26](https://github.com/mattstratton/conducky/issues/26))

## Phase 4.5: Planned/Requested Enhancements

- [ ] Consider having direct links to a specific comment on an incident ([#39](https://github.com/mattstratton/conducky/issues/39))
- [ ] Comments should support markdown and basic formatting ([#37](https://github.com/mattstratton/conducky/issues/37))
- [ ] add filtering, pagination, and possibly search for comments on an incident ([#36](https://github.com/mattstratton/conducky/issues/36))
- [X] Add ability to add avatars ([#32](https://github.com/mattstratton/conducky/issues/32))
  - [X] Users can upload/remove avatars (PNG/JPG, max 2MB, stored as BLOBs in DB)
  - [X] Avatar displays in navbar, CoC team list, and report comments
  - [X] Fallback to initials if no avatar
  - [X] Only user can modify their avatar
  - [X] All endpoints and UI tested and working
  - [X] Documentation and automated tests for avatar functionality (backend and frontend) are complete and passing
- [ ] At limits for file uploads ([#31](https://github.com/mattstratton/conducky/issues/31))
- [ ] Make sure there is a public path to the code of conduct of the event ([#28](https://github.com/mattstratton/conducky/issues/28))

## Phase 5: Backend Architecture & TypeScript Migration

- [X] **Phase 1: Backend TypeScript Migration** ([#187](https://github.com/mattstratton/conducky/issues/187)) **COMPLETE**
  - [X] Setup TypeScript infrastructure and configuration
  - [X] Migrate utility files (audit.js, upload.js, rbac.js, email.js)
  - [X] Create comprehensive type definitions
  - [X] Migrate main application file (index.js → index.ts)
  - [X] Update tests and build process for TypeScript
- [X] **Phase 2: Backend Route Implementation** ([#188](https://github.com/mattstratton/conducky/issues/188)) **COMPLETE**
  - [X] Implement all authentication and session management routes
  - [X] Implement complete event management API (CRUD, users, roles, invites, logos)
  - [X] Implement report management with evidence file support
  - [X] Implement user profile management and avatar system
  - [X] Implement notification system with filtering and statistics
  - [X] Implement role-based access control (RBAC) throughout
  - [X] Achieve 100% test coverage (156/156 tests passing)
- [X] **Phase 3: Complete Functional Parity** **COMPLETE**
  - [X] All original JavaScript functionality migrated to TypeScript
  - [X] Enhanced error handling and type safety
  - [X] Comprehensive test validation
  - [X] Production-ready TypeScript backend
- [ ] **Phase 4: Backend Refactoring & Modularization** ([#189](https://github.com/mattstratton/conducky/issues/189))
  - [ ] Create modular directory structure
  - [ ] Extract controllers (Auth, User, Event, Report, Comment, Notification, Admin, System)
  - [ ] Extract services for business logic
  - [ ] Extract middleware (Auth, RBAC, Validation, Error Handling, Logging)
  - [ ] Create route files with proper organization
  - [ ] Add validation layer and improve error handling

## Phase 6: Notifications

- [X] Implement in-app notification center ([#167](https://github.com/mattstratton/conducky/issues/167))
  - [X] Database schema for notifications (type, priority, read status, action URLs)
  - [X] Backend API endpoints (fetch, mark as read, delete, statistics)
  - [X] Frontend notification center UI with filtering and pagination
  - [X] Automated notification creation for report events
  - [X] Comprehensive test coverage for all notification functionality
- [ ] Integrate flexible transactional email service (supporting multiple providers)
- [ ] Document setup for each supported email provider (e.g., SendGrid, Mailgun, SMTP, etc.)
- [ ] Notify submitters on report submission, acknowledgment, resolution, and updates
- [ ] Notify responders/admins on new/updated reports
- [ ] Make sure the notification template for a new incident includes SLA etc ([#23](https://github.com/mattstratton/conducky/issues/23))

## Phase 7: Audit Logs & Admin Tools

- [ ] Log all actions (who, what, when) to the database
- [ ] Admin UI to view full audit log for an event

## Phase 8: Deployment, Hosting & Documentation

- [ ] Finalize Docker image and deployment scripts
- [ ] Create solution for publshing docker images to docker hub
- [ ] Create process for releases and versioning
- [ ] Evaluate and recommend good, easy, and cheap/free hosting options (e.g., Fly.io, Railway, Render, DigitalOcean, etc.)
- [ ] Document step-by-step setup for each recommended hosting provider
- [ ] Write comprehensive setup documentation (installation, configuration, environment variables, database, email, file storage, etc.)
- [ ] Write user documentation (how to use the system, submit/manage reports, admin features, etc.)
- [ ] Write detailed local development documentation (using Docker, docker-compose, local environment setup, troubleshooting, etc.)
- [ ] Set up publishing of docker images on releases ([#11](https://github.com/mattstratton/conducky/issues/11))
- [ ] Set up for deploy on Render ([#1](https://github.com/mattstratton/conducky/issues/1))

## Phase 8.1: AWS Deployment Checklist

- [ ] Set AWS region as a repo secret/env variable (e.g., `AWS_REGION`) for flexible deployment
- [ ] Document and inject all required backend environment variables:
  - [ ] `PORT` (default: 4000)
  - [ ] `DATABASE_URL` (generated by Pulumi, injected securely)
  - [ ] `JWT_SECRET` (set as GitHub repo secret)
  - [ ] `FRONTEND_BASE_URL` (set to deployed frontend URL)
  - [ ] `SESSION_SECRET` (set as GitHub repo secret)
  - [ ] `CORS_ORIGIN` (set to deployed frontend URL)
- [ ] Document and inject all required frontend environment variables:
  - [ ] `NEXT_PUBLIC_API_URL` (set to deployed backend URL)
- [ ] Use Pulumi to provision Postgres 15 RDS instance (create if not present)
- [ ] Use Pulumi to provision ECR, ECS, and Fargate resources for frontend and backend
- [ ] Enable ECS Exec for both services
- [ ] Make both services public and internet-facing (with load balancers)
- [ ] No custom domain required initially; endpoints should be configurable via env/build vars
- [ ] Pulumi state managed in Pulumi Cloud
- [ ] Application secrets managed as GitHub repo secrets
- [ ] Prisma migrations run automatically in backend entrypoint
- [ ] Failed deploys visible in GitHub Actions
- [ ] Update this checklist and documentation as requirements evolve

## Phase 9: Frontend MVP (Initial UI for Testing)

- [X] Set up API base URL config for frontend (NEXT_PUBLIC_API_URL)
- [X] Implement authentication UI (login/logout)
- [X] Add dashboard page to list reports for an event
- [X] Add report submission form (type, description, evidence upload)
- [X] Add state change controls for authorized users (Responders/Admins)
- [ ] Event page needs to list who the admins and responders are for that event ([#10](https://github.com/mattstratton/conducky/issues/10))

## Phase 10: UI/UX Improvements

- [X] Add a dark mode option using best practices (toggle, system preference, etc.)
  - [X] Review the dark mode text colors and make sure they are the proper contrast against the background color
  - [X] simplfy the dark mode toggle to be a simple toggle button
- [X] Update the entire look and feel to be more elegant and modern (typography, spacing, colors, buttons, etc.)
  - [X] All main pages now use shared Card, Button, Input, and Table components with full dark/light mode support
  - [X] Login, home, dashboard, admin, event, user management, and report detail pages refactored for consistency
  - [X] Dark mode readability improved for all major UI
- [ ] Make the navigation more elegant and user-friendly (improved layout, icons, responsive design) (IN PROGRESS)
  - [X] (Future polish) Add icons to navigation links for visual clarity
  - [X] (Future polish) Animate the mobile menu for a smoother feel
  - [X] (Future polish) Improve spacing, font sizes, and touch targets for even better mobile UX
  - [ ] (Future polish) Add user avatar or profile menu for account actions
  - [ ] (Future polish) Consider sticky/fixed improvements for better scroll behavior
- [X] Add a footer to the bottom of the app with useful information (e.g., version, copyright, GitHub link)
- [ ] Make sure the UI is responsive and works on mobile devices (IN PROGRESS)
  - [X] Audit and update all major pages for mobile (login, home, dashboard, event, admin, user management, report detail)
  - [X] Audit and update all shared components (Card, Table, Button, Input) for mobile
  - [X] Make tables horizontally scrollable on small screens if needed
  - [X] Ensure forms and buttons are touch-friendly
  - [ ] Adjust font sizes and spacing for readability
  - [X] Make modals and overlays usable on mobile
  - [ ] Test navigation and all actions on mobile
- [ ] Ensure we are using best practices for accessibility (aria-labels, focus management, keyboard navigation, etc.) (to be done later)
- [ ] Ensure a delightful mobile experience ([#13](https://github.com/mattstratton/conducky/issues/13))

## UI/UX Responsive Design Standards (for all new pages)

- Use **Card layout** for lists and data on mobile (below `sm:`), and **Table layout** for desktop (`sm:` and up) for data-heavy views.
- All Card containers should use responsive padding: `p-4 sm:p-8`.
- All buttons and inputs should use responsive sizing: `px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm` for comfortable touch targets on mobile and compactness on desktop.
- Ensure all forms, tables, and actions are touch-friendly and readable on mobile (adequate spacing, font size, and tap targets).
- Make tables horizontally scrollable on small screens if needed.
- When adding new pages or layouts, always audit for these standards to ensure a consistent, modern, and accessible experience across devices.

## Event Metadata Display & UX Improvements

- [X] Display event metadata at the top of the event page (logo, name, dates, website, description, code of conduct link)
- [X] Render logo as an image if present
- [X] Show 'View Code of Conduct' link that opens a modal with rendered markdown
- [X] If user is Admin or SuperAdmin, show pencil icons for inline editing of each field
- [X] Allow inline editing and PATCH updates for all fields on the event page
- [ ] Extract shared component for metadata display/edit if needed
- [X] Ensure layout is responsive and accessible
- [X] Update documentation in /docs to reflect new metadata editing features

## Enhanching the report submission form

- [X] Enhance the report submission form
  - [X] Add a date and time of incident field
  - [X] Add a field for parties involved
  - [X] Update backend and frontend to support new fields
  - [X] Update docs for report submission changes

## Other/Architecture

- [ ] Consider adding support for "orgs" ([#18](https://github.com/mattstratton/conducky/issues/18))
- [ ] Remove Superadmin access to reports etc ([#17](https://github.com/mattstratton/conducky/issues/17))
- [ ] Remove event constraint ([#16](https://github.com/mattstratton/conducky/issues/16))
- [ ] Should event slugs be editable? ([#15](https://github.com/mattstratton/conducky/issues/15))
- [ ] Figure out what happens if the superadmin also needs to be a user for an event ([#14](https://github.com/mattstratton/conducky/issues/14))
- [ ] Investigate anonymous reporting ([#12](https://github.com/mattstratton/conducky/issues/12))

## Report Comments - Completed

- [x] Slug-based comment endpoints implemented in backend
- [x] Edit and delete permissions enforced in backend (author can edit/delete, admin can delete)
- [x] Internal/external (visibility) comment logic enforced in backend and frontend
- [x] Frontend UI for editing and deleting comments (inline, with confirmation)

## Planned Features for Report Comments

- [ ] If a comment has been edited, it should be marked so users know it was edited.
- [ ] All edits or deletions of comments should be stored in the audit log (pending audit log implementation).

## Future Refactors & Technical Debt

- [ ] Refactor report detail pages (reporter and admin/responder) to use shared components for report metadata, evidence, and comments. Minimize code duplication and use role-based conditional rendering where possible, while keeping security and clarity. (Add after initial admin/responder UI is complete)

## New Checklist Item

- [x] Frontend: Allow event admins to edit contact email and display it on event home page ([#71](https://github.com/mattstratton/conducky/issues/71))

## User Avatars (Issue #32)

- [x] Update Prisma schema: add UserAvatar model, relation to User
- [x] Backend: endpoints for upload, fetch, update, delete avatar
- [x] Backend: refactor file upload/storage logic for avatars, event logos, evidence files (shared utilities, per-type restrictions)
- [x] Backend: /session and user fetch endpoints include avatarUrl
- [x] Frontend: create user profile/settings page for avatar management (upload, remove, preview; uses Avatar component)
- [x] Frontend: reusable Avatar component (image or initials fallback)
- [X] Frontend: display Avatar in nav bar, CoC team list, report comments
- [X] Docs: update documentation in /website/docs in the appropriate guides for avatar usage, upload/removal, and restrictions
- [X] Tests: backend and frontend tests for avatar upload, removal, fallback
- [X] All errors are logged to the console or the server logs as appropriate, with informative messages
- [X] Review and update all new user profile related pages for dark mode and mobile responsiveness

## Testing improvments

- [ ] Make a list of all pages and use cases to test manually (user experience testing)
- [ ] Remove all DEBUG from the existing tests

---

**Notes:**

- Local development will be done using Docker and docker-compose, running all services locally in containers for consistency and ease of onboarding.
- **When installing new npm packages or running dev commands, always use Docker Compose (e.g., `docker compose exec frontend npm install <package>`) to ensure the container environment is up to date. Do not run npm install directly on the host.**
- Be sure to remember that we always want to optimize for mobile experience
- We also want to make sure that everything is styled properly for dark mode
- Each phase can be broken down further as needed.
- We will iterate and adjust the plan as requirements evolve or new needs are discovered.
- Documentation will cover both system usage and all aspects of setup, configuration, local development, and hosting.
- Documentation should be written in markdown and stored in the docs directory
- Documentation should be separated into user and developer documentation

