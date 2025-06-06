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

## Inline Editing of Event Metadata (Main Event Page)

Admins and SuperAdmins can now edit event metadata directly from the main event page (`/event/[slug]`) using an inline editing interface. This feature improves usability and allows for quick updates to event details without navigating to the admin page.

### Editable Fields
- **Name**
- **Logo** (URL to image)
- **Start Date**
- **End Date**
- **Website**
- **Description**
- **Code of Conduct** (Markdown supported)

### Who Can Edit
- Only users with the `Admin` or `SuperAdmin` role for the event will see pencil icons next to each metadata field.
- Non-admin users and anonymous visitors cannot edit event metadata and will not see the edit icons.

### How It Works
- Click the pencil icon next to a field to enable inline editing.
- Edit the value and click the checkmark to save, or the X to cancel.
- Changes are saved via a PATCH request to the backend (`PATCH /events/slug/:slug`).
- Success and error messages are displayed inline.
- All changes are immediately reflected in the UI upon success.
- The interface is fully responsive and supports dark mode.

### Code of Conduct
- The Code of Conduct field supports Markdown formatting.
- All users can view the rendered Code of Conduct in a modal by clicking the "View Code of Conduct" link at the top of the event page.
- Admins can edit the Code of Conduct inline using the same pencil icon/edit/save/cancel pattern.

---

## Event Logo Upload

Admins and SuperAdmins can upload a custom logo image for each event. This logo is displayed at the top of the event page and can be changed at any time.

### Who Can Upload
- Only users with the `Admin` or `SuperAdmin` role for the event can upload or change the logo.

### How to Upload (UI)
- On the event page (if you are an Admin/SuperAdmin), click the pencil icon next to the logo.
- You can choose to upload a new image file as the event logo.
- The uploaded logo will be shown as a preview and saved when you confirm.
- The logo is displayed at the top of the event page for all users.

### How to Upload (API)
- Use the endpoint `POST /events/slug/:slug/logo` with `multipart/form-data` and a `logo` file field.
- On success, the event's `logo` field will be updated with the file path.

### Where Files Are Stored
- Uploaded logo files are stored on the backend server in `/uploads/event-logos/`.
- The event's `logo` field contains the relative path to the file.

### Future Extensibility
- In the future, logo uploads may be stored in external storage (e.g., S3) instead of the local filesystem.
- The API and UI are designed to allow for this change with minimal disruption.

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