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

## Phase 4: Report Submission & Management
- [~] Design and implement report submission form (with all required fields)
   - [ ] Add a date and time of incident field to the report submission form
   - [ ] Add a field for parties involved
- [ ] Reports need the ability to have ongoing updates in text from the reporter, responder, and admin
- [ ] Reports should have a field for the resolution of the incident
- [~] Support evidence file uploads (currently one file per report; will add multiple files and cloud storage options such as S3 in the future)
- [X] Implement report state machine (submitted, acknowledged, investigating, resolved, closed) ([#6](https://github.com/mattstratton/conducky/issues/6))
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
- [ ] Evaluate and recommend good, easy, and cheap/free hosting options (e.g., Fly.io, Railway, Render, DigitalOcean, etc.)
- [ ] Document step-by-step setup for each recommended hosting provider
- [ ] Write comprehensive setup documentation (installation, configuration, environment variables, database, email, file storage, etc.)
- [ ] Write user documentation (how to use the system, submit/manage reports, admin features, etc.)
- [ ] Write detailed local development documentation (using Docker, docker-compose, local environment setup, troubleshooting, etc.)
- [ ] Prepare for production deployment (security, backups, etc.)

## Phase 8: Frontend MVP (Initial UI for Testing)
- [X] Set up API base URL config for frontend (NEXT_PUBLIC_API_URL)
- [X] Implement authentication UI (login/logout)
- [X] Add dashboard page to list reports for an event
- [X] Add report submission form (type, description, evidence upload)
- [X] Add state change controls for authorized users (Responders/Admins)

---

**Notes:**
- Local development will be done using Docker and docker-compose, running all services locally in containers for consistency and ease of onboarding.
- Each phase can be broken down further as needed.
- We will iterate and adjust the plan as requirements evolve or new needs are discovered.
- Documentation will cover both system usage and all aspects of setup, configuration, local development, and hosting. 
