# User Management

This document describes how users are managed in the system, including registration, login, roles, event membership, and invite links.

---

## User Data Model
- Users have `id`, `email`, `name`, `passwordHash`, and timestamps.
- Users are related to events via roles (Reporter, Responder, Admin, SuperAdmin).
- See `User` and `UserEventRole` in `schema.prisma`.

---

## Registration & Login
- **Register:**
  - `POST /register` (first user becomes SuperAdmin)
  - `POST /register/invite/:inviteCode` (register via invite link, becomes Reporter for event)
- **Login:**
  - `POST /login` (email/password)
- **Logout:**
  - `POST /logout`
- **Session:**
  - `GET /session` (get current user and roles)

---

## Roles
- Roles: Reporter, Responder, Admin, SuperAdmin
- Roles are assigned per event (except SuperAdmin, which is global)
- Roles are managed via the Admin UI or API

---

## Adding Users to Events
- **Via UI:**
  - Event Admins can add users to their event, assign roles, or remove users
- **Via API:**
  - `POST /events/:eventId/roles` (assign role)
  - `DELETE /events/:eventId/roles` (remove role)
  - `PATCH /events/slug/:slug/users/:userId` (edit user info/role)
  - `DELETE /events/slug/:slug/users/:userId` (remove user from event)

---

## Invite Links
- Event Admins can create invite links for their event
- Invite links can have max uses, expiration, and notes
- **API:**
  - `POST /events/slug/:slug/invites` (create)
  - `GET /events/slug/:slug/invites` (list)
  - `PATCH /events/slug/:slug/invites/:inviteId` (disable/update)
  - `POST /register/invite/:inviteCode` (register via invite)
  - `GET /invites/:code` (get invite details)
- **UI:**
  - Event Admin page has an Invite Links section
  - Users can register via invite link and join as Reporter

---

## Editing & Removing Users
- Event Admins can edit user name, email, and role for their event
- Removing a user from an event removes all their roles for that event

---

## Global User Management
- SuperAdmins can list, search, and create/invite users globally via `/admin/users` endpoints

---

## Notes
- All user actions are subject to role-based access control
- See [API Endpoints](./api-endpoints.md) for details 