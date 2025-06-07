# Backend API Endpoints

This document describes all API endpoints provided by the backend Express server.

---

## Authentication

### Register
- **POST** `/register`
- **Description:** Register a new user. The first user becomes Global Admin (SuperAdmin).
- **Body:** `{ email, password, name }`
- **Response:** `{ message, user, madeSuperAdmin }`

### Login
- **POST** `/login`
- **Description:** Log in with email and password.
- **Body:** `{ email, password }`
- **Response:** `{ message, user }`

### Logout
- **POST** `/logout`
- **Description:** Log out the current user.
- **Response:** `{ message }`

### Session Check
- **GET** `/session`
- **Description:** Get current session user and roles.
- **Response:** `{ user: { id, email, name, roles } }` or 401 if not authenticated

---

## Events

### Create Event
- **POST** `/events`
- **Role:** SuperAdmin only
- **Body:** `{ name, slug }`
- **Response:** `{ event }`

### List Events
- **GET** `/events`
- **Role:** SuperAdmin only
- **Response:** `{ events }`

### Get Event Details
- **GET** `/events/:eventId`
- **Role:** Admin or SuperAdmin for the event
- **Response:** `{ event }`

### Get Event by Slug
- **GET** `/event/slug/:slug`
- **Description:** Get event details by slug (public)
- **Response:** `{ event }`

### List Users for Event (by Slug)
- **GET** `/events/slug/:slug/users`
- **Role:** Admin or SuperAdmin for the event
- **Query Parameters:**
  - `search` (string, optional): Filter users by name or email (case-insensitive, partial match)
  - `sort` (string, optional): Sort by `name`, `email`, or `role` (default: `name`)
  - `order` (string, optional): Sort order, `asc` or `desc` (default: `asc`)
  - `page` (integer, optional): Page number for pagination (default: 1)
  - `limit` (integer, optional): Number of users per page (default: 10)
  - `role` (string, optional): Filter users by event role (`Admin`, `Responder`, `Reporter`)
- **Response:** `{ users: [...], total: <number> }`
- **Notes:**
  - All query parameters can be combined for advanced filtering, sorting, and navigation.
  - The `total` field gives the total number of users matching the filters (for pagination UI).

### Update Event (by Slug)
- **PATCH** `/events/slug/:slug`
- **Role:** SuperAdmin only
- **Body:** `{ name, newSlug }` (at least one required)
- **Response:** `{ event }`
- **Notes:**
  - Updates the event's name and/or slug.
  - If `newSlug` is provided and already exists, returns 409 error.
  - Returns 404 if event not found.
  - Returns 400 if neither field is provided.

### Upload Event Logo
- **POST** `/events/slug/:slug/logo`
- **Role:** Admin or SuperAdmin for the event
- **Description:** Upload a new logo image for the event. Stores the file in the database and updates the event's `logo` field with the GET endpoint URL.
- **Body:** `multipart/form-data` with a `logo` file field
- **Response:** `{ event }` (updated event object)
- **Notes:**
  - Only Admins/SuperAdmins can upload/change the logo.
  - The file is stored in the database as a BLOB in the `EventLogo` table.
  - The `logo` field in the event will be set to `/events/slug/:slug/logo`.

### Get Event Logo
- **GET** `/events/slug/:slug/logo`
- **Role:** Public
- **Description:** Fetch the event logo image for display. Returns the image as a binary response with the correct content-type.
- **Response:** Binary image data (or 404 if not found)
- **Notes:**
  - Use this endpoint as the `src` for event logo images in the frontend.

---

## User Management

### List Users for Event
- **GET** `/events/:eventId/users`
- **Role:** Admin or SuperAdmin for the event
- **Response:** `{ users }`

### Assign Role to User
- **POST** `/events/:eventId/roles`
- **Role:** Admin or SuperAdmin for the event
- **Body:** `{ userId, roleName }`
- **Response:** `{ message, userEventRole }`

### Remove Role from User
- **DELETE** `/events/:eventId/roles`
- **Role:** Admin or SuperAdmin for the event
- **Body:** `{ userId, roleName }`
- **Response:** `{ message }`

### List All Users (Global)
- **GET** `/admin/users`
- **Role:** SuperAdmin only
- **Response:** `{ users }`

### Create/Invite User (Global)
- **POST** `/admin/users`
- **Role:** SuperAdmin only
- **Body:** `{ email, name }`
- **Response:** `{ message, user }`

### Update User for Event
- **PATCH** `/events/slug/:slug/users/:userId`
- **Role:** Admin or SuperAdmin for the event
- **Body:** `{ name, email, role }`
- **Response:** `{ message }`

### Remove User from Event
- **DELETE** `/events/slug/:slug/users/:userId`
- **Role:** Admin or SuperAdmin for the event
- **Response:** `{ message }`

---

## Reports

### Submit Report (by Event ID)
- **POST** `/events/:eventId/reports`
- **Description:** Submit a report (anonymous or authenticated). Supports file upload (`evidence`).
- **Body:** `type`, `description`, `evidence` (multipart/form-data), `incidentAt` (optional, ISO date string), `parties` (optional, string)
- **Response:** `{ report }`
- **Notes:**
  - `incidentAt` should be an ISO 8601 date/time string (e.g., `2024-06-06T15:30:00Z`).
  - `parties` can be a comma-separated or freeform list of involved parties.

### List Reports (by Event ID)
- **GET** `/events/:eventId/reports`
- **Response:** `{ reports }`

### Get Report by ID
- **GET** `/events/:eventId/reports/:reportId`
- **Response:** `{ report }`

### Change Report State
- **PATCH** `/events/:eventId/reports/:reportId/state`
- **Role:** Responder, Admin, or SuperAdmin
- **Body:** `{ state }`
- **Response:** `{ report }`

#### Slug-based versions of the above also exist (replace `:eventId` with `slug/:slug`).

### Submit Report (by Event Slug)
- **POST** `/events/slug/:slug/reports`
- **Description:** Submit a report (anonymous or authenticated). Supports file upload (`evidence`).
- **Body:** `type`, `description`, `evidence` (multipart/form-data), `incidentAt` (optional, ISO date string), `parties` (optional, string)
- **Response:** `{ report }`
- **Notes:**
  - `incidentAt` should be an ISO 8601 date/time string (e.g., `2024-06-06T15:30:00Z`).
  - `parties` can be a comma-separated or freeform list of involved parties.

### Report Comments (by Event ID)
- **GET** `/events/:eventId/reports/:reportId/comments`
  - **Description:** List comments for a report. Only authenticated users with access to the event/report can view. Only responders/admins see internal comments.
  - **Response:** `{ comments: [...] }`
- **POST** `/events/:eventId/reports/:reportId/comments`
  - **Description:** Add a comment to a report. Only authenticated users with access to the event/report can add. Only responders/admins can create internal comments.
  - **Body:** `{ body: string, visibility: 'public' | 'internal' }`
  - **Response:** `{ comment }`
- **PATCH** `/events/:eventId/reports/:reportId/comments/:commentId`
  - **Description:** Edit a comment. Only the author or an admin can edit. Only responders/admins can set internal visibility.
  - **Body:** `{ body: string, visibility?: 'public' | 'internal' }`
  - **Response:** `{ comment }`
- **DELETE** `/events/:eventId/reports/:reportId/comments/:commentId`
  - **Description:** Delete a comment. Only the author or an admin can delete.
  - **Response:** `{ message }`
- **Notes:**
  - `visibility: 'public'` means visible to all involved (reporter, responders, admins). `internal` means only responders/admins can see.
  - All endpoints require authentication.

### Report Comments (by Event Slug)
- **GET** `/events/slug/:slug/reports/:reportId/comments`
- **POST** `/events/slug/:slug/reports/:reportId/comments`
- **PATCH** `/events/slug/:slug/reports/:reportId/comments/:commentId`
- **DELETE** `/events/slug/:slug/reports/:reportId/comments/:commentId`
  - **Description, body, response, and notes are the same as the eventId-based endpoints above, but use the event slug in the URL.**

---

## Invites

### List Invite Links for Event
- **GET** `/events/slug/:slug/invites`
- **Role:** Admin or SuperAdmin for the event
- **Response:** `{ invites }`

### Create Invite Link
- **POST** `/events/slug/:slug/invites`
- **Role:** Admin or SuperAdmin for the event
- **Body:** `{ maxUses, expiresAt, note }`
- **Response:** `{ invite }`

### Disable/Update Invite Link
- **PATCH** `/events/slug/:slug/invites/:inviteId`
- **Role:** Admin or SuperAdmin for the event
- **Body:** `{ disabled, note, expiresAt, maxUses }`
- **Response:** `{ invite }`

### Redeem Invite Link (Register)
- **POST** `/register/invite/:inviteCode`
- **Description:** Register a new user using an invite link.
- **Body:** `{ name, email, password }`
- **Response:** `{ message, user }`

### Get Invite Details
- **GET** `/invites/:code`
- **Description:** Get invite and event info for a code.
- **Response:** `{ invite, event }`

---

## Roles

### List All Roles
- **GET** `/admin/roles`
- **Role:** SuperAdmin only
- **Response:** `{ roles }`

---

## Miscellaneous

### Audit Test
- **GET** `/audit-test`
- **Description:** Triggers a test audit event (for development).
- **Response:** `{ message }`

### Admin-Only Test
- **GET** `/admin-only`
- **Role:** Admin for any event
- **Response:** `{ message, user }`

---

## Notes
- All endpoints return JSON.
- Most endpoints require authentication; some require specific roles.
- For file uploads, use `multipart/form-data`.
- For more details, see the code or ask the maintainers. 