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

### Register with Invite

- **POST** `/register/invite/:inviteCode`
- **Description:** Register a new user using an invite code. Automatically assigns the role specified in the invite.
- **Body:** `{ email, password, name }`
- **Response:** `{ message, user }`
- **Notes:**
  - Validates the invite code and checks if it's not disabled or expired
  - Automatically assigns the user to the event with the role specified in the invite
  - Increments the invite's use count

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

### Check Email Availability

- **GET** `/auth/check-email`
- **Description:** Check if an email address is available for registration.
- **Query Parameters:** `email` (required)
- **Response:** `{ available: boolean }`

### Password Reset

- **POST** `/auth/forgot-password`
- **Description:** Request a password reset token via email.
- **Body:** `{ email }`
- **Response:** `{ message }`

- **POST** `/auth/reset-password`
- **Description:** Reset password using a valid token.
- **Body:** `{ token, newPassword }`
- **Response:** `{ message }`

- **GET** `/auth/validate-reset-token`
- **Description:** Validate a password reset token.
- **Query Parameters:** `token` (required)
- **Response:** `{ valid: boolean, email?: string }`

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
- **Note:** This endpoint uses the singular "event" path for backward compatibility. Frontend pages use `/events/[eventSlug]/` URLs but call this API endpoint.

### Get User Roles for Event

- **GET** `/events/slug/:slug/my-roles`
- **Description:** Get the authenticated user's roles for a specific event.
- **Authentication:** Required
- **Response:** `{ roles: [...] }`

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
- **Body:** `{ name, newSlug, description, logo, startDate, endDate, website, codeOfConduct, contactEmail }` (at least one required)
- **Response:** `{ event }`
- **Notes:**
  - Updates the event's metadata fields.
  - If `newSlug` is provided and already exists, returns 409 error.
  - Returns 404 if event not found.
  - Returns 400 if no fields are provided for update.

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

## Profile Management

### Update Profile

- **PATCH** `/users/me/profile`
- **Description:** Update the authenticated user's profile information.
- **Authentication:** Required
- **Body:** `{ name, email }` (at least one required)
- **Response:** `{ message, user }`
- **Notes:**
  - Email must be unique if provided
  - Returns 400 if email is already taken by another user

### Change Password

- **PATCH** `/users/me/password`
- **Description:** Change the authenticated user's password.
- **Authentication:** Required
- **Body:** `{ currentPassword, newPassword }`
- **Response:** `{ message }`
- **Notes:**
  - Validates current password before allowing change
  - Returns 400 if current password is incorrect

### Get User Events

- **GET** `/api/users/me/events`
- **Description:** Get all events the authenticated user has access to with their roles.
- **Authentication:** Required
- **Response:** `{ events: [...] }`

### Leave Event

- **DELETE** `/users/me/events/:eventId`
- **Description:** Remove the authenticated user from an event (leave event).
- **Authentication:** Required
- **Response:** `{ message }`

---

## Reports

### Cross-Event Reports

- **GET** `/api/users/me/reports`
- **Description:** Get reports across all events the authenticated user has access to. Provides role-based filtering and comprehensive search/filter capabilities.
- **Authentication:** Required (401 if not authenticated)
- **Query Parameters:**
  - `page` (integer, optional): Page number for pagination (default: 1, min: 1)
  - `limit` (integer, optional): Number of reports per page (default: 50, min: 1, max: 100)
  - `search` (string, optional): Search across report titles, descriptions, and reporter names
  - `status` (string, optional): Filter by report status (`submitted`, `acknowledged`, `investigating`, `resolved`, `closed`)
  - `eventId` (string, optional): Filter by specific event ID
  - `assignedTo` (string, optional): Filter by assignment status:
    - `me`: Reports assigned to the current user
    - `unassigned`: Reports with no assignee
    - `others`: Reports assigned to other users
  - `sortBy` (string, optional): Sort field (`title`, `createdAt`, `status`) (default: `createdAt`)
  - `sortOrder` (string, optional): Sort direction (`asc`, `desc`) (default: `desc`)
- **Response:** `{ reports: [...], pagination: { page, limit, total, totalPages } }`
- **Access Control:**
  - **Reporters**: See only their own reports across all events
  - **Responders**: See all reports in events where they're responders, plus their own reports in other events
  - **Admins**: See all reports in events where they're admins, plus role-appropriate reports in other events
- **Report Data Includes:**
  - Full report details (title, description, status, dates, etc.)
  - Event information (name, slug)
  - Reporter information (name, email, avatar)
  - Assigned responder information (if assigned)
  - Evidence file count
  - Comment count (internal/external based on permissions)
- **Notes:**
  - All query parameters can be combined for advanced filtering
  - Pagination is enforced with validation (max 100 items per page)
  - Search is case-insensitive and supports partial matches
  - Results are ordered by creation date (newest first) by default
  - Role-based access control is enforced at the database level

### Submit Report (by Event ID)

- **POST** `/events/:eventId/reports`
- **Description:** Submit a report (anonymous or authenticated). Supports multiple file uploads (`evidence[]`).
- **Body:** `title` (string, required, 10–70 chars), `type`, `description`, `evidence[]` (multipart/form-data, zero or more files), `incidentAt` (optional, ISO date string), `parties` (optional, string)
- **Response:** `{ report }`
- **Notes:**
  - The `title` field is required and must be between 10 and 70 characters.
  - You can upload multiple evidence files at report creation. Each file is stored and linked to the report.
  - `incidentAt` should be an ISO 8601 date/time string (e.g., `2024-06-06T15:30:00Z`).
  - `parties` can be a comma-separated or freeform list of involved parties.
  - Each evidence file is associated with the uploader (if authenticated).

### Submit Report (by Event Slug)

- **POST** `/events/slug/:slug/reports`
- **Description:** Submit a report (anonymous or authenticated). Supports multiple file uploads (`evidence[]`).
- **Body:** `title` (string, required, 10–70 chars), `type`, `description`, `evidence[]` (multipart/form-data, zero or more files), `incidentAt` (optional, ISO date string), `parties` (optional, string)
- **Response:** `{ report }`
- **Notes:**
  - Same functionality as the event ID version but uses event slug
  - You can upload multiple evidence files at report creation. Each file is stored and linked to the report.
  - Each evidence file is associated with the uploader (if authenticated).

### List Reports (by Event ID)

- **GET** `/events/:eventId/reports`
- **Response:** `{ reports }`

### List Reports (by Event Slug)

- **GET** `/events/slug/:slug/reports`
- **Description:** List all reports for an event by slug with optional filtering.
- **Query Parameters:**
  - `userId` (string, optional): Filter reports by specific user ID
- **Response:** `{ reports }`
- **Notes:**
  - Returns reports ordered by creation date (newest first)
  - Includes full report details with reporter, assignedResponder, and evidenceFiles

### Get Report by ID

- **GET** `/events/:eventId/reports/:reportId`
- **Response:** `{ report }`

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

### Update Report

- **PATCH** `/events/slug/:slug/reports/:reportId`
- **Description:** Update report assignment, severity, resolution, or state.
- **Role:** Responder, Admin, or SuperAdmin for the event
- **Body:** `{ assignedResponderId, severity, resolution, state }` (at least one required)
- **Response:** `{ report }`
- **Notes:**
  - Creates notifications when reports are assigned
  - Only responders/admins can update reports
  - Returns 400 if no fields provided for update

### Edit Report Title (by Event Slug)

- **PATCH** `/events/slug/:slug/reports/:reportId/title`
- **Description:** Edit the title of a report. Only the reporter or an event admin can edit the title.
- **Body:** `{ title }` (string, required, 10–70 chars)
- **Response:** `{ report }`
- **Notes:**
  - Returns 403 if the user is not authorized to edit the title.
  - Returns 400 if the title is missing or invalid.

### Change Report State

- **PATCH** `/events/:eventId/reports/:reportId/state`
- **Role:** Responder, Admin, or SuperAdmin
- **Body:** `{ state }`
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

### Delete Evidence File

- **DELETE** `/evidence/:evidenceId`
- **Description:** Delete a specific evidence file by its ID.
- **Access Control:** Reporter, responder, or admin for the event associated with the report.
- **Response:** `{ message }`

---

## Invite Management

### Get Invite Details

- **GET** `/invites/:code`
- **Description:** Get invite details and associated event information by invite code.
- **Response:** `{ invite, event }`
- **Notes:**
  - Returns 404 if invite not found
  - Public endpoint for validating invite codes

### List Event Invites

- **GET** `/events/slug/:slug/invites`
- **Role:** Admin or SuperAdmin for the event
- **Description:** List all invite links for an event.
- **Response:** `{ invites }`

### Create Event Invite

- **POST** `/events/slug/:slug/invites`
- **Role:** Admin or SuperAdmin for the event
- **Description:** Create a new invite link for an event.
- **Body:** `{ roleId, expiresAt?, maxUses?, note? }`
- **Response:** `{ invite }`

### Update Event Invite

- **PATCH** `/events/slug/:slug/invites/:inviteId`
- **Role:** Admin or SuperAdmin for the event
- **Description:** Update an existing invite link (enable/disable, change limits, etc.).
- **Body:** `{ disabled?, expiresAt?, maxUses?, note? }`
- **Response:** `{ invite }`

### Redeem Invite

- **POST** `/invites/:code/redeem`
- **Description:** Redeem an invite code (for already registered users).
- **Authentication:** Required
- **Response:** `{ message }`
- **Notes:**
  - Adds the authenticated user to the event with the invite's specified role
  - Increments the invite's use count

---

## Dashboard & Analytics

### Quick Stats

- **GET** `/api/users/me/quickstats`
- **Description:** Get quick statistics for the authenticated user's dashboard.
- **Authentication:** Required
- **Response:** `{ totalReports, totalEvents, unreadNotifications, recentActivity }`

### Activity Feed

- **GET** `/api/users/me/activity`
- **Description:** Get recent activity feed for the authenticated user.
- **Authentication:** Required
- **Query Parameters:**
  - `limit` (integer, optional): Number of activities to return (default: 10, max: 50)
- **Response:** `{ activities: [...] }`

---

## Notifications

### Get Notifications

- **GET** `/api/users/me/notifications`
- **Description:** Get notifications for the authenticated user with filtering and pagination.
- **Authentication:** Required
- **Query Parameters:**
  - `page` (integer, optional): Page number (default: 1)
  - `limit` (integer, optional): Items per page (default: 20, max: 100)
  - `unreadOnly` (boolean, optional): Show only unread notifications
  - `type` (string, optional): Filter by notification type
- **Response:** `{ notifications: [...], pagination: { page, limit, total, totalPages } }`

### Mark Notification as Read

- **PATCH** `/api/notifications/:notificationId/read`
- **Description:** Mark a specific notification as read.
- **Authentication:** Required
- **Response:** `{ message }`

### Get Notification Stats

- **GET** `/api/users/me/notifications/stats`
- **Description:** Get notification statistics for the authenticated user.
- **Authentication:** Required
- **Response:** `{ total, unread, byType: {...}, byPriority: {...} }`

---

## Testing & Development

### Create Test Notification

- **POST** `/api/test/create-notification`
- **Description:** Create a test notification (development only).
- **Body:** `{ userId, type, title, message, priority?, eventId?, reportId? }`
- **Response:** `{ notification }`

### Health Check

- **GET** `/health`
- **Description:** Basic health check endpoint.
- **Response:** `{ status: 'ok', timestamp }`

### Audit Test

- **GET** `/audit-test`
- **Description:** Test audit logging functionality.
- **Response:** `{ message, auditLog }`

---

## Notes

- All endpoints require proper authentication unless marked as public
- Role-based access control is enforced at the API level
- File uploads use multipart/form-data encoding
- All timestamps are in ISO 8601 format
- Error responses follow consistent format: `{ error: 'message', details?: 'additional info' }`
- Pagination follows the pattern: `{ page, limit, total, totalPages }`
