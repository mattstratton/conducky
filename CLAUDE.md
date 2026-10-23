# Conducky

Multi-tenant Code of Conduct incident management for conferences and events. Safety-critical: security, accessibility and mobile UX beat development speed. Vocabulary lives in [`GLOSSARY.md`](GLOSSARY.md); use those terms (it's **incident**, not "report", and **System Admin**, not "SuperAdmin").

## Stack

- **Frontend** (`frontend/`): Next.js 15 (Pages Router), React, TypeScript, Tailwind 3, Shadcn/ui, Jest + RTL
- **Backend** (`backend/`): Node, Express 5, TypeScript, Prisma 6, PostgreSQL 15, Passport (local, Google, GitHub), Jest + supertest
- **Docs site** (`website/`): Docusaurus. User/admin/developer docs live in `website/docs/`
- **Dev env**: Docker Compose. Run backend/frontend commands inside the containers

## Setup and commands

```bash
cp backend/.env.example backend/.env   # then set ENCRYPTION_KEY (openssl rand -base64 32) and SESSION_SECRET
docker compose up --build -d           # frontend :3001, backend :4000, Prisma Studio :5555
docker compose exec backend npm run sample-data   # optional demo data

docker compose exec backend npm test
docker compose exec frontend npm test
npm run test:all                                  # both, from repo root
docker compose exec backend npm run type-check
docker compose exec backend npx prisma migrate dev --name <what_changed>   # schema change = new migration
```

Roles and logging settings seed automatically on backend start. `ENCRYPTION_KEY` (32+ chars) is required or the backend won't boot.

## Golden rules

- **Diagnose before fixing.** Read the error, trace the code, state a hypothesis, then fix. After 3 failed attempts at the same kind of fix, stop and reassess.
- **Never dismiss failures.** Failing tests, CI, type errors, lint: investigate every one. No "pre-existing".
- **Nothing destructive without asking.** No `docker compose down -v`, `docker system prune`, `scripts/refresh-dev.sh`, `prisma migrate reset`, or DELETE/DROP/TRUNCATE without a WHERE, even in dev. The hook in `scripts/guard-bash.sh` blocks the obvious ones.
- **Migrations are append-only.** Create them with `prisma migrate dev`. Never edit a migration that's on `main` (hook-enforced).
- **Never commit to or push `main`.** Branch off `main`, stage specific files (no `git add -A`), push and open PRs only when asked, via `/pr`.
- **Tests ship with the code.** New feature, new endpoint or bug fix means automated tests in the same PR. Bug fixes get a regression test.
- **Keep docs true.** Behavior, env var, role or API change means update `website/docs/` (and README/CONTRIBUTING if setup changed). `/docs-review` checks this.

## Security invariants (don't regress these)

- **Event-scoped data.** Every query touching event data is scoped to the event. Event data is isolated between events and between orgs.
- **No inherited event access.** System Admins and Org Admins can't read event data without an explicit event role. Org Admins are added as Event Admins on event *creation* only. See `website/docs/admin-guide/roles-permissions.md`.
- **Authz at every layer.** Check `req.user` and role in middleware (`backend/src/middleware/unified-rbac.ts`) and hide unauthorized UI. Don't rely on one.
- **Sensitive fields are encrypted** (AES-256-GCM, `backend/src/utils/encryption`): incident text, comments, contact emails, OAuth and SMTP credentials. Don't log or return them casually, and never return password hashes or tokens.
- **Audit-log security-relevant actions** with the `logAudit` helper. Rate-limit auth endpoints. Validate input server-side (express-validator) and sanitize rendered content (DOMPurify).

## Conventions

- **Backend**: routes in `src/routes/` call services in `src/services/`; keep business logic out of route handlers. Consistent error response shape. Unified RBAC (`UnifiedRole`, scopes system/organization/event).
- **Frontend**: Shadcn/ui first (add missing ones with the shadcn CLI), Tailwind only, mobile-first, 44px touch targets. Every async path gets loading and error states. Shared UI in `components/`, global state via `context/`.
- **Accessibility is a requirement**: semantic HTML, labels on every input, keyboard reachable, visible focus, WCAG AA contrast, form errors announced to screen readers. The repo takes outside a11y PRs; keep that bar.
- **TypeScript**: strict, no new `any`. Function components with hooks.
- **Tests**: backend `backend/tests/` (unit, integration, routes, services), frontend co-located `*.test.tsx` plus `frontend/__tests__/`. Read a neighbouring test before writing one. Backend tests mostly mock Prisma, so passing tests do not prove the SQL works; exercise real queries in the dev stack when touching them.

## Workflow

- **Issues**: GitHub Issues on `mattstratton/conducky`. Use `gh`. Bugs get `bug`, features get `enhancement`; labels drive release notes (`.github/release.yml`).
- **Commits/PRs**: reference issues with `Closes #N`. PR template is in `.github/pull_request_template.md`.
- **Skills** (`.claude/skills/`): `/implement-issue`, `/pr`, `/triage-issues`, `/docs-review`. Reviewer agents in `.claude/agents/`: `security-reviewer`, `accessibility-reviewer`.
- Other agents (Codex, Copilot, etc.): see `AGENTS.md`, which defers to this file.

## Where things are

- Data model: `backend/prisma/schema.prisma`, `website/docs/developer-docs/data-model.md`
- Security: `website/docs/developer-docs/security-architecture.md`
- API docs: Swagger at `localhost:4000/api-docs` when running
- Revival checklist and open decisions: `docs/revival-plan.md`
- `docs/archive/` is old planning and per-session notes. History, **not** source of truth; it contradicts current code in places.
