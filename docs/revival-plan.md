# Conducky revival plan

Working checklist. Update as steps finish. Findings and decisions go under each step so a fresh session can resume from this file alone.

Reference setup for conventions: `~/src/github.com/timescale/tiger-den` (not a Tiger Data project; borrow ideas, skip Linear / Memory Engine / runner infra / CLAUDE.md size ratchet / heavy `/pr` fan-out).

## Steps

- [x] 1. Baseline: build stack in Docker, run backend + frontend tests, record what's red (healthy; see log)
- [x] 2. Agent setup: slim CLAUDE.md, AGENTS.md, `.claude/` hooks/skills/agents, GLOSSARY.md, remove `.cursor/` + `.github/instructions/` (branch `chore/agent-setup-and-docs-cleanup`, uncommitted)
- [x] 3. Doc cleanup: archive `reference/`, fix Next 14→15 / Node claims, root script + test fixes (same branch)
- [~] 4. Dep debt. **PR A (in review)**: pin `latest`, in-range security updates, frontend build fix, dependabot config. **Follow-ups, each its own PR, in this order:** (a) Docker images to Node 24, then lift the two holds; (b) nodemailer 6 → 10; (c) jspdf 3 → 4; (d) Prisma 6.10 → latest 6.x; (e) website: Docusaurus 3.10 + Netlify Node + audit fix; (f) Tailwind 3 → 4 (optional, build-time chain only)
- [ ] 5. Issue triage: ~70 stale issues, none touched since Aug 2025 (`/triage-issues`)

## Decisions and parked ideas

- **Docs hosting is intentional, keep both.** conducky.com (Netlify, `website/netlify.toml`) is the homepage + docs; Read the Docs (`.readthedocs.yaml`) builds the same Docusaurus site on every push to `main` (151 builds, latest = HEAD). Only nit: Netlify pins Node 18, RTD pins Node 20.
- **One branch for steps 2+3**, one PR. Steps 4 and 5 get their own.
- **Parked until stable (after step 5): make conducky deployable on Vercel as well as Railway/Docker and others.** Needs a deploy-target story: Next.js frontend on Vercel is easy; the Express backend + Postgres + uploaded files (stored in DB today, issue #240) + sessions + rate-limit tables need an answer (serverless Express, separate host, or port to route handlers). Don't start before steps 1-5 are done.

## Known problems still open (from initial review, 2026-10-22)

- **Docker images run `node:18-alpine`** (both Dockerfiles; EOL Apr 2025), while CI and the docs say Node 24. Found when a newer jsdom crashed the container with `ERR_REQUIRE_ESM`. Fix = step 4 follow-up (a). RTD builds on Node 20 (EOL Apr 2026), Netlify on 18; both want a bump when the website moves to Docusaurus 3.10 (needs Node 20+; 3.10 also needs `@docusaurus/faster` because of `future.v4`)
- Remaining prod vulns after PR A: backend `nodemailer` (fix only in v10); frontend `jspdf` (critical, fix only in v4), plus Tailwind 3 build-tool chain (braces/micromatch/chokidar/fast-glob) and Next's bundled postcss (fix only in Next 16). Website: 91 total / 20 critical, all build-time Docusaurus tooling (static site, no runtime exposure)
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

## Step 4 log, PR A (2026-10-23): branch `chore/dependency-debt`

Production-dependency audit (`npm audit --omit=dev`), main -> this branch: **backend 18 vulns (2 critical, 10 high) -> 1 (0 critical, 1 high: nodemailer)**; **frontend 23 (2 crit, 16 high) -> 11 (1 crit: jspdf, 6 high)**.

Changed:
- Pinned `"latest"`: `express ^5.3.0`, `next ^15.5.28`, `react`/`react-dom ^19.3.1`
- `npm update` within existing ranges in `backend/` and `frontend/` (+ non-breaking `npm audit fix` in frontend). Includes handlebars (critical), multer, validator, qs, body-parser, lodash; Next 15.3.3 -> 15.5.28 (fixes the critical image-optimizer / Flight RCE advisories; Next 16 is **not** needed); dompurify 3.2.6 -> 3.4.17
- **Holds** (also encoded in `.github/dependabot.yml` `ignore`): `prisma` + `@prisma/client` exact `6.10.1` (6.19 changes `Bytes` to `Uint8Array<ArrayBuffer>` -> 5 TS errors, 18 suites fail); `isomorphic-dompurify ~2.26.0` (2.27+ uses jsdom 27 -> ESM-only deps -> `ERR_REQUIRE_ESM` on Node 18 and "Unexpected token export" in Jest)
- **Fixed a pre-existing break on `main`**: `next build` failed on `react/prop-types` in `components/ui/form.tsx` (from the a11y commits, 2026-05-28/06-25). Verified on clean `main` with its original lockfile. Nothing in CI built the frontend, so a release tag would have failed at Docker publish. Fixed with the repo's usual `eslint-disable-next-line`, and **added a `npm run build` step to the frontend CI job**
- Added `.github/dependabot.yml`: monthly, grouped minor+patch, ignores above. (There was none; the 18 PRs were ungrouped security updates)

Verified: backend 42/42 suites (365 tests), type-check clean, `/health` 200; frontend 20/20 (134), `tsc` = same 19 old test-fixture errors only, production `next build` passes on Node 18 (the Docker image's Node), pages return 200.

Tried and reverted: website `npm audit fix` (floated `@docusaurus/plugin-client-redirects` to 3.10.2 vs core 3.8.1: Docusaurus requires one exact version across `@docusaurus/*`; aligning on 3.10.2 then needs `@docusaurus/faster` + Node 20+; a different `audit fix` result broke webpack's Progress plugin). Website left untouched; follow-up (e).

Lesson: a blanket `npm update` is not safe here even in-range (Prisma minors, jsdom majors via transitive caret). Always run tests, the production build and a container restart.

## Step 2 + 3 log (2026-10-22): DONE, merged in PR #460

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
