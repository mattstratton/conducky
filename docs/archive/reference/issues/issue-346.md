# Issue 346 – Normalize audit log entity/type from "report" to "incident"

## Overview
- The audit log currently uses the term "report" in places where the domain has standardized on "incident".
- Goal: Ensure all audit log entity/type identifiers, event names, payload keys, UI labels, and documentation consistently use "incident".
- Maintain data integrity and backwards compatibility where needed.

## Current behavior (to validate)
- Backend audit utilities likely emit entries with an entity/type like `report` for incident-related actions.
  - Files to review: 
    - `backend/src/utils/audit.ts`
    - `backend/src/services/audit.service.ts`
    - `backend/src/controllers/audit.controller.ts`
    - `backend/src/routes/audit.routes.ts`
  - Data model: Prisma schema for `AuditLog` (check if `entityType` is string or enum)
- Frontend consumes audit entries and may map or display the type as "report".
  - Files to review:
    - `frontend/lib/audit.ts`
    - `frontend/components/audit/AuditLogTable.tsx`
    - Any other components under `frontend/components/audit/*`
- Tests may assert against `report` literals.
  - `backend/tests/**` and `frontend/__tests__/components/audit/**`
- Website docs reference audit schemas and types.
  - `website/docs/api/schemas/*` and any audit pages

## Problem
- Inconsistent terminology ("report" vs "incident") causes confusion and breaks the domain language used across Conducky (incidents, not reports).
- Persisted audit data may include `entityType = 'report'` which we must migrate to `incident`.

## Proposal

### 1) Data model and database
- If `AuditLog.entityType` is a string column:
  - Write a migration to update existing rows: `UPDATE "AuditLog" SET "entityType" = 'incident' WHERE "entityType" = 'report';`
- If it is a Postgres enum (e.g., `AuditEntityType`):
  - Use a two-step migration to preserve data:
    1. Add a new enum value `incident` (if not present).
    2. Update rows from `report` to `incident`.
    3. Optionally drop `report` from the enum (requires creating a new enum type and casting, or a raw SQL drop in newer Postgres versions).
- Add a not-null check and, if appropriate, a check constraint to restrict valid values.

### 2) Backend code changes
- Replace `report` with `incident` for entity/type identifiers in all audit emission points:
  - `backend/src/utils/audit.ts`: constants, helper functions, and `logAuditEvent` calls
  - Services that log incident actions (create, update, assign, tag changes, comment add/remove) under `backend/src/services/*` (e.g., `incident.service.ts`, `comment.service.ts`)
  - Routes/controllers that call audit utils
- If there is a centralized type/enum (TypeScript) for audit entities, update it to contain `incident` only.
- Introduce a backwards-compatibility input mapping in the audit read layer (optional, time-boxed):
  - When reading audit rows, if legacy values of `report` are encountered (should be none post-migration), map to `incident`.
- Add a defensive guard in `audit.service.ts` to prevent future usage of `report`.

### 3) Frontend updates
- Update any frontend mapping that displays or filters by audit `type`/`entity`:
  - `frontend/lib/audit.ts` – normalize all values to `incident`
  - `frontend/components/audit/AuditLogTable.tsx` – UI labels and filters
- Ensure that filters or icons are keyed on `incident`.

### 4) API compatibility and docs
- API responses should return `incident` going forward.
- If any public docs or schema files reference `report` for audit logs, update to `incident`:
  - `website/docs/api/schemas/*` (add changelog note)
  - `website/docs/api/*` pages describing audit log payloads
- Add a short migration note in the developer docs about the terminology normalization.

### 5) Migration plan
- Create Prisma migration with raw SQL step to normalize existing data:
  - For string column scenario:
    - `UPDATE "AuditLog" SET "entityType" = 'incident' WHERE "entityType" = 'report';`
  - For enum scenario (Postgres):
    - Add enum value `incident` if missing
    - Update rows to `incident`
    - Optional: Recreate enum without `report` and cast the column to the new enum
- Idempotency: Guard the migration with checks so re-running is safe.
- Run in a transaction; ensure DB backups per deployment process.

### 6) Tests
- Backend integration/unit tests: replace expectations from `report` to `incident`.
- Frontend tests (e.g., `AuditLogTable.test.tsx`): update labels/filters to match `incident`.
- Add a regression test that ensures no `report`-typed entries are emitted by the backend.

### 7) Rollout strategy
- Ship DB migration first, followed by backend and frontend changes in the same release.
- Monitor logs for any attempted emissions with `report`; treat as warnings and fix sources if encountered.

### 8) Risks and mitigations
- Risk: Third-party consumers expecting `report` in audit responses.
  - Mitigation: Provide a short release note, and optionally a temporary compatibility shim mapping `report`→`incident` in read paths.
- Risk: Enum migration complexity.
  - Mitigation: Use proven Postgres enum migration pattern and test in staging.

## Acceptance criteria
- All audit entries for incident domain actions persist with `entityType = 'incident'`.
- No code paths emit `report` for audit entity/type.
- Frontend displays "incident" consistently and filters work.
- DB contains no rows with `entityType = 'report'` post-migration.
- Tests updated and passing locally and in CI.

## Files likely to change
- Backend
  - `backend/src/utils/audit.ts`
  - `backend/src/services/audit.service.ts`
  - Incident-related services/controllers/routes under `backend/src/services/*`, `backend/src/controllers/*`, `backend/src/routes/*`
  - Prisma migration under `backend/prisma/migrations/*`
- Frontend
  - `frontend/lib/audit.ts`
  - `frontend/components/audit/AuditLogTable.tsx`
  - Any audit-related components or filters
- Docs
  - `website/docs/api/schemas/*`
  - `website/docs/api/*` (audit sections)

## Implementation phases
1. Discovery: grep for `"report"` in audit code paths (backend + frontend) and catalog occurrences.
2. DB migration: normalize existing data, update enum if applicable.
3. Backend refactor: replace emissions and constants to `incident`.
4. Frontend refactor: update mappings/labels/filters.
5. Tests: update and add regression tests.
6. Docs: update schemas and guides.

## Notes
- Keep terminology consistent with the broader product language where every user-facing and developer-facing reference is "incident".
- Prefer centralizing entity/type strings in a single source to avoid drift.
