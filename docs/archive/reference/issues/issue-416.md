## Issue 416: Review how org admins have access to events

### Context
- Current behavior (code + docs): Organization Admins implicitly inherit Event Admin permissions for all events within their organization via `UnifiedRBACService.hasEventRole(...)` organization admin inheritance check.
- Issue proposes: Remove implicit inheritance. Instead, when an event is created under an organization, all current Org Admins for that organization should be explicitly granted `event_admin` on the event. Org Admins should not otherwise have access to event data without explicit event roles.

### Goals
- Align implementation with explicit role assignment model.
- Maintain multi-tenancy and RBAC guarantees; avoid accidental data exposure.
- Provide migration/backfill path and clear UX/documentation.

### Non-Goals
- Do not introduce broad automatic syncing of org admins to all existing events on every membership change (complex policy). Provide a deliberate backfill/script instead.
- Do not change System Admin semantics (they still do not automatically have event data access).

### Implementation Plan (Checklist)

#### Backend: RBAC behavior
- [x] Update `backend/src/services/unified-rbac.service.ts`:
  - [x] Remove org-admin implicit inheritance from `hasEventRole` (or gate it behind an env flag defaulting to disabled, e.g., `RBAC_ORG_INHERITS_EVENT=false`).
  - [ ] Ensure performance remains acceptable using cached roles; preserve system admin logic and direct event role checks.
  - [x] Unit tests for `hasEventRole` covering: direct event role; system admin; org admin without explicit event role (should be denied); error paths.

#### Backend: Event creation path
- [x] Modify `backend/src/controllers/organization.controller.ts#createEvent`:
  - [x] After creating the event, fetch all current Org Admins for the `organizationId` from unified roles.
  - [x] Grant `event_admin` on the newly created event to each Org Admin (including the creator if applicable), using `unifiedRBAC.grantRole(...)`.
  - [x] Audit log each granted role association with a clear action (e.g., `grant_event_admin_on_event_creation`).
  - [x] Integration test: When an Org Admin creates an event, all Org Admins for that organization become `event_admin` for the event.

#### Data migration / Backfill
- [x] Add a one-time script `backend/scripts/assign-org-admins-to-events.js`:
  - [x] For each organization → for each event → enumerate current org admins and grant `event_admin` if missing.
  - [x] Idempotent and safe to re-run.
  - [ ] Writes audit logs for assignments; outputs a summary. (skipped per decision)
  - [x] Provide npm script to run inside Docker: `docker compose exec backend npm run backfill:org-admins-to-event-admins`.
  - [x] Document how and when to run it (dev/staging/prod).

#### Seeds and fixtures
- [x] Update any seeds that currently rely on implicit inheritance to explicitly assign roles:
  - [x] `backend/prisma/org-seed.js`: ensure all Org Admins are assigned `event_admin` for seeded events (not just the first admin).
  - [x] `backend/prisma/sample-data-seed.js` (unified roles) to reflect explicit event assignment where relevant.

#### Tests
- [ ] Backend integration tests adjustments/additions:
  - [ ] Update tests that previously assumed org-admin inheritance to event access.
  - [ ] Add tests verifying Org Admin without explicit event role cannot access event data.
  - [x] Verify event creation grants `event_admin` to all Org Admins.
  - [x] Ensure existing RBAC tests for Reporter/Responder/Event Admin/System Admin continue to pass.
- [x] Frontend tests should continue to pass; adjust any that assume inheritance if present.

#### Frontend UX/Copy
- [x] Clarify in UI where relevant that Org Admins do not automatically have access to event data; they must be explicitly added as Event Admins.
  - [x] Add small helper text to `org` events list and/or event creation success toast/modal: “All current organization admins were added as Event Admins for this event.”
  - [x] Consider a tooltip/info callout on organization dashboards about access model.
  - [x] No permission logic changes needed on client; server enforces RBAC.

#### Documentation
- [x] Update role inheritance docs to remove org-admin→event-admin implicit inheritance:
  - [x] `website/docs/admin-guide/roles-permissions.md`: remove/replace statement that Org Admins automatically inherit Event Admin permissions.
  - [x] `website/docs/user-guide/event-management/overview.md`: adjust “Who Can Manage Events → Organization Admins” to clarify explicit assignment on creation and no implicit access otherwise.
  - [ ] If an env flag is added for a phased rollout, document it under developer/security docs and default behavior. (not applicable — clean removal)
- [x] Document backfill script usage in `website/docs/developer-docs/testing/overview.md` and/or admin/deployment docs, including safety notes.

#### Observability & Audit
- [x] Ensure audit logging for auto-assignments on creation.
- [ ] Ensure audit logging for backfill runs. (skipped per decision)
- [ ] Add log lines for the RBAC check path to help diagnose access decisions (ensure no sensitive data in logs).

### Rollout Strategy
- Clean removal: Switch to explicit assignment (remove org-admin inheritance entirely) with a backfill to preserve current access where intended.
- Validate in staging by running the backfill and smoke testing access patterns for Org Admins vs Event Admins.

### Risks and Mitigations
- Risk: Existing Org Admins lose access to events where they were relying on implicit inheritance.
  - Mitigation: Run backfill to grant explicit `event_admin` on all existing events to current Org Admins before flipping behavior.
- Risk: Newly added Org Admins expect access to existing events.
  - Mitigation: Document process to grant event roles, and optionally add an admin tool later to “sync org admins to selected events.”

### Acceptance Criteria
- Org Admins without explicit event roles cannot access event data for that event.
- When an event is created under an organization, all current Org Admins for that org are explicitly granted `event_admin` on that event.
- Backfill script successfully assigns `event_admin` to current Org Admins across existing events and logs actions.
- Documentation updated to reflect explicit assignment model.
- All tests pass (`npm run test:all` in Docker).

### Clarification: Auto-sync question
When someone becomes an Org Admin (or is removed), should their event roles on all existing events in that organization be automatically granted (or revoked)? This plan opts not to auto-sync to avoid unexpected access changes across many events.

### Decisions
- Do not auto-sync Org Admin membership changes to existing events. Provide admin tooling later for on-demand "sync org admins to selected events" if needed.
- Proceed with clean removal (no feature flag). Backfill script will be provided and safe to run multiple times.

### Backfill Execution Notes
- Development/Local (Docker):
  - `docker compose exec backend npm run backfill:org-admins-to-event-admins -- --dry-run`
  - `docker compose exec backend npm run backfill:org-admins-to-event-admins`
- Production: Run as a one-off job with `DATABASE_URL` pointing to production and include a dry-run first.
  - Example (one-off runner): `DATABASE_URL=postgres://... npm run backfill:org-admins-to-event-admins -- --dry-run`
  - Then run without `--dry-run` after review. Ensure audit logs are enabled to record assignments.


