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
- [ ] Support anonymous report submission (with optional email) ([#4](https://github.com/mattstratton/conducky/issues/4))
- [X] Implement user roles: Reporter, Responder, Admin, Super Admin
- [X] Role-based access control (RBAC) middleware
- [X] Implement registration, login, logout, and session check endpoints

## Phase 3: Multi-Tenancy & Event Management
- [X] Implement event (tenant) creation and management (Super Admin only)
- [X] List all events (Super Admin only)
- [X] Get event details (Admins of that event)
- [X] Assign/remove roles for users within an event
- [~] Enforce event scoping for all queries (users, reports, etc.)
- [X] List all users and their roles for an event
- [X] List all reports for an event (stub/placeholder)
- [X] Admin UI/API for managing event users and roles

## Phase 4: Report Submission & Management
- [~] Design and implement report submission form (with all required fields)
- [ ] Support evidence file uploads (currently one file per report; will add multiple files and cloud storage options such as S3 in the future)
- [ ] Allow admins to define custom report types per event ([#5](https://github.com/mattstratton/conducky/issues/5))
- [ ] Implement report state machine (submitted, acknowledged, investigating, resolved, closed) ([#6](https://github.com/mattstratton/conducky/issues/6))
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