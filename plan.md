# Project Plan: Code of Conduct Report Management System

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
- [ ] User invite links for an event should be able to be set to the role (ie. Reporter, Responder, Admin)

## Phase 2.5: Event Management UI
- [ ] The list of users on the event page should be sortable and searchable
    - [X] Backend: Add support for search (by name/email) to /events/slug/:slug/users endpoint
    - [X] Backend: Add support for sorting (by name/email/role) to /events/slug/:slug/users endpoint
    - [X] Frontend: Add search input and sort controls to user list UI
    - [ ] Frontend: Wire up search and sort controls to backend API
- [ ] The list of users on the event page should paginate
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
- [ ] Add metadata to the event (name, description, logo, etc.)
  - [ ] Events should have their code of conduct available (markdown)
  - [ ] Events shoudl have their dates of the event
  - [ ] Events should have a field for the website for the event

## Phase 4: Report Submission & Management
- [~] Design and implement report submission form (with all required fields)
   - [ ] Add a date and time of incident field to the report submission form
   - [ ] Add a field for parties involved
- [ ] Reports need the ability to have ongoing updates in text from the reporter, responder, and admin
- [ ] Reports should have a field for the resolution of the incident
- [~] Support evidence file uploads (currently one file per report; will add multiple files and cloud storage options such as S3 in the future)
- [X] Implement report state machine (submitted, acknowledged, investigating, resolved, closed) ([#6](https://github.com/mattstratton/conducky/issues/6))
- [X] Dashboard as currently implemented is not appropriate, we should remove the dashboard and have a page for each event that shows the reports for that event
  - [X] The report page seems to be under a directory called dashboard/report/[id] and that doesn't seem right in the new design
- [ ] Admin/Responder UI for managing and responding to reports

## Phase 5: Notifications
- [ ] Integrate flexible transactional email service (supporting multiple providers)
- [ ] Document setup for each supported email provider (e.g., SendGrid, Mailgun, SMTP, etc.)
- [ ] Notify submitters on report submission, acknowledgment, resolution, and updates
- [ ] Notify responders/admins on new/updated reports

## Phase 6: Audit Logs & Admin Tools
- [ ] Log all actions (who, what, when) to the database
- [ ] Admin UI to view full audit log for an event

## Phase 7: Deployment, Hosting & Documentation
- [ ] Finalize Docker image and deployment scripts
- [ ] Create solution for publshing docker images to docker hub
- [ ] Create process for releases and versioning
- [ ] Evaluate and recommend good, easy, and cheap/free hosting options (e.g., Fly.io, Railway, Render, DigitalOcean, etc.)
- [ ] Document step-by-step setup for each recommended hosting provider
- [ ] Write comprehensive setup documentation (installation, configuration, environment variables, database, email, file storage, etc.)
- [ ] Write user documentation (how to use the system, submit/manage reports, admin features, etc.)
- [ ] Write detailed local development documentation (using Docker, docker-compose, local environment setup, troubleshooting, etc.)

## Phase 8: Frontend MVP (Initial UI for Testing)
- [X] Set up API base URL config for frontend (NEXT_PUBLIC_API_URL)
- [X] Implement authentication UI (login/logout)
- [X] Add dashboard page to list reports for an event
- [X] Add report submission form (type, description, evidence upload)
- [X] Add state change controls for authorized users (Responders/Admins)

## Phase 9: UI/UX Improvements
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

## UI/UX Responsive Design Standards (for all new pages)

- Use **Card layout** for lists and data on mobile (below `sm:`), and **Table layout** for desktop (`sm:` and up) for data-heavy views.
- All Card containers should use responsive padding: `p-4 sm:p-8`.
- All buttons and inputs should use responsive sizing: `px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm` for comfortable touch targets on mobile and compactness on desktop.
- Ensure all forms, tables, and actions are touch-friendly and readable on mobile (adequate spacing, font size, and tap targets).
- Make tables horizontally scrollable on small screens if needed.
- When adding new pages or layouts, always audit for these standards to ensure a consistent, modern, and accessible experience across devices.

---

**Notes:**
- Local development will be done using Docker and docker-compose, running all services locally in containers for consistency and ease of onboarding.
- Each phase can be broken down further as needed.
- We will iterate and adjust the plan as requirements evolve or new needs are discovered.
- Documentation will cover both system usage and all aspects of setup, configuration, local development, and hosting. 
- Documentation should be written in markdown and stored in the docs directory
- Documentation should be separated into user and developer documentation

