---
name: docs-review
description: Check whether the current branch's changes leave documentation stale. Use before a PR, when the user says "docs review", or when /pr calls for it.
---

# /docs-review

1. **List changed files**: `git fetch origin main --quiet && git diff --name-only origin/main...HEAD` plus uncommitted (`git status --short`).
2. **Map code to docs.** For each category that changed, read the matching doc and compare against the code:

   | Changed | Check |
   |---|---|
   | `backend/src/routes/**`, controllers | `website/docs/developer-docs/api-documentation.md`, `website/docs/api/`, Swagger JSDoc on the route |
   | `backend/prisma/schema.prisma`, migrations | `website/docs/developer-docs/data-model.md` |
   | roles, RBAC middleware, invite logic | `website/docs/admin-guide/roles-permissions.md`, `GLOSSARY.md` |
   | encryption, auth, rate limiting, logging | `website/docs/developer-docs/security-*.md`, `website/docs/admin-guide/security-overview.md`, `logging-configuration.md` |
   | user-facing frontend pages/components | matching page in `website/docs/user-guide/` (incident states, reporting, comments, notifications, profile, orgs...) |
   | env vars, docker-compose, scripts, commands | `README.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `backend/.env.example`, `website/docs/admin-guide/deployment.md` |
   | test setup or commands | `website/docs/developer-docs/testing/`, `CLAUDE.md` |
   | new domain term or renamed concept | `GLOSSARY.md` |

3. **Classify.**
   - **Required**: a doc now contradicts the code (wrong endpoint, role, command, env var, state). Fix it.
   - **Recommended**: a doc could mention the change but isn't wrong. Report, don't block.
4. Don't flag docs that are already accurate. Cite file paths. Don't edit `docs/archive/` (history).
5. Output: `Verdict: required updates | recommended updates | docs are current`, then the two lists. Apply required fixes unless the user says otherwise.
