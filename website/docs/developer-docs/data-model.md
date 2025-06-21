---
sidebar_position: 3
---
# Data Model

This document describes the main data models used in the system, based on the Prisma schema.

---

## User

- **id**: UUID, primary key
- **email**: Unique email address
- **name**: Optional display name
- **passwordHash**: Hashed password (nullable for social login users)
- **createdAt, updatedAt**: Timestamps
- **Relations**: userEventRoles, reports, auditLogs, reportComments, evidenceFilesUploaded, assignedReports, avatar, passwordResetTokens, notifications, socialAccounts, notificationSettings, organizationMemberships, createdOrganizations, createdMemberships, createdOrgInvites

## Event

- **id**: UUID, primary key
- **name**: Event name
- **slug**: Unique, URL-safe identifier
- **description**: Optional event description
- **startDate**: Optional event start date
- **endDate**: Optional event end date
- **website**: Optional event website URL
- **codeOfConduct**: Optional code of conduct text
- **contactEmail**: Optional contact email
- **isActive**: Boolean (default: true)
- **organizationId**: Optional organization reference (nullable for migration compatibility)
- **createdAt, updatedAt**: Timestamps
- **Relations**: organization, userEventRoles, reports, auditLogs, inviteLinks, eventLogo, notifications

## Role

- **id**: UUID, primary key
- **name**: Unique role name (Reporter, Responder, Admin, SuperAdmin)
- **Relations**: userEventRoles, eventInviteLinks

## UserEventRole

- **id**: UUID, primary key
- **userId**: User reference
- **eventId**: Event reference (nullable for global roles)
- **roleId**: Role reference
- **Unique:** Combination of userId, eventId, roleId

## Report

- **id**: UUID, primary key
- **eventId**: Event reference
- **reporterId**: User reference (nullable for anonymous)
- **type**: Report type enum (harassment, safety, other)
- **title**: Report title (required, max 70 chars)
- **description**: Report details
- **state**: Report state enum (submitted, acknowledged, investigating, resolved, closed)
- **incidentAt**: Optional date/time of the incident
- **parties**: Optional string listing parties involved (comma-separated or freeform)
- **location**: Optional string describing where the incident occurred
- **contactPreference**: Contact preference enum (email, phone, in_person, no_contact) with default 'email'
- **assignedResponderId**: string (nullable, UUID) — the user ID of the assigned responder (if any)
- **assignedResponder**: User (nullable) — the assigned responder user object (if any)
- **severity**: enum (`low`, `medium`, `high`, `critical`, nullable) — severity/priority of the report
- **resolution**: string (optional) — freeform text describing the resolution of the report
- **createdAt, updatedAt**: Timestamps
- **Relations**: comments, evidenceFiles, notifications

## ReportComment

- **id**: UUID, primary key
- **reportId**: Report reference
- **authorId**: User reference (nullable for system comments)
- **body**: Comment text
- **visibility**: Comment visibility enum (public, internal)
- **createdAt, updatedAt**: Timestamps
- **Relations**: report, author

## EvidenceFile

- **id**: UUID, primary key
- **reportId**: Report reference
- **filename**: Original file name
- **mimetype**: File MIME type
- **size**: File size (bytes)
- **data**: File data (BLOB)
- **uploaderId**: User reference (nullable, for anonymous uploads)
- **createdAt**: Timestamp
- **Relations**: report, uploader

## EventLogo

- **id**: UUID, primary key
- **eventId**: Event reference (unique)
- **filename**: Original file name
- **mimetype**: File MIME type
- **size**: File size (bytes)
- **data**: File data (BLOB)
- **createdAt**: Timestamp
- **Relations**: event

## UserAvatar

- **id**: UUID, primary key
- **userId**: User reference (unique)
- **filename**: Original file name
- **mimetype**: File MIME type
- **size**: File size (bytes)
- **data**: File data (BLOB)
- **createdAt**: Timestamp
- **Relations**: user

## AuditLog

- **id**: UUID, primary key
- **eventId**: Event reference (nullable)
- **userId**: User reference (nullable)
- **action**: Action performed
- **targetType**: Type of target (e.g., User, Report)
- **targetId**: Target identifier
- **timestamp**: When the action occurred
- **organizationId**: Organization reference (nullable)
- **Relations**: event, user, organization

## EventInviteLink

- **id**: UUID, primary key
- **eventId**: Event reference
- **code**: Unique invite code
- **createdByUserId**: User who created the invite (string, UUID)
- **roleId**: Role reference (role to assign when invite is redeemed)
- **createdAt**: Timestamp
- **expiresAt**: Optional expiration
- **maxUses**: Optional max uses
- **useCount**: Number of times used (default: 0)
- **disabled**: Boolean (default: false)
- **note**: Optional note
- **Relations**: event, role

## SystemSetting

- **id**: UUID, primary key
- **key**: Unique setting key
- **value**: Setting value (string)

### Current System Settings

- **showPublicEventList**: Boolean (stored as string) - Controls whether public event listing is shown on home page

## PasswordResetToken

- **id**: UUID, primary key
- **userId**: User reference
- **token**: Unique reset token
- **expiresAt**: Token expiration date
- **used**: Boolean (whether token has been used)
- **createdAt**: Timestamp
- **Relations**: user

## Notification

- **id**: UUID, primary key
- **userId**: User reference
- **type**: Notification type enum (report_submitted, report_assigned, report_status_changed, report_comment_added, event_invitation, event_role_changed, system_announcement)
- **priority**: Notification priority enum (low, normal, high, urgent)
- **title**: Notification title
- **message**: Notification message
- **isRead**: Boolean (default: false)
- **readAt**: Optional timestamp when notification was read
- **eventId**: Optional event reference
- **reportId**: Optional report reference
- **actionData**: Optional JSON string for action-specific data
- **actionUrl**: Optional URL to navigate to when notification is clicked
- **createdAt, updatedAt**: Timestamps
- **Relations**: user, event, report

## Enums

### ReportState

- `submitted`
- `acknowledged`
- `investigating`
- `resolved`
- `closed`

### ReportType

- `harassment`
- `safety`
- `other`

### CommentVisibility

- `public` - visible to all involved (reporter, responders, admins)
- `internal` - visible only to responders/admins

### ReportSeverity

- `low`
- `medium`
- `high`
- `critical`

### ContactPreference

- `email`
- `phone`
- `in_person`
- `no_contact`

### NotificationType

- `report_submitted` - New report submitted
- `report_assigned` - Report assigned to user
- `report_status_changed` - Report status changed
- `report_comment_added` - New comment on report
- `event_invitation` - Invited to event
- `event_role_changed` - Role changed in event
- `system_announcement` - System-wide announcement

### NotificationPriority

- `low`
- `normal`
- `high`
- `urgent`

### SocialProvider

- `google`
- `github`

### OrganizationRole

- `org_admin` - Organization administrator with full permissions
- `org_viewer` - Organization viewer with read-only access

---

## Organization Models

## Organization

- **id**: UUID, primary key
- **name**: Organization name
- **slug**: Unique, URL-safe identifier
- **description**: Optional organization description
- **website**: Optional organization website URL
- **logoUrl**: Optional logo URL
- **settings**: Optional JSON string for flexible settings
- **createdAt, updatedAt**: Timestamps
- **createdById**: User reference (creator)
- **Relations**: createdBy, memberships, events, auditLogs, logo, inviteLinks

## OrganizationMembership

- **id**: UUID, primary key
- **organizationId**: Organization reference
- **userId**: User reference
- **role**: Organization role enum (org_admin, org_viewer)
- **createdAt**: Timestamp
- **createdById**: User reference (who created the membership, nullable)
- **Unique:** Combination of organizationId and userId
- **Relations**: organization, user, createdBy

## OrganizationLogo

- **id**: UUID, primary key
- **organizationId**: Organization reference (unique)
- **filename**: Original file name
- **mimetype**: File MIME type
- **size**: File size (bytes)
- **data**: File data (BLOB)
- **createdAt**: Timestamp
- **Relations**: organization

## OrganizationInviteLink

- **id**: UUID, primary key
- **organizationId**: Organization reference
- **code**: Unique invite code
- **createdByUserId**: User who created the invite
- **role**: Organization role enum (org_admin, org_viewer)
- **createdAt**: Timestamp
- **expiresAt**: Optional expiration
- **maxUses**: Optional max uses
- **useCount**: Number of times used (default: 0)
- **disabled**: Boolean (default: false)
- **note**: Optional note
- **Relations**: organization, createdBy

## SocialAccount

- **id**: UUID, primary key
- **userId**: User reference
- **provider**: Social provider enum (google, github)
- **providerId**: User's ID from the OAuth provider
- **providerEmail**: Email from the OAuth provider (nullable)
- **providerName**: Name from the OAuth provider (nullable)
- **profileData**: JSON string for basic profile data (nullable)
- **createdAt, updatedAt**: Timestamps
- **Unique:** Combination of provider and providerId, also userId and provider
- **Relations**: user

## RateLimitAttempt

- **id**: UUID, primary key
- **key**: Rate limit key (e.g., "reset_attempt_email@example.com")
- **type**: Type of rate limit (e.g., "password_reset", "login_attempt")
- **identifier**: The identifier being rate limited (email, IP, etc.)
- **expiresAt**: Expiration timestamp
- **createdAt**: Timestamp

## UserNotificationSettings

- **id**: UUID, primary key
- **userId**: User reference (unique)
- **reportSubmittedInApp**: Boolean (default: true)
- **reportSubmittedEmail**: Boolean (default: false)
- **reportAssignedInApp**: Boolean (default: true)
- **reportAssignedEmail**: Boolean (default: false)
- **reportStatusChangedInApp**: Boolean (default: true)
- **reportStatusChangedEmail**: Boolean (default: false)
- **reportCommentAddedInApp**: Boolean (default: true)
- **reportCommentAddedEmail**: Boolean (default: false)
- **eventInvitationInApp**: Boolean (default: true)
- **eventInvitationEmail**: Boolean (default: false)
- **eventRoleChangedInApp**: Boolean (default: true)
- **eventRoleChangedEmail**: Boolean (default: false)
- **systemAnnouncementInApp**: Boolean (default: true)
- **systemAnnouncementEmail**: Boolean (default: false)
- **createdAt, updatedAt**: Timestamps
- **Relations**: user

---

For the full schema, see `backend/prisma/schema.prisma`.
