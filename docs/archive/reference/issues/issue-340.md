# Issue 340 – Per-user pinned incidents

## Current behavior
- Frontend stores pinned incidents in `localStorage` per event key (e.g., `pinned_reports_${eventSlug}`)
- Effect: preference is per browser/device, not per authenticated user
- Pinned section renders a separate table; previously non-clickable icon fixed to be a button calling `togglePin`

## Problem
- Preference should persist per authenticated user and sync across devices
- LocalStorage-only leads to inconsistent UX and cannot be managed server-side

## Proposal

### Database
- Add table `UserPinnedIncident`
  - `id` (uuid, pk)
  - `userId` (fk → User, indexed)
  - `incidentId` (fk → Incident, indexed)
  - `eventId` (fk → Event, indexed)
  - `createdAt` timestamp
  - Unique composite index on (`userId`, `incidentId`)

### API
- GET `/api/users/me/pins?eventId=...`
  - Returns `{ incidentIds: string[] }`
- POST `/api/events/:eventId/incidents/:incidentId/pin`
  - Pins for current user; idempotent
- DELETE `/api/events/:eventId/incidents/:incidentId/pin`
  - Unpins for current user; idempotent
- Auth: required; RBAC: any authenticated user who can view the incident in that event

### Frontend
- On auth, request current user pins (optionally scoped by event)
- Hydrate local state from server; apply optimistic updates on click
- Fallback to localStorage before auth; on auth, migrate local pins up to server (best effort)
- Keep current UI pattern with pin/unpin toggles; ensure pinned-section icon is clickable to unpin

### Tests
- Backend: integration tests for GET/POST/DELETE, RBAC, idempotency
- Frontend: unit tests for toggle flow (optimistic), hydration from API, fallback behavior

### Docs
- Update API docs and user guide to reflect per-user persistence and sync behavior

---
Notes:
- Maintain existing localStorage key as short-term cache for instant UI; reconcile with server post-login
- Consider rate limiting pin changes if abuse is a concern
