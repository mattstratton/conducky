## Issue 280: Implement Backend API for Organization Incident Analytics Dashboard

Link: [#280](https://github.com/mattstratton/conducky/issues/280)

### Goal
Replace frontend mock data for the organization analytics dashboard with real backend APIs, add org-level exports, and wire the frontend to consume them with proper RBAC and performance.

### Current State (discovery)
- Frontend page found at `frontend/pages/orgs/[orgSlug]/incidents/index.tsx` renders the org analytics UI but uses mock data for metrics and charts.
- Backend has organization routes in `backend/src/routes/organization.routes.ts` and controller in `backend/src/controllers/organization.controller.ts` with RBAC via `UnifiedRBACService`.
- Prisma models: `Incident` (with `state`, `severity`, timestamps) relates to `Event`, which has `organizationId` (see `backend/prisma/schema.prisma`).
- Event-level export endpoints already exist and are tested (CSV/text) in `backend/src/routes/event/incidents.routes.ts`.
- Test baseline: backend (39/39) and frontend (19/19) all green.
- Note: Issue text references `/orgs/[orgSlug]/reports`, while code uses `/orgs/[orgSlug]/incidents`. We will implement APIs and update the existing page; optional route rename can be handled later.

### Deliverables
- New service: `backend/src/services/organization-analytics.service.ts`
- New controller methods in `OrganizationController` for analytics, events summary, and exports
- New routes in `organization.routes.ts`
- Tests (unit + integration) for analytics and exports
- Frontend: replace mock data in `frontend/pages/orgs/[orgSlug]/incidents/index.tsx` with real API calls; add loading/error states as needed

### API Design
1) GET `/api/organizations/:organizationId/reports/analytics`
   - Alternative: GET `/api/organizations/slug/:orgSlug/reports/analytics`
   - Query: `timeRange=30d|90d|1y|all` (default 30d), `eventId?`
   - Response:
     ```ts
     {
       metrics: {
         totalReports: number;
         pendingReports: number;
         avgResolutionTime: number; // hours
         escalatedReports: number;
       };
       byStatus: { status: string; count: number; percentage: number }[];
       bySeverity: { severity: string; count: number; percentage: number }[];
       byEvent: { eventName: string; eventSlug: string; count: number }[];
       monthlyTrends: { month: string; count: number; resolved: number }[];
       recentReports: {
         id: string; title: string; status: string; severity: string;
         eventName: string; submittedAt: string; assignedTo?: string;
       }[];
     }
     ```

2) GET `/api/organizations/:organizationId/events/summary`
   - Response:
     ```ts
     {
       totalEvents: number;
       activeEvents: number;
       events: { id: string; name: string; slug: string; isActive: boolean; reportCount: number; teamSize: number; }[];
     }
     ```

3) Exports
   - GET `/api/organizations/:organizationId/reports/export/csv`
   - GET `/api/organizations/:organizationId/reports/export/pdf`
   - Query: `timeRange`, `eventId?`, `status?`, `severity?`
   - CSV mirrors event-level export plus event column; PDF can be text format initially (follow event export pattern).

### Implementation Details
- RBAC: Use `UnifiedRBACService` to ensure the caller has any org role (`org_admin` or `org_viewer`) for the target organization.
- Scoping: All queries must filter incidents by events with `organizationId = :organizationId` and time range where applicable.
- Time ranges: compute `startDate` based on `timeRange` (default 30d), `endDate = now()`.
- Aggregations:
  - Counts by status: group by `Incident.state`
  - Counts by severity: group by `Incident.severity`
  - By event: group by `Event.id` with `name`, `slug`
  - Monthly trends: bucket on `date_trunc('month', Incident.createdAt)`; include resolved counts based on `state` transitions or `state = resolved/closed` at month end; if no history table exists, approximate by counting incidents with `state IN (resolved, closed)` created in month
  - Average resolution time: if there is no explicit resolution timestamp, approximate using `updatedAt` for incidents currently in `resolved|closed`; unit: hours
  - Recent reports: last 10 incidents by `createdAt desc`, include basic fields and `assignedResponder.name` when present
- Performance: add indexes if any aggregation proves slow (we already have indexes on `state`, `severity`, `createdAt`, and `eventId`). Consider light caching for the analytics response (e.g., 60s) in-memory at service layer (optional stretch).

### Testing Plan
- Unit tests: `backend/tests/unit/organization-analytics.service.test.js`
  - Time-range calculation
  - Aggregations (status, severity, events, monthly trends)
  - Avg resolution time logic
  - RBAC guards at service entry where applicable
- Integration tests: `backend/tests/integration/organization-analytics.test.js`
  - GET analytics by orgId and by slug
  - GET events summary
  - Exports (CSV/text), authZ enforced, format headers, basic content
  - Error cases: invalid org, no access, invalid params
- Frontend adjustments: update org incidents page to call analytics endpoint; include loading/error states. Add/adjust tests if needed in `frontend/__tests__/` to assert fetch path and render states.

### Frontend Wiring
- Replace mock in `frontend/pages/orgs/[orgSlug]/incidents/index.tsx` with:
  - Fetch org by slug: `GET /api/organizations/slug/:orgSlug`
  - Fetch analytics for org: `GET /api/organizations/:organizationId/reports/analytics?timeRange=...&eventId=...`
  - Optional: events summary if needed for dropdowns
  - Hook up export buttons to new org-level export endpoints

### Tasks & Progress
- [x] Read issue and scan codebase
- [x] Run backend and frontend tests (all green)
- [x] Draft plan and tracking document
- [x] Create `OrganizationAnalyticsService` with methods: getOverviewMetrics, getDistributions, getMonthlyTrends, getRecentReports, getEventsSummary, exportCsv, exportPdfText
- [x] Add controller methods in `OrganizationController` for:
  - [x] GET by orgId analytics
  - [x] GET by orgSlug analytics
  - [x] GET events summary
  - [x] GET exports (csv/pdf)
- [x] Register routes in `backend/src/routes/organization.routes.ts` under `/api/organizations`
- [x] Unit tests for service
- [x] Integration tests for routes (authz, params, responses, exports)
- [x] Backend changes compile and all backend tests pass
- [x] Frontend: replace mock data fetch with API calls; add loading/error states
- [x] Data model: add `Incident.firstResponseAt`, `Incident.resolvedAt`, `Incident.escalatedAt`, `Incident.reopenedAt`; add `IncidentStateHistory`
- [x] Update incident state transitions to populate new fields and create state history
- [x] Update analytics service to use `resolvedAt` and state history for trends
- [x] Update sample data seed to populate new fields and history
- [x] Create safe Prisma migration, generate client, and run all tests
- [ ] Update `website/docs/developer-docs/testing.md` if test run steps change
- [ ] Verify performance (<2s) on seeded data; add indexes/caching if needed

### Risks / Open Questions
- Path naming: Issue references `/orgs/[orgSlug]/reports` but code uses `/orgs/[orgSlug]/incidents`. Plan: keep existing route and page; align UI copy to “Incidents” for consistency. Optional follow-up to alias `/reports` to the same page.
- Resolution time accuracy: With `resolvedAt` now present, analytics use it instead of `updatedAt`. On reopen, `resolvedAt` is cleared to avoid double-counting; new resolution will set a new `resolvedAt`.
- With the new state history table, analytics can be enhanced later to compute resolved counts per month by `IncidentStateHistory` instead of approximations.

### Next Actions
1) Implement `organization-analytics.service.ts` with Prisma queries scoped by organization
2) Add controller endpoints and routes
3) Write unit + integration tests and run `./scripts/run-all-tests.sh` via Docker
4) Replace frontend mocks with live API and verify UI


