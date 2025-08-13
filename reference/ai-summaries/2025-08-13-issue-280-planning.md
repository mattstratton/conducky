### Session summary (2025-08-13): Issue 280 planning and baseline

- Reviewed GitHub issue #280 requirements for org analytics endpoints and exports.
- Scanned backend code: org routes (`backend/src/routes/organization.routes.ts`) and controller exist; no analytics endpoints yet. Event-level export implementation is available for reuse.
- Verified Prisma relationships: `Incident` → `Event` → `Organization` present; helpful indexes exist on `Incident`.
- Frontend page: org analytics UI currently at `frontend/pages/orgs/[orgSlug]/incidents/index.tsx` uses mock data.
- Ran full tests in Docker:
  - Backend: 39/39 suites passed (353 tests).
  - Frontend: 19/19 suites passed (130 tests).
- Created implementation plan and tracking doc: `reference/issues/issue-280.md` with API design, tasks, and progress checklist.

Next up: implement `organization-analytics.service.ts`, add controller methods and routes, write unit/integration tests, and replace frontend mocks with live API.

