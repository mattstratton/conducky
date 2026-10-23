# Conducky revival plan

Working checklist. Update as steps finish. Findings and decisions go under each step so a fresh session can resume from this file alone.

Reference setup for conventions: `~/src/github.com/timescale/tiger-den` (not a Tiger Data project; borrow ideas, skip Linear / Memory Engine / runner infra / CLAUDE.md size ratchet / heavy `/pr` fan-out).

## Steps

- [x] 1. Baseline: build stack in Docker, run backend + frontend tests, record what's red (healthy; see log)
- [x] 2. Agent setup: slim CLAUDE.md, AGENTS.md, `.claude/` hooks/skills/agents, GLOSSARY.md, remove `.cursor/` + `.github/instructions/` (branch `chore/agent-setup-and-docs-cleanup`, uncommitted)
- [x] 3. Doc cleanup: archive `reference/`, fix Next 14→15 / Node claims, root script + test fixes (same branch)
- [ ] 4. Dep debt: pin `latest` (next, react, express), triage 18 dependabot PRs (Next 16 and nodemailer 7 majors get their own PRs)
- [ ] 5. Issue triage: ~70 stale issues, none touched since Aug 2025 (`/triage-issues`)

## Decisions and parked ideas

- **Docs hosting is intentional, keep both.** conducky.com (Netlify, `website/netlify.toml`) is the homepage + docs; Read the Docs (`.readthedocs.yaml`) builds the same Docusaurus site on every push to `main` (151 builds, latest = HEAD). Only nit: Netlify pins Node 18, RTD pins Node 20.
- **One branch for steps 2+3**, one PR. Steps 4 and 5 get their own.
- **Parked until stable (after step 5): make conducky deployable on Vercel as well as Railway/Docker and others.** Needs a deploy-target story: Next.js frontend on Vercel is easy; the Express backend + Postgres + uploaded files (stored in DB today, issue #240) + sessions + rate-limit tables need an answer (serverless Express, separate host, or port to route handlers). Don't start before steps 1-5 are done.

## Known problems still open (from initial review, 2026-10-22)

- `next`/`react`/`express` are `"latest"` in package.json (step 4)
- 18 open dependabot PRs, oldest Jul 2025 (step 4)
- ~70 open issues, stale/duplicated (step 5)
- Backend CI needs repo secrets, so fork PRs can't run backend tests
- Frontend: 19 `tsc` errors, all in test files (`IncidentDetailView.test.tsx`, `CoCTeamList.test.tsx`, `KeyboardNavigationTest.test.tsx`); no frontend `type-check` script
- Backend tests mock Prisma almost everywhere; hardcoded `localhost:5432/conducky_test` in `jest.setup.js` is meaningless inside the container
- `backend/scripts/security-audit.js` and `phase1-cleanup.js` still write into `reference/` (one-shot legacy scripts; probably delete)
- Root-level `.deepsource.toml`, `.codebeatignore` (and README badges for codebeat/sonarcloud): check whether those services are still connected
- `scripts/refresh-dev.sh` runs `docker system prune -af --volumes` behind a y/N prompt; now blocked for agents by `scripts/guard-bash.sh`

## Step 1 log (2026-10-22): DONE

**Result: healthy.** Stack builds and runs; backend 42/42 suites (365 tests); frontend 20/20 suites (134 tests); GH CI on `main` green (last run: merge of #459).

- `backend/.env` is required by compose and doesn't exist on a fresh clone: `cp backend/.env.example backend/.env`, set `ENCRYPTION_KEY` (`openssl rand -base64 32`) and `SESSION_SECRET`. Gitignored.
- 4 backend suites `require('../../dist/...')`, so without a prior `npm run build` they failed with "Cannot find module" (and with a *stale* build they'd silently test old code). Fixed in step 2/3 by importing from `src/`.
- Frontend `tsc --noEmit`: 19 errors, all test fixtures. `next build` has `ignoreBuildErrors: false`.
- Not checked: `next build` (would collide with the dev server's `.next` bind mount), eslint, website build.

## Step 2 + 3 log (2026-10-22): DONE, uncommitted on `chore/agent-setup-and-docs-cleanup`

Added:
- `CLAUDE.md` rewritten (258 → ~75 lines; fixed Next 15 / Express 5 / setup / commands; security invariants; golden rules)
- `AGENTS.md` (defers to CLAUDE.md), `GLOSSARY.md`, `.github/pull_request_template.md`
- `.claude/settings.json` (hooks, permissions allowlist, superpowers plugin)
- `scripts/guard-bash.sh` (blocks push to/from `main`, `down -v`, `system prune`, `refresh-dev`, `migrate reset`), `scripts/guard-migration-edit.sh` (blocks editing Prisma migrations already on `origin/main`). Both unit-tested with fake hook JSON. Known quirk: guard matches the command *text*, so a commit message containing e.g. "down -v" gets blocked; put such text in a file.
- Skills: `/pr`, `/triage-issues`, `/implement-issue`, `/docs-review`. Agents: `security-reviewer`, `accessibility-reviewer`.

Removed / moved:
- `.cursor/rules/*`, `.github/instructions/*` (old rules: summary file every session, "run all tests at session start", "never push", bot footer; all superseded by CLAUDE.md)
- root `eslint.config.mjs` (no-op stub), `.eslintrc.yml`, `.eslintignore` (legacy, no root eslint installed; frontend has its own config)
- `reference/` and `documentation-update-summary.md` → `docs/archive/` (git mv, history kept); markdownlint/vscode/gitignore paths updated
- `frontend/tsconfig.tsbuildinfo` untracked + `*.tsbuildinfo` gitignored

Fixed:
- Root `package.json`: dropped dead `main`/`dev`/`start`/`build`/`type-check`, fixed `refresh-dev` path, `test:all` now `&&`-chained (a failing backend suite no longer exits 0)
- `docker-compose.yml`: removed obsolete `version:`
- 4 backend tests import `src/` not `dist/`
- Next.js 14 → 15 and Node 18+ → 24+ in README/CONTRIBUTING; one broken link in `website/README.md`

Verified (after changes, `dist/` deleted): backend 42/42 (365), frontend 20/20 (134), root `npm run test:all` exit 0.

Not done on purpose: no PR/commit yet (waiting on user), `website/docs/developer-docs/testing/` not reviewed for stale content (do in a later docs pass), README feature/arch sections not audited beyond version numbers.
