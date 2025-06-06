# Data Model

This document describes the main data models used in the system, based on the Prisma schema.

---

## User
- **id**: UUID, primary key
- **email**: Unique email address
- **name**: Optional display name
- **passwordHash**: Hashed password (nullable for invited users)
- **createdAt, updatedAt**: Timestamps
- **Relations**: userEventRoles, reports, auditLogs

## Event
- **id**: UUID, primary key
- **name**: Event name
- **slug**: Unique, URL-safe identifier
- **createdAt, updatedAt**: Timestamps
- **Relations**: userEventRoles, reports, auditLogs, inviteLinks

## Role
- **id**: UUID, primary key
- **name**: Unique role name (Reporter, Responder, Admin, SuperAdmin)
- **Relations**: userEventRoles

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
- **type**: Report type (harassment, safety, other)
- **description**: Report details
- **state**: Report state (submitted, acknowledged, investigating, resolved, closed)
- **evidence**: Optional file path
- **createdAt, updatedAt**: Timestamps

## AuditLog
- **id**: UUID, primary key
- **eventId**: Event reference
- **userId**: User reference (nullable)
- **action**: Action performed
- **targetType**: Type of target (e.g., User, Report)
- **targetId**: Target identifier
- **timestamp**: When the action occurred

## EventInviteLink
- **id**: UUID, primary key
- **eventId**: Event reference
- **code**: Unique invite code
- **createdByUserId**: User who created the invite
- **createdAt**: Timestamp
- **expiresAt**: Optional expiration
- **maxUses**: Optional max uses
- **useCount**: Number of times used
- **disabled**: Boolean
- **note**: Optional note

---

For the full schema, see `backend/prisma/schema.prisma`. 