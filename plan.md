# Project Plan: Code of Conduct Report Management System

## Phase 1: Project Setup & Core Infrastructure
- [X] Initialize monorepo/project structure (Next.js frontend, Node.js backend)
- [X] Set up Dockerfile and docker-compose for local development (all services run locally in containers)
- [X] Document local development workflow using Docker (how to start, stop, debug, etc.)
- [~] Configure environment variables and secrets management
- [ ] Set up database schema using ORM (support Postgres & MySQL)
- [X] Implement basic audit logging infrastructure

## Phase 2: Authentication & User Management
- [ ] Implement email/password authentication (including magic link)
- [ ] Integrate social login (Google, GitHub)
- [ ] Support anonymous report submission (with optional email)
- [ ] Implement user roles: Reporter, Responder, Admin, Super Admin
- [ ] Role-based access control (RBAC) middleware

## Phase 3: Multi-Tenancy & Event Management
- [ ] Implement event (tenant) creation and management (Super Admin only)
- [ ] Isolate users, reports, and roles per event
- [ ] Admin UI for managing event users and roles

## Phase 4: Report Submission & Management
- [ ] Design and implement report submission form (with all required fields)
- [ ] Support evidence file uploads (configurable storage)
- [ ] Allow admins to define custom report types per event
- [ ] Implement report state machine (submitted, acknowledged, investigating, resolved, closed)
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

---

**Notes:**
- Local development will be done using Docker and docker-compose, running all services locally in containers for consistency and ease of onboarding.
- Each phase can be broken down further as needed.
- We will iterate and adjust the plan as requirements evolve or new needs are discovered.
- Documentation will cover both system usage and all aspects of setup, configuration, local development, and hosting. 