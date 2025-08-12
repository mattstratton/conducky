### 2025-08-12 – Fixes for Issue #325 and Issue #302

- Updated default unified roles migration:
  - Added `CREATE EXTENSION IF NOT EXISTS pgcrypto;` to ensure `gen_random_uuid()` is available on fresh DBs.
  - Roles inserted atomically with `ON CONFLICT ("name") DO NOTHING`.
  - Verified migrations apply before app start via entrypoint and ran full backend test suite (green).
  - Posted review comment on [PR #403](https://github.com/mattstratton/conducky/pull/403) summarizing changes and confirmation. 

- Implemented Issue #302 (incorrect admin endpoint usage on login page):
  - Added public backend route `GET /api/oauth-providers` in `backend/src/routes/oauth.routes.ts`.
  - Exported and mounted in `backend/src/routes/index.ts` and `backend/index.ts`.
  - Updated `frontend/pages/login.tsx` to call `/api/oauth-providers`.
  - Ran backend and frontend tests via Docker Compose – all tests passed.

- Branch/state:
  - Migration enhancement committed on current branch.
  - Issue #302 fix committed on `issues/issue-302`.

- Next steps:
  - Push `issues/issue-302` and open a PR; merge after review.
  - Merge PR #403 once approved.
