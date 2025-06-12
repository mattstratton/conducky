---
sidebar_position: 4
---
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
- On success, the event's `logo` field will be updated to the GET endpoint URL.

### Where Files Are Stored

- Uploaded logo files are stored in the database as BLOBs in the `EventLogo` table.
- The event's `logo` field contains the URL `/events/slug/:slug/logo` to fetch the logo.

### How to Fetch/Display

- Use the endpoint `GET /events/slug/:slug/logo` to fetch the logo image for display.
- If no logo exists, the endpoint returns 404.

### Future Extensibility

- The API and UI are designed to allow for future changes to storage (e.g., S3) with minimal disruption.

---

## Event Slugs

- Slugs are used in URLs (e.g., `/event/[slug]`).
- Must be unique, lowercase, and contain only letters, numbers, and hyphens.

---

## Report Access and Evidence Management

### Report Titles

- Every report must have a **title** (10–70 characters) that summarizes the incident.
- The title is required when submitting a report and is shown in all report lists and detail pages.
- The title can be edited after submission by the reporter or an event admin (not by responders).
- Titles are validated for length and must be concise and descriptive.
- The title is the clickable link to the report detail page in all report tables.

### Who Can View a Report

- Only the following users can view a report detail page:
  - The reporter (the user who submitted the report)
  - Responders for the event
  - Admins for the event
- If you are not logged in, you will see: **"You must be logged in to view this report."**
- If you are logged in but not authorized, you will see: **"You are not authorized to view this report."**

### Evidence File Uploads

- Reports can have multiple evidence files attached.
- Evidence files can be uploaded when submitting a report, or added later from the report detail page.
- **Who can upload evidence:**
  - The reporter (user who submitted the report)
  - Responders for the event
  - Admins for the event
- Each evidence file records the uploader (name/email if authenticated).
- All evidence files are listed on the report detail page, with download links and uploader info.
- Download links point directly to the backend API and will prompt a download or open the file, depending on your browser settings.
- See [API Endpoints](../developer-docs/api-endpoints.md) for technical details on uploading, listing, and downloading evidence files.

---

## Report Assignment, Severity, and Resolution

- Reports can now be assigned to a responder (Admin/Responder/SuperAdmin can assign).
- Each report can have a severity (low, medium, high, critical) set and updated by authorized users.
- When a report is resolved or closed, a resolution field can be filled in to describe the outcome.
- These fields are managed via the Admin/Responder UI and the PATCH /events/slug/:slug/reports/:reportId API endpoint.

---

## Related Endpoints

- See [API Endpoints](../developer-docs/api-endpoints.md) for full details.
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
