---
sidebar_position: 2
---

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

### User Avatars

- **POST** `/users/:userId/avatar`
  - **Description:** Upload or change the avatar for the specified user. Only the user themselves can upload/change their avatar.
  - **Body:** `multipart/form-data` with an `avatar` file field (PNG or JPG, max 2MB)
  - **Response:** `{ success: true, avatarId }` on success
  - **Errors:** 401 if not authenticated or not the user, 400 if no file or invalid type/size

- **GET** `/users/:userId/avatar`
  - **Description:** Fetch the avatar image for the specified user. Returns the image as binary data with the correct content-type. Returns 404 if the user has no avatar.
  - **Response:** Binary image data

- **DELETE** `/users/:userId/avatar`
  - **Description:** Remove the avatar for the specified user. Only the user themselves can delete their avatar.
  - **Response:** 204 No Content on success
  - **Errors:** 401 if not authenticated or not the user

- **Notes:**
  - The `avatarUrl` field in user objects (e.g., `/session`, `/events/slug/:slug/users`, report comments) will be set to `/users/:userId/avatar` if the user has an avatar, or `null` otherwise.
  - The frontend will prepend the API base URL to this path as needed.

---

## Reports

### Submit Report (by Event ID)
- **POST** `/events/:eventId/reports`
- **Description:** Submit a report (anonymous or authenticated). Supports multiple file uploads (`evidence[]`).
- **Body:** `type`, `description`, `evidence[]` (multipart/form-data, zero or more files), `incidentAt` (optional, ISO date string), `parties` (optional, string)
- **Response:** `{ report }`
- **Notes:**
  - You can upload multiple evidence files at report creation. Each file is stored and linked to the report.
  - `incidentAt` should be an ISO 8601 date/time string (e.g., `2024-06-06T15:30:00Z`).
  - `parties` can be a comma-separated or freeform list of involved parties.
  - Each evidence file is associated with the uploader (if authenticated).

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

### Get Report by Slug (with Access Control)
- **GET** `/events/slug/:slug/reports/:reportId`
- **Description:** Get report details by event slug and report ID.
- **Access Control:** Only the following users can access this endpoint:
  - The reporter (user who submitted the report)
  - Responders for the event
  - Admins for the event
- **Error Responses:**
  - 401 if not authenticated
  - 403 if authenticated but not authorized (not the reporter or event responder/admin)
  - 404 if the report or event does not exist
- **Response:** `{ report }`

### List Evidence Files for a Report
- **GET** `/reports/:reportId/evidence`
- **Description:** List all evidence files for a report (metadata only).
- **Access Control:** Reporter, responder, or admin for the event.
- **Response:** `{ files: [ { id, filename, mimetype, size, createdAt, uploader: { id, name, email } } ] }`

### Add Evidence Files to a Report
- **POST** `/reports/:reportId/evidence`
- **Description:** Upload one or more additional evidence files to an existing report (multipart/form-data, field: `evidence[]`).
- **Access Control:** Reporter, responder, or admin for the event.
- **Response:** `{ files: [...] }`

### Download Evidence File
- **GET** `/evidence/:evidenceId/download`
- **Description:** Download a specific evidence file by its ID.
- **Access Control:** Reporter, responder, or admin for the event associated with the report.
- **Response:** Binary file data with correct content-type and filename.

### Submit Report (by Event Slug)
- **POST** `/events/slug/:slug/reports`
- **Description:** Submit a report (anonymous or authenticated). Supports multiple file uploads (`evidence[]`).
- **Body:** `type`, `description`, `evidence[]` (multipart/form-data, zero or more files), `incidentAt` (optional, ISO date string), `parties` (optional, string)
- **Response:** `{ report }`
- **Notes:**
  - You can upload multiple evidence files at report creation. Each file is stored and linked to the report.
  - Each evidence file is associated with the uploader (if authenticated).

### Report Comments (by Event ID) 