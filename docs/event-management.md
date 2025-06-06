# Event Management

This document explains how events are managed in the system, both via the API and the UI.

---

## Event Data Model
- Each event has a unique `id`, `name`, and `slug`.
- Events are related to users (via roles), reports, audit logs, and invite links.
- See `Event` in `schema.prisma`:

```prisma
model Event {
  id             String   @id @default(uuid())
  name           String
  slug           String   @unique
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  userEventRoles UserEventRole[]
  reports        Report[]
  auditLogs      AuditLog[]
  inviteLinks    EventInviteLink[]
}
```

---

## Creating Events
- Only Global Admins (SuperAdmins) can create new events.
- **API:**
  - `POST /events` with `{ name, slug }` (slug must be unique, lowercase, URL-safe)
- **UI:**
  - Use the "Global Admin" (Admin) page to create a new event.

---

## Listing Events
- **API:**
  - `GET /events` (SuperAdmin only)
- **UI:**
  - The Admin page lists all events for SuperAdmins.

---

## Event Permissions
- Each event can have Admins, Responders, and Reporters.
- Only Admins or SuperAdmins can manage users, invite links, and reports for an event.
- Roles are managed via the user management UI or API endpoints.

---

## Event Slugs
- Slugs are used in URLs (e.g., `/event/[slug]`).
- Must be unique, lowercase, and contain only letters, numbers, and hyphens.

---

## Related Endpoints
- See [API Endpoints](./api-endpoints.md) for full details.
- Key endpoints:
  - `POST /events` (create)
  - `GET /events` (list)
  - `GET /event/slug/:slug` (details)
  - `GET /events/slug/:slug/users` (list users)
  - `GET /events/slug/:slug/invites` (list invites)

---

## Notes
- Only SuperAdmins can create events.
- Event admins can manage users and invites for their event.
- All actions are logged in the audit log (see backend). 