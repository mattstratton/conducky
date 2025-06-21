---
sidebar_position: 2
---

# Backend API Endpoints

This document describes all API endpoints currently implemented in the backend Express server.

---

## Organizations

All organization routes are mounted at `/api/organizations`:

### Organization Management

#### Create Organization

- **POST** `/api/organizations`
- **Role:** SuperAdmin only
- **Body:** `{ name, slug, description?, website? }`
- **Response:** `{ message, organization }`
- **Description:** Creates a new organization. Only SuperAdmins can create organizations.

#### List All Organizations

- **GET** `/api/organizations`
- **Role:** SuperAdmin only
- **Query Parameters:**
  - `search` (string, optional): Search term for organization name or description
  - `page` (integer, optional): Page number for pagination (default: 1)
  - `limit` (integer, optional): Number of organizations per page (default: 20)
- **Response:** `{ organizations: [...], pagination: { page, limit, total, totalPages } }`
- **Description:** Get all organizations in the system. Only accessible to SuperAdmins.

#### Get User's Organizations

- **GET** `/api/organizations/me`
- **Authentication:** Required
- **Response:** `{ organizations: [...] }`
- **Description:** Retrieve organizations that the authenticated user is a member of.

#### Get Organization by Slug

- **GET** `/api/organizations/slug/:orgSlug`
- **Authentication:** Required (must be member)
- **Response:** `{ organization }`
- **Description:** Retrieve organization details using the organization slug.

#### Get Organization by ID

- **GET** `/api/organizations/:organizationId`
- **Authentication:** Required (must be member)
- **Response:** `{ organization }`
- **Description:** Retrieve organization details using the organization ID.

#### Update Organization

- **PUT** `/api/organizations/:organizationId`
- **Role:** Organization Admin only
- **Body:** `{ name?, description?, website? }`
- **Response:** `{ message, organization }`
- **Description:** Update organization details.

#### Delete Organization

- **DELETE** `/api/organizations/:organizationId`
- **Role:** SuperAdmin only
- **Response:** `{ message }`
- **Description:** Delete an organization and all its associated data.

### Organization Membership

#### Add Member to Organization

- **POST** `/api/organizations/:organizationId/members`
- **Role:** Organization Admin only
- **Body:** `{ userId, role }` (role: `org_admin` or `org_viewer`)
- **Response:** `{ message }`
- **Description:** Add a new member to an organization.

#### Update Member Role

- **PUT** `/api/organizations/:organizationId/members/:userId`
- **Role:** Organization Admin only
- **Body:** `{ role }` (role: `org_admin` or `org_viewer`)
- **Response:** `{ message }`
- **Description:** Update a member's role in an organization.

#### Remove Member

- **DELETE** `/api/organizations/:organizationId/members/:userId`
- **Role:** Organization Admin only
- **Response:** `{ message }`
- **Description:** Remove a member from an organization.

### Organization Events

#### Create Event in Organization

- **POST** `/api/organizations/:organizationId/events`
- **Role:** Organization Admin only
- **Body:** `{ name, slug, description?, startDate?, endDate?, website?, contactEmail? }`
- **Response:** `{ message, event }`
- **Description:** Create a new event within an organization.

#### List Organization Events

- **GET** `/api/organizations/:organizationId/events`
- **Authentication:** Required (must be member)
- **Query Parameters:**
  - `search` (string, optional): Search term for event name or description
  - `isActive` (boolean, optional): Filter by active status
  - `page` (integer, optional): Page number for pagination (default: 1)
  - `limit` (integer, optional): Number of events per page (default: 20)
- **Response:** `{ events: [...], pagination: { page, limit, total, totalPages } }`
- **Description:** Retrieve events belonging to an organization.

### Organization Logo Management

#### Upload Organization Logo

- **POST** `/api/organizations/:organizationId/logo`
- **Role:** Organization Admin only
- **Content-Type:** `multipart/form-data`
- **Body:** Form data with `logo` file field
- **Response:** `{ message }`
- **Description:** Upload a logo for an organization.

#### Upload Organization Logo by Slug

- **POST** `/api/organizations/slug/:orgSlug/logo`
- **Role:** Organization Admin only
- **Content-Type:** `multipart/form-data`
- **Body:** Form data with `logo` file field
- **Response:** `{ message }`
- **Description:** Upload a logo for an organization using slug.

#### Get Organization Logo

- **GET** `/api/organizations/:organizationId/logo`
- **Authentication:** Not required
- **Response:** Binary image data
- **Description:** Retrieve organization logo.

#### Get Organization Logo by Slug

- **GET** `/api/organizations/slug/:orgSlug/logo`
- **Authentication:** Not required
- **Response:** Binary image data
- **Description:** Retrieve organization logo using slug.

### Organization Invite Management

#### Get Organization Invite Details (Public)

- **GET** `/api/organizations/invite/:code`
- **Authentication:** Not required
- **Response:** `{ organization, invite }`
- **Description:** Retrieve details about an organization invite link. Public endpoint.

#### Create Organization Invite Link

- **POST** `/api/organizations/:organizationId/invites`
- **Role:** Organization Admin only
- **Body:** `{ role, expiresAt?, maxUses?, note? }`
- **Response:** `{ message, invite }`
- **Description:** Create a new invite link for an organization.

#### Get Organization Invite Links

- **GET** `/api/organizations/:organizationId/invites`
- **Role:** Organization Admin only
- **Response:** `{ invites: [...] }`
- **Description:** Retrieve all invite links for an organization.

#### Update Organization Invite Link

- **PATCH** `/api/organizations/:organizationId/invites/:inviteId`
- **Role:** Organization Admin only
- **Body:** `{ disabled?, note? }`
- **Response:** `{ message }`
- **Description:** Update an existing invite link (e.g., disable it).

#### Use Organization Invite Link

- **POST** `/api/organizations/invite/:code/use`
- **Authentication:** Required
- **Response:** `{ message, organization, role }`
- **Description:** Accept an organization invite and join the organization.

---

## Base Routes

### Health Check

- **GET** `/health`
- **Description:** Basic health check endpoint.
- **Response:** `{ status: 'ok', timestamp, environment }`

### Root

- **GET** `/`
- **Description:** API status and setup check.
- **Response:** `{ message: 'Backend API is running!' }` or `{ firstUserNeeded: true }` if no users exist

---

## Authentication

All authentication routes are mounted at `/api/auth`:

### Register

- **POST** `/api/auth/register`
- **Description:** Register a new user. The first user becomes Global Admin (SuperAdmin).
- **Body:** `{ email, password, name }`
- **Response:** `{ message, user, madeSuperAdmin? }`

### Register with Invite

- **POST** `/api/auth/register/invite/:inviteCode`
- **Description:** Register a new user using an invite code. Automatically assigns the role specified in the invite.
- **Body:** `{ email, password, name }`
- **Response:** `{ message, user }`
- **Notes:**
  - Validates the invite code and checks if it's not disabled or expired
  - Automatically assigns the user to the event with the role specified in the invite
  - Increments the invite's use count

### Login

- **POST** `/api/auth/login`
- **Description:** Log in with email and password.
- **Body:** `{ email, password }`
- **Response:** `{ message, user }`

### Logout

- **POST** `/api/auth/logout`
- **Description:** Log out the current user.
- **Response:** `{ message }`

### Session Check

- **GET** `/api/auth/session` or `/api/session` or `/session`
- **Description:** Get current session user and roles.
- **Response:** `{ authenticated: true, user: { id, email, name, avatarUrl } }` or `{ authenticated: false }`

### Check Email Availability

- **GET** `/api/auth/check-email`
- **Description:** Check if an email address is available for registration.
- **Query Parameters:** `email` (required)
- **Response:** `{ available: boolean }`

### Password Reset

- **POST** `/api/auth/forgot-password`
- **Description:** Request a password reset token via email.
- **Body:** `{ email }`
- **Response:** `{ message }`

- **POST** `/api/auth/reset-password`
- **Description:** Reset password using a valid token.
- **Body:** `{ token, newPassword }`
- **Response:** `{ message }`

- **GET** `/api/auth/validate-reset-token`
- **Description:** Validate a password reset token.
- **Query Parameters:** `token` (required)
- **Response:** `{ valid: boolean, email?: string, expiresAt?: string }`

---

## SuperAdmin Management

System administration endpoints for SuperAdmin users only.

### Event Management

#### Create Event

- **POST** `/api/admin/events`
- **Role:** SuperAdmin only
- **Body:** `{ name, slug, description }`
- **Response:** `{ message, event: { id, name, slug, description, setupRequired } }`
- **Description:** Creates a new event with basic information. Event is created with `isActive: false` and requires admin setup to complete configuration.

#### List All Events

- **GET** `/api/admin/events`
- **Role:** SuperAdmin only
- **Response:** `{ events: [...], statistics: { totalEvents, activeEvents, totalUsers, totalReports } }`
- **Description:** Get all events in the system with statistics and metadata.

#### Get Event Details

- **GET** `/api/admin/events/:eventId`
- **Role:** SuperAdmin only
- **Response:** `{ event }`
- **Description:** Get detailed information about a specific event.

#### Create Admin Invite

- **POST** `/api/admin/events/:eventId/invites`
- **Role:** SuperAdmin only
- **Body:** `{ email, role }` (role defaults to "Admin")
- **Response:** `{ message, invite: { id, code, email, role, expiresAt } }`
- **Description:** Create an admin invite for an event. Returns invite code that can be shared with the event organizer.

#### List Event Invites

- **GET** `/api/admin/events/:eventId/invites`
- **Role:** SuperAdmin only
- **Response:** `{ invites: [...] }`
- **Description:** Get all pending invites for an event.

#### Update Invite Status

- **PATCH** `/api/admin/events/:eventId/invites/:inviteId`
- **Role:** SuperAdmin only
- **Body:** `{ status }` ("pending", "accepted", "expired", "revoked")
- **Response:** `{ message, invite }`
- **Description:** Update the status of an invite (e.g., revoke an unused invite).

---

## Events

Event routes are mounted at `/api/events` and `/events`:

### Get Event by ID

- **GET** `/api/events/:eventId`
- **Role:** Admin or SuperAdmin for the event
- **Response:** `{ event }`

### Get Event by Slug

- **GET** `/api/events/slug/:slug` or `/events/slug/:slug`
- **Description:** Get event details by slug (public)
- **Response:** `{ event }`

### Update Event (by Slug)

- **PATCH** `/api/events/slug/:slug` or `/events/slug/:slug`
- **Role:** Admin or SuperAdmin for the event
- **Body:** `{ name?, newSlug?, description?, logo?, startDate?, endDate?, website?, codeOfConduct?, contactEmail? }` (at least one required)
- **Response:** `{ event }`

### Get User Roles for Event

- **GET** `/api/events/slug/:slug/my-roles` or `/events/slug/:slug/my-roles`
- **Description:** Get the authenticated user's roles for a specific event.
- **Authentication:** Required
- **Response:** `{ roles: [...] }`

### Event Users Management

#### List Users for Event (by ID)

- **GET** `/api/events/:eventId/users`
- **Role:** Admin or SuperAdmin for the event
- **Response:** `{ users }`

#### List Users for Event (by Slug)

- **GET** `/api/events/slug/:slug/users` or `/events/slug/:slug/users`
- **Role:** Reporter, Responder, Admin, or SuperAdmin for the event
- **Query Parameters:**
  - `search` (string, optional): Filter users by name or email
  - `sort` (string, optional): Sort by `name`, `email`, or `role` (default: `name`)
  - `order` (string, optional): Sort order, `asc` or `desc` (default: `asc`)
  - `page` (integer, optional): Page number for pagination (default: 1)
  - `limit` (integer, optional): Number of users per page (default: 20)
  - `role` (string, optional): Filter users by event role
- **Response:** `{ users: [...], total: <number> }`

#### Update Event User

- **PATCH** `/api/events/slug/:slug/users/:userId` or `/events/slug/:slug/users/:userId`
- **Role:** Admin or SuperAdmin for the event
- **Body:** `{ name, email, role }`
- **Response:** `{ message }`

#### Remove User from Event

- **DELETE** `/api/events/slug/:slug/users/:userId` or `/events/slug/:slug/users/:userId`
- **Role:** Admin or SuperAdmin for the event
- **Response:** `{ message }`

#### Get Individual User Profile

- **GET** `/api/events/slug/:slug/users/:userId` or `/events/slug/:slug/users/:userId`
- **Role:** Responder, Admin, or SuperAdmin for the event
- **Description:** Get detailed profile information for a specific user in the event
- **Response:** `{ user: { id, name, email, avatarUrl }, roles: [...], joinDate: string, lastActivity: string|null }`

#### Get User Activity Timeline

- **GET** `/api/events/slug/:slug/users/:userId/activity` or `/events/slug/:slug/users/:userId/activity`
- **Role:** Responder, Admin, or SuperAdmin for the event
- **Description:** Get chronological activity timeline for a specific user in the event
- **Query Parameters:**
  - `page` (integer, optional): Page number for pagination (default: 1)
  - `limit` (integer, optional): Number of activities per page (default: 20)
- **Response:** `{ activities: [...], total: number }`
- **Activity Types:**
  - `report`: Report submissions and updates
  - `comment`: Comment additions to reports
  - `audit`: System actions and role changes

#### Get User Reports

- **GET** `/api/events/slug/:slug/users/:userId/reports` or `/events/slug/:slug/users/:userId/reports`
- **Role:** Responder, Admin, or SuperAdmin for the event
- **Description:** Get all reports submitted by or assigned to a specific user in the event
- **Query Parameters:**
  - `type` (string, optional): Filter by report type (`submitted`, `assigned`, `all`) (default: `all`)
  - `page` (integer, optional): Page number for pagination (default: 1)
  - `limit` (integer, optional): Number of reports per page (default: 20)
- **Response:** `{ reports: [...], total: number }`

### Role Management

#### Assign Role to User

- **POST** `/api/events/:eventId/roles`
- **Role:** Admin or SuperAdmin for the event
- **Body:** `{ userId, roleName }`
- **Response:** `{ message, userEventRole }`

#### Remove Role from User

- **DELETE** `/api/events/:eventId/roles`
- **Role:** Admin or SuperAdmin for the event
- **Body:** `{ userId, roleName }`
- **Response:** `{ message }`

### Event Logo Management

#### Upload Event Logo (by ID)

- **POST** `/api/events/:eventId/logo`
- **Role:** Admin or SuperAdmin for the event
- **Body:** `multipart/form-data` with a `logo` file field
- **Response:** `{ event }`

#### Upload Event Logo (by Slug)

- **POST** `/api/events/slug/:slug/logo` or `/events/slug/:slug/logo`
- **Role:** Admin or SuperAdmin for the event
- **Body:** `multipart/form-data` with a `logo` file field
- **Response:** `{ event }`

#### Get Event Logo (by ID)

- **GET** `/api/events/:eventId/logo`
- **Description:** Fetch the event logo image for display.
- **Response:** Binary image data (or 404 if not found)

#### Get Event Logo (by Slug)

- **GET** `/api/events/slug/:slug/logo` or `/events/slug/:slug/logo`
- **Description:** Fetch the event logo image for display.
- **Response:** Binary image data (or 404 if not found)

---

## Reports

### Report Management by Event ID

#### Create Report

- **POST** `/api/events/:eventId/reports`
- **Body:** `title` (string, required, 10–70 chars), `type`, `description`, `location` (string, optional), `contactPreference` (enum, optional: email|phone|in_person|no_contact, default: email), `evidence[]` (multipart/form-data, zero or more files)
- **Response:** `{ report }`

#### List Reports

- **GET** `/api/events/:eventId/reports`
- **Query Parameters:**
  - `page` (integer, optional): Page number (default: 1)
  - `limit` (integer, optional): Items per page (default: 10)
  - `status` (string, optional): Filter by status
  - `priority` (string, optional): Filter by priority
  - `search` (string, optional): Search term
- **Response:** `{ reports }`

#### Get Report by ID

- **GET** `/api/events/:eventId/reports/:reportId`
- **Response:** `{ report }`

#### Update Report State

- **PATCH** `/api/events/:eventId/reports/:reportId/state`
- **Role:** Admin, SuperAdmin, or Responder
- **Body:** `{ state }` (or `{ status }` for compatibility)
- **Response:** `{ report }`

#### Update Report Title

- **PATCH** `/api/events/:eventId/reports/:reportId/title`
- **Role:** Admin, SuperAdmin, or Reporter (own reports only)
- **Body:** `{ title }` (string, 10–70 chars)
- **Response:** `{ report }`

### Report Management by Event Slug

#### Create Report

- **POST** `/api/events/slug/:slug/reports` or `/events/slug/:slug/reports`
- **Role:** Reporter, Responder, Admin, or SuperAdmin for the event
- **Body:** `title` (string, required, 10–70 chars), `type`, `description`, `location` (string, optional), `contactPreference` (enum, optional: email|phone|in_person|no_contact, default: email), `evidence[]` (multipart/form-data, zero or more files)
- **Response:** `{ report }`

#### List Reports

- **GET** `/api/events/slug/:slug/reports` or `/events/slug/:slug/reports`
- **Role:** Reporter, Responder, Admin, or SuperAdmin for the event
- **Response:** `{ reports }`

#### Get Report by ID

- **GET** `/api/events/slug/:slug/reports/:reportId` or `/events/slug/:slug/reports/:reportId`
- **Role:** Reporter (own reports), Responder, Admin, or SuperAdmin for the event
- **Response:** `{ report }`

#### Update Report

- **PATCH** `/api/events/slug/:slug/reports/:reportId` or `/events/slug/:slug/reports/:reportId`
- **Role:** Responder, Admin, or SuperAdmin for the event
- **Body:** `{ assignedResponderId?, severity?, resolution?, state? }` (at least one required)
- **Response:** `{ report }`

#### Update Report Title

- **PATCH** `/api/events/slug/:slug/reports/:reportId/title` or `/events/slug/:slug/reports/:reportId/title`
- **Role:** Reporter (own reports), Responder, Admin, or SuperAdmin for the event
- **Body:** `{ title }` (string, 10–70 chars)
- **Response:** `{ report }`

### Cross-Event Reports

- **GET** `/api/users/me/reports`
- **Description:** Get reports across all events the authenticated user has access to.
- **Authentication:** Required
- **Query Parameters:**
  - `page` (integer, optional): Page number (default: 1, min: 1)
  - `limit` (integer, optional): Items per page (default: 20, min: 1, max: 100)
  - `search` (string, optional): Search across titles, descriptions, and reporter names
  - `status` (string, optional): Filter by status
  - `event` (string, optional): Filter by event ID
  - `assigned` (string, optional): Filter by assignment (`me`, `unassigned`, `others`)
  - `sort` (string, optional): Sort field (`title`, `createdAt`, `status`) (default: `createdAt`)
  - `order` (string, optional): Sort direction (`asc`, `desc`) (default: `desc`)
- **Response:** `{ reports: [...], pagination: { page, limit, total, totalPages } }`

---

## Evidence Files

Evidence routes are available both through the main reports module and as standalone routes:

### Evidence Management via Event ID

#### Upload Evidence

- **POST** `/api/events/:eventId/reports/:reportId/evidence`
- **Role:** Admin, SuperAdmin, or Responder
- **Body:** `multipart/form-data` with `evidence[]` files
- **Response:** `{ files }`

#### Get Evidence Files

- **GET** `/api/events/:eventId/reports/:reportId/evidence`
- **Response:** `{ files }`

#### Download Evidence File

- **GET** `/api/events/:eventId/reports/:reportId/evidence/:evidenceId/download`
- **Response:** Binary file data

#### Delete Evidence File

- **DELETE** `/api/events/:eventId/reports/:reportId/evidence/:evidenceId`
- **Role:** Admin, SuperAdmin, or Responder
- **Response:** `{ message }`

### Evidence Management via Event Slug

#### Upload Evidence

- **POST** `/api/events/slug/:slug/reports/:reportId/evidence` or `/events/slug/:slug/reports/:reportId/evidence`
- **Role:** Reporter (own reports), Responder, Admin, or SuperAdmin for the event
- **Body:** `multipart/form-data` with `evidence[]` files
- **Response:** `{ files }`
- **Notes:** Reporters can only upload evidence to their own reports

#### Get Evidence Files

- **GET** `/api/events/slug/:slug/reports/:reportId/evidence` or `/events/slug/:slug/reports/:reportId/evidence`
- **Role:** Reporter (own reports), Responder, Admin, or SuperAdmin for the event
- **Response:** `{ files }`

#### Delete Evidence File

- **DELETE** `/api/events/slug/:slug/reports/:reportId/evidence/:evidenceId` or `/events/slug/:slug/reports/:reportId/evidence/:evidenceId`
- **Role:** Responder, Admin, or SuperAdmin for the event
- **Response:** `{ message }`

### Standalone Evidence Routes

#### Get Evidence Files for Report

- **GET** `/api/reports/:reportId/evidence`
- **Description:** List all evidence files for a report (metadata only).
- **Response:** `{ files: [...] }`

#### Upload Evidence to Report

- **POST** `/api/reports/:reportId/evidence`
- **Description:** Upload additional evidence files to an existing report.
- **Body:** `multipart/form-data` with `evidence[]` files
- **Response:** `{ files: [...] }`

#### Get Specific Evidence File

- **GET** `/api/reports/:reportId/evidence/:evidenceId`
- **Description:** Download a specific evidence file.
- **Response:** Binary file data

#### Delete Evidence File

- **DELETE** `/api/reports/:reportId/evidence/:evidenceId`
- **Description:** Delete a specific evidence file.
- **Response:** `{ message }`

#### Download Evidence File (Global)

- **GET** `/api/evidence/:evidenceId/download`
- **Description:** Download evidence file by ID (standalone route).
- **Response:** Binary file data

---

## Comments

### Create Comment

- **POST** `/api/events/slug/:slug/reports/:reportId/comments` or `/events/slug/:slug/reports/:reportId/comments`
- **Role:** Reporter, Responder, Admin, or SuperAdmin for the event
- **Body:** `{ body, visibility?, isMarkdown? }`
  - `visibility`: 'public' or 'internal', default: 'public'
  - `isMarkdown`: boolean, default: false (enables markdown rendering)
- **Response:** `{ comment }`
- **Notes:**
  - Only Responders, Admins, and SuperAdmins can create internal comments
  - Markdown support includes formatting, links, lists, and code blocks
  - Creates notifications for other users with access to the report

### Get Comments (Enhanced with Pagination, Filtering & Search)

- **GET** `/api/events/slug/:slug/reports/:reportId/comments` or `/events/slug/:slug/reports/:reportId/comments`
- **Role:** Reporter (own reports), Responder, Admin, or SuperAdmin for the event
- **Query Parameters:**
  - `page` (integer, optional): Page number (default: 1)
  - `limit` (integer, optional): Items per page (default: 10, max: 100)
  - `visibility` (string, optional): Filter by visibility level ('public', 'internal', or 'all')
  - `search` (string, optional): Search in comment body text
  - `sortBy` (string, optional): Sort field ('createdAt' or 'updatedAt', default: 'createdAt')
  - `sortOrder` (string, optional): Sort order ('asc' or 'desc', default: 'asc')
- **Response:** `{ comments: [...], pagination: { page, limit, total, totalPages } }`
- **Notes:**
  - Reporters can only see public comments unless they're assigned to the report
  - Responders/Admins can see both public and internal comments
  - Search is case-insensitive and searches comment body text
  - Comments include markdown rendering support
  - Supports direct linking to specific comments via URL anchors

### Update Comment

- **PATCH** `/api/events/slug/:slug/reports/:reportId/comments/:commentId` or `/events/slug/:slug/reports/:reportId/comments/:commentId`
- **Role:** Comment author, or Admin/SuperAdmin for the event
- **Body:** `{ body?, visibility?, isMarkdown? }` (at least one required)
- **Response:** `{ comment }`
- **Notes:**
  - Only the comment author can edit their own comments
  - Only Responders/Admins can change visibility to 'internal'
  - Markdown toggle affects rendering but preserves original content

### Delete Comment

- **DELETE** `/api/events/slug/:slug/reports/:reportId/comments/:commentId` or `/events/slug/:slug/reports/:reportId/comments/:commentId`
- **Role:** Comment author, or Admin/SuperAdmin for the event
- **Response:** `{ message }`
- **Notes:**
  - Only the comment author or Admin/SuperAdmin can delete comments
  - Deletion is permanent and cannot be undone

---

## Invite Management

### Get Invite Details

- **GET** `/api/invites/:code` or `/invites/:code`
- **Description:** Get invite details and associated event information by invite code.
- **Response:** `{ invite, event }`
- **Notes:** Public endpoint for validating invite codes

### Redeem Invite

- **POST** `/api/invites/:code/redeem` or `/invites/:code/redeem`
- **Description:** Redeem an invite code (for already registered users).
- **Authentication:** Required
- **Response:** `{ message }`

### Event Invite Management

#### List Event Invites

- **GET** `/api/events/slug/:slug/invites` or `/events/slug/:slug/invites`
- **Role:** Admin or SuperAdmin for the event
- **Response:** `{ invites }`

#### Create Event Invite

- **POST** `/api/events/slug/:slug/invites` or `/events/slug/:slug/invites`
- **Role:** Admin or SuperAdmin for the event
- **Body:** `{ maxUses?, expiresAt?, note?, role? }`
- **Response:** `{ invite }`

#### Update Event Invite

- **PATCH** `/api/events/slug/:slug/invites/:inviteId` or `/events/slug/:slug/invites/:inviteId`
- **Role:** Admin or SuperAdmin for the event
- **Body:** `{ disabled?, expiresAt?, maxUses?, note? }`
- **Response:** `{ invite }`

---

## User Management

User routes are mounted at `/api/users` and `/users`:

### Profile Management

#### Update Profile

- **PATCH** `/api/users/me/profile` or `/users/me/profile`
- **Authentication:** Required
- **Body:** `{ name?, email? }` (at least one required)
- **Response:** `{ message, user }`

#### Change Password

- **PATCH** `/api/users/me/password` or `/users/me/password`
- **Authentication:** Required
- **Body:** `{ currentPassword, newPassword }`
- **Response:** `{ message }`

#### Get User Events

- **GET** `/api/users/me/events` or `/users/me/events`
- **Authentication:** Required
- **Response:** `{ events: [...] }`

#### Leave Event

- **DELETE** `/api/users/me/events/:eventId` or `/users/me/events/:eventId`
- **Authentication:** Required
- **Response:** `{ message }`

### User Avatars

#### Upload Avatar

- **POST** `/api/users/:userId/avatar` or `/users/:userId/avatar`
- **Description:** Upload or change avatar (only for own account).
- **Body:** `multipart/form-data` with `avatar` file (PNG/JPG, max 2MB)
- **Response:** `{ success: true, avatarId }`

#### Get Avatar

- **GET** `/api/users/:userId/avatar` or `/users/:userId/avatar`
- **Description:** Fetch user avatar image.
- **Response:** Binary image data (or 404 if no avatar)

#### Delete Avatar

- **DELETE** `/api/users/:userId/avatar` or `/users/:userId/avatar`
- **Description:** Remove avatar (only for own account).
- **Response:** 204 No Content

### Dashboard & Analytics

#### Get Quick Stats

- **GET** `/api/users/me/quickstats` or `/users/me/quickstats`
- **Authentication:** Required
- **Response:** `{ totalReports, totalEvents, unreadNotifications, recentActivity }`

#### Get Activity Feed

- **GET** `/api/users/me/activity` or `/users/me/activity`
- **Authentication:** Required
- **Query Parameters:**
  - `limit` (integer, optional): Number of activities (default: 10, max: 50)
- **Response:** `{ activities: [...] }`

---

## Notifications

Notification routes are mounted at `/api/notifications`:

### Get User Notifications

- **GET** `/api/notifications/users/me/notifications` or `/api/users/me/notifications` or `/users/me/notifications`
- **Authentication:** Required
- **Query Parameters:**
  - `page` (integer, optional): Page number (default: 1)
  - `limit` (integer, optional): Items per page (default: 20, max: 100)
  - `unreadOnly` (boolean, optional): Show only unread notifications
  - `type` (string, optional): Filter by notification type
  - `priority` (string, optional): Filter by priority
- **Response:** `{ notifications: [...], pagination: {...}, unreadCount }`

### Mark Notification as Read

- **PATCH** `/api/notifications/:notificationId/read`
- **Authentication:** Required
- **Response:** `{ message }`

### Get Notification Statistics

- **GET** `/api/notifications/users/me/notifications/stats` or `/api/users/me/notifications/stats` or `/users/me/notifications/stats`
- **Authentication:** Required
- **Response:** `{ total, unread, byType: {...}, byPriority: {...} }`

### Delete Notification

- **DELETE** `/api/notifications/:notificationId`
- **Authentication:** Required
- **Response:** `{ message }`

---

## System Administration

### System Settings

#### Get System Settings

- **GET** `/api/system/settings`
- **Description:** Get system configuration settings (public access).
- **Response:** `{ showPublicEventList: boolean }`

#### Update System Settings

- **PATCH** `/api/admin/system/settings`
- **Role:** SuperAdmin only
- **Description:** Update system configuration settings.
- **Body:** `{ showPublicEventList?: boolean }`
- **Response:** `{ message: "Settings updated successfully", settings: { showPublicEventList: boolean } }`

### SuperAdmin Event Management

#### Create Event (SuperAdmin)

- **POST** `/api/admin/events`
- **Role:** SuperAdmin only
- **Description:** Create a new event with basic information. Event is created as inactive until admin setup is complete.
- **Body:** `{ name, slug, description }`
  - `name` (string, required): Display name for the event
  - `slug` (string, required): URL-safe identifier (lowercase, letters, numbers, hyphens only)
  - `description` (string, required): Brief description of the event
- **Response:** `{ event: { id, name, slug, description, isActive, createdAt, updatedAt } }`
- **Notes:**
  - Slug must be unique across the system
  - Event is created with `isActive: false`
  - SuperAdmin is not automatically assigned event roles

#### List All Events (SuperAdmin)

- **GET** `/api/admin/events`
- **Role:** SuperAdmin only
- **Description:** Get a list of all events in the system with basic statistics.
- **Response:** `{ events: [{ id, name, slug, description, isActive, createdAt, updatedAt, userCount, reportCount }] }`

#### Get Event Details (SuperAdmin)

- **GET** `/api/admin/events/:eventId`
- **Role:** SuperAdmin only
- **Description:** Get detailed information about a specific event.
- **Response:** `{ event: { id, name, slug, description, isActive, createdAt, updatedAt, userCount, reportCount, recentActivity } }`

### SuperAdmin Invite Management

#### List Event Invites (SuperAdmin)

- **GET** `/api/admin/events/:eventId/invites`
- **Role:** SuperAdmin only
- **Description:** Get all invite links for a specific event.
- **Response:** `{ invites: [{ id, code, role, maxUses, usedCount, expiresAt, isDisabled, note, createdAt }] }`

#### Create Admin Invite (SuperAdmin)

- **POST** `/api/admin/events/:eventId/invites`
- **Role:** SuperAdmin only
- **Description:** Create a new admin invite link for an event. Used to assign event administrators.
- **Body:** `{ note?, maxUses?, expiresAt? }`
  - `note` (string, optional): Note about the invite (recommended to include email)
  - `maxUses` (integer, optional): Maximum number of uses (default: 1)
  - `expiresAt` (string, optional): ISO 8601 expiration date (default: 30 days)
- **Response:** `{ invite: { id, code, role: 'Admin', maxUses, usedCount, expiresAt, isDisabled, note, createdAt }, inviteUrl }`
- **Notes:**
  - Always creates invites with 'Admin' role
  - Returns full invite URL for easy sharing
  - Invite code is automatically generated

#### Update Invite (SuperAdmin)

- **PATCH** `/api/admin/events/:eventId/invites/:inviteId`
- **Role:** SuperAdmin only
- **Description:** Update an existing invite (typically to disable/enable).
- **Body:** `{ isDisabled?, note?, maxUses?, expiresAt? }`
- **Response:** `{ invite: { id, code, role, maxUses, usedCount, expiresAt, isDisabled, note, updatedAt } }`

---

## Testing & Development

### Audit Test

- **GET** `/audit-test`
- **Description:** Test audit logging functionality.
- **Response:** `{ message, auditLog }`

### Admin Test

- **GET** `/admin-only`
- **Description:** Test SuperAdmin role-based access control.
- **Role:** SuperAdmin only
- **Response:** `{ message }`

---

## Notes

### Route Mounting

- Authentication routes: `/api/auth/*`
- User routes: `/api/users/*` and `/users/*` (backward compatibility)
- Event routes: `/api/events/*` and `/events/*` (backward compatibility)
- Invite routes: `/api/invites/*` and `/invites/*` (backward compatibility)
- Report routes: `/api/reports/*`
- Notification routes: `/api/notifications/*`

### Authentication & Authorization

- All endpoints require proper authentication unless marked as public
- Role-based access control is enforced at the API level using middleware
- Event-scoped permissions are validated for all event-related operations
- Reporters have limited access (own reports only for most operations)
- Responders, Admins, and SuperAdmins have escalating levels of access

### File Uploads

- Evidence files: Max 10MB per file, multiple files supported
- Event logos: Max 5MB per file
- User avatars: Max 2MB per file, PNG/JPG only
- All file uploads use multipart/form-data encoding

### Data Formats

- All timestamps are in ISO 8601 format
- Error responses follow consistent format: `{ error: 'message', details?: 'additional info' }`
- Pagination follows the pattern: `{ page, limit, total, totalPages }`
- File downloads include proper Content-Type and Content-Disposition headers

### Access Control Matrix

- **Reporters**: View own reports, edit own titles, add comments, upload evidence to own reports
- **Responders**: Additionally change states, assign reports, upload evidence to any report, see internal comments
- **Admins**: Full access within their events, manage users and invites
- **SuperAdmins**: Global access, create events, manage system settings
