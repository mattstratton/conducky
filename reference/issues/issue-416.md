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
- [ ] Update `backend/src/services/unified-rbac.service.ts`:
  - [ ] Remove org-admin implicit inheritance from `hasEventRole` (or gate it behind an env flag defaulting to disabled, e.g., `RBAC_ORG_INHERITS_EVENT=false`).
  - [ ] Ensure performance remains acceptable using cached roles; preserve system admin logic and direct event role checks.
  - [ ] Unit tests for `hasEventRole` covering: direct event role; system admin; org admin without explicit event role (should be denied); error paths.

#### Backend: Event creation path
- [ ] Modify `backend/src/controllers/organization.controller.ts#createEvent`:
  - [ ] After creating the event, fetch all current Org Admins for the `organizationId` from unified roles.
  - [ ] Grant `event_admin` on the newly created event to each Org Admin (including the creator if applicable), using `unifiedRBAC.grantRole(...)`.
  - [ ] Audit log each granted role association with a clear action (e.g., `grant_event_admin_on_event_creation`).
  - [ ] Integration test: When an Org Admin creates an event, all Org Admins for that organization become `event_admin` for the event.

#### Data migration / Backfill
- [ ] Add a one-time script `backend/scripts/assign-org-admins-to-events.ts`:
  - [ ] For each organization → for each event → enumerate current org admins and grant `event_admin` if missing.
  - [ ] Idempotent and safe to re-run.
  - [ ] Writes audit logs for assignments; outputs a summary.
  - [ ] Provide npm script to run inside Docker: `docker compose exec backend npm run backfill:org-admins-to-event-admins`.
  - [ ] Document how and when to run it (dev/staging/prod).

#### Seeds and fixtures
- [ ] Update any seeds that currently rely on implicit inheritance to explicitly assign roles:
  - [ ] `backend/prisma/org-seed.js`: ensure all Org Admins are assigned `event_admin` for seeded events (not just the first admin).
  - [ ] `backend/prisma/sample-data-seed.js` (unified roles) to reflect explicit event assignment where relevant.

#### Tests
- [ ] Backend integration tests adjustments/additions:
  - [ ] Update tests that previously assumed org-admin inheritance to event access.
  - [ ] Add tests verifying Org Admin without explicit event role cannot access event data.
  - [ ] Verify event creation grants `event_admin` to all Org Admins.
  - [ ] Ensure existing RBAC tests for Reporter/Responder/Event Admin/System Admin continue to pass.
- [ ] Frontend tests should continue to pass; adjust any that assume inheritance if present.

#### Frontend UX/Copy
- [ ] Clarify in UI where relevant that Org Admins do not automatically have access to event data; they must be explicitly added as Event Admins.
  - [ ] Add small helper text to `org` events list and/or event creation success toast/modal: “All current organization admins were added as Event Admins for this event.”
  - [ ] Consider a tooltip/info callout on organization dashboards about access model.
  - [ ] No permission logic changes needed on client; server enforces RBAC.

#### Documentation
- [ ] Update role inheritance docs to remove org-admin→event-admin implicit inheritance:
  - [ ] `website/docs/admin-guide/roles-permissions.md`: remove/replace statement that Org Admins automatically inherit Event Admin permissions.
  - [ ] `website/docs/user-guide/event-management/overview.md`: adjust “Who Can Manage Events → Organization Admins” to clarify explicit assignment on creation and no implicit access otherwise.
  - [ ] If an env flag is added for a phased rollout, document it under developer/security docs and default behavior.
- [ ] Document backfill script usage in `website/docs/developer-docs/testing.md` and/or admin/deployment docs, including safety notes.

#### Observability & Audit
- [ ] Ensure audit logging for auto-assignments on creation and backfill runs.
- [ ] Add log lines for the RBAC check path to help diagnose access decisions (ensure no sensitive data in logs).

### Rollout Strategy
- Preferred: Direct switch to explicit assignment with a backfill, since tests currently all pass and RBAC is unified.
- Optional safety: Introduce `RBAC_ORG_INHERITS_EVENT` feature flag defaulting to `false`. In emergency, set `true` to temporarily restore old behavior.
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

### Open Questions (for review)
- Should adding/removing an Org Admin automatically sync event roles for existing events? Or should this remain a manual/administrative action for now?
- Do we want the feature flag for inheritance as a temporary safety valve, or proceed with a clean removal?


