# 📌 Conducky Project – GitHub Issue Tracker Setup

This file defines the core features, bugs, enhancements, and UI tasks discussed for the Conducky project. Each task below is formatted for easy conversion into GitHub issues or project board cards.

---

## 🧱 Core Functional Features

### 🚩 Feature: Multi-Tenancy Support
**Description**: Enable Conducky to support multiple isolated tenants, such as different events or organizations, on shared infrastructure.
- [ ] Implement isolated tenant boundaries.
- [ ] Allow optional single-tenant (standalone) deployments.
- [ ] Prevent visibility across tenants.

---

### 🚩 Feature: Role-Based Access Control (RBAC)
**Description**: Define and enforce access rights based on roles.
- [ ] Define roles: Super Admin, Event Admin, Responder, Reporter.
- [ ] Restrict Super Admin rights to infra-level only (no data access).
- [ ] Show event-level visibility of responders/admins on report submission pages.

---

### 🚩 Feature: Anonymous and Authenticated Reporting
**Description**: Allow both anonymous and authenticated users to submit reports securely.
- [ ] Support anonymous reporting with session fallback logic.
- [ ] Tie authenticated reports to reporter identity for follow-up.
- [ ] Add a toggle for "invite-only submission" vs "open submission".

---

### 🚩 Feature: Event Lifecycle Management
**Description**: Manage event identifiers, activation status, and access controls.
- [ ] Lock event slugs post-creation.
- [ ] Allow toggling events on/off (for temporal reporting access).
- [ ] Allow multiple invite links per event with:
  - [ ] Expiration dates
  - [ ] Maximum uses
  - [ ] Human-readable notes/labels

---

## 🧩 Reporting & Case Management

### 📝 Feature: Report and Incident Lifecycle
**Description**: Design incident reporting system with scoped visibility and progress tracking.
- [ ] Tie report to user ID or anonymous token.
- [ ] Implement state machine for incident status.
- [ ] Display reports only within the relevant event scope.

---

### 📝 Feature: Comments System for Reports
**Description**: Provide internal and external discussions with auditability.
- [ ] Enable internal (private) and external (visible to reporter) comments.
- [ ] Restrict comment editing to the author only.
- [ ] Allow only admins to delete comments.
- [ ] Record full audit logs for all activity (comments, edits, deletions).
- [ ] Add support for:
  - [ ] Markdown in comments
  - [ ] Quoting previous comments
  - [ ] Anchor links to specific comments

---

## 🛠️ Platform Enhancements

### 🛠️ Issue: Fix Role Permissions Bugs
**Description**: Enforce correct permission levels for roles like Super Admin.
- [ ] Prevent Super Admin from viewing data within tenants.
- [ ] Ensure session loss doesn't result in improper anonymous reports.
- [ ] Ensure role-based UI options appear correctly.

---

### 🛠️ Enhancement: Improve Comment System Scalability
**Description**: Ensure large-scale comment threads remain usable.
- [ ] Add pagination for comments on each incident.
- [ ] Add filtering (internal vs external).
- [ ] Add full-text search on comments.

---

### 🔐 Feature: Harassment and Abuse Mitigation
**Description**: Allow teams to toggle openness of reports to reduce harassment risks.
- [ ] Toggleable invite-only submission mode.
- [ ] Expirable and revocable invite links.
- [ ] Documentation and guidance on safe usage.
- [ ] Involve DEI advocates in feature validation.

---

## 🖥️ UI/UX Improvements

### 🎨 Task: Public Visibility Controls
**Description**: Limit exposure of event/report lists to unauthorized users.
- [ ] Homepage should not show any events/reports without authentication.

### 🎨 Task: Admin Interface Cleanup
**Description**: Improve layout and editability of admin pages.
- [ ] Modal-based editors for editing fields (e.g., Code of Conduct).
- [ ] Streamline editing of events, links, and configurations.

### 🎨 Task: Reporting Entry Point
**Description**: Make report submission intuitive.
- [ ] Add prominent "Report" button on event page.
- [ ] Allow embeddable link from external CoC policies (e.g., "Click here to report").

---

## 📅 Future Milestones

- [ ] Reusable slugs for annual events (e.g., DevOpsDaysChicago2024).
- [ ] Per-event toggling of reporting availability.
- [ ] Roleplay UX testing for full report/response lifecycle.
- [ ] Finalize MVP and begin onboarding target users for feedback.