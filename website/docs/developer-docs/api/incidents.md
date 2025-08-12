---
sidebar_position: 5
---

# Incidents API

Incident endpoints handle the core functionality of incident reporting, management, and tracking. Incidents can be accessed through event ID or event slug routes.

## 📋 Incident Management by Event ID

### Create Report

- **POST** `/api/events/:eventId/incidents`
- **Body:** `title` (string, required, 10–70 chars), `type`, `description`, `location` (string, optional), `contactMethod` (string, optional, one of: email|phone|in_person|no_contact, default: email), `relatedFiles[]` (multipart/form-data, zero or more files)
- **Response:** `{ incident }`

### List Incidents

- **GET** `/api/events/:eventId/incidents`
- **Query Parameters:**
  - `page` (integer, optional): Page number (default: 1)
  - `limit` (integer, optional): Items per page (default: 10)
  - `status` (string, optional): Filter by status
  - `priority` (string, optional): Filter by priority
  - `search` (string, optional): Search term
- **Response:** `{ incidents }`

### Get Report by ID

- **GET** `/api/events/:eventId/incidents/:incidentId`
- **Response:** `{ incident }`

### Update Report State

- **PATCH** `/api/events/:eventId/incidents/:incidentId/state`
- **Role:** Admin, SystemAdmin, or Responder
- **Body:** `{ state, notes?, assignedToUserId? }`
  - Valid states: `submitted`, `acknowledged`, `investigating`, `resolved`, `closed`
  - Requirements:
    - `investigating`: requires `notes` and `assignedToUserId`
    - `resolved`: requires `notes`
- **Response:** `{ incident }`

### Reopen Report (Resolved/Closed)

- **PATCH** `/api/events/:eventId/incidents/:incidentId/reopen`
- **Role:** Responder, Admin, or SystemAdmin
- **Body:** `{ notes: string, assignedToUserId?: string }`
  - Behavior:
    - If `assignedToUserId` provided, incident transitions to `investigating`
    - If not provided, incident transitions to `acknowledged`
- **Response:** `{ incident }`

### Update Report Title

- **PATCH** `/api/events/:eventId/incidents/:incidentId/title`
- **Role:** Admin, SystemAdmin, or Reporter (own incidents only)
- **Body:** `{ title }` (string, 10–70 chars)
- **Response:** `{ incident }`

## 🏷️ Incident Management by Event Slug

### Create Report

- **POST** `/api/events/slug/:slug/incidents` or `/events/slug/:slug/incidents`
- **Role:** Reporter, Responder, Admin, or SystemAdmin for the event
- **Body:** `title` (string, required, 10–70 chars), `type`, `description`, `location` (string, optional), `contactMethod` (string, optional, one of: email|phone|in_person|no_contact, default: email), `relatedFiles[]` (multipart/form-data, zero or more files)
- **Response:** `{ incident }`

### List Incidents

- **GET** `/api/events/slug/:slug/incidents` or `/events/slug/:slug/incidents`
- **Role:** Reporter, Responder, Admin, or SystemAdmin for the event
- **Response:** `{ incidents }`

### Get Report by ID

- **GET** `/api/events/slug/:slug/incidents/:incidentId` or `/events/slug/:slug/incidents/:incidentId`
- **Role:** Reporter (own incidents), Responder, Admin, or SystemAdmin for the event
- **Response:** `{ incident }`

### Update Report

- **PATCH** `/api/events/slug/:slug/incidents/:incidentId` or `/events/slug/:slug/incidents/:incidentId`
- **Role:** Responder, Admin, or SystemAdmin for the event
- **Body:** `{ assignedResponderId?, severity?, resolution?, state? }` (at least one required)
- **Response:** `{ incident }`

### Update Report Title

- **PATCH** `/api/events/slug/:slug/incidents/:incidentId/title` or `/events/slug/:slug/incidents/:incidentId/title`
- **Role:** Reporter (own incidents), Responder, Admin, or SystemAdmin for the event
- **Body:** `{ title }` (string, 10–70 chars)
- **Response:** `{ incident }`

## 🌐 Cross-Event Incidents

### Get User's Incidents Across All Events

- **GET** `/api/users/me/incidents`
- **Description:** Get incidents across all events the authenticated user has access to.
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
- **Response:** `{ incidents: [...], pagination: { page, limit, total, totalPages } }`

## 📊 Incident States

Incidents follow a defined state workflow:

- **`submitted`** - Initial state when incident is reported
- **`acknowledged`** - Incident has been reviewed by response team
- **`investigating`** - Active investigation in progress (requires assignment)
- **`resolved`** - Investigation complete, resolution documented
- **`closed`** - Final state, incident fully processed

Additional rules:
- Changing to `investigating` requires notes and assignment
- Changing to `resolved` requires notes
- Reopen from `resolved`/`closed` requires notes; optional assignment determines target state

## 🔒 Permission Requirements

### Reporter Permissions
- Create incidents in events where they have Reporter role
- View and edit their own incidents
- Update title of their own incidents
- Upload related files to their own incidents

### Responder Permissions
- View all incidents in assigned events
- Update incident state, assignment, and resolution
- Create internal comments
- Upload and manage related files

### Admin/SystemAdmin Permissions
- Full access to all incident operations
- Can assign incidents to responders
- Access to system-wide incident analytics 