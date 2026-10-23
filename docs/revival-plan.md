# Conducky revival plan

Working checklist. Update as steps finish. Findings and decisions go under each step so a fresh session can resume from this file alone.

Reference setup for conventions: `~/src/github.com/timescale/tiger-den` (not a Tiger Data project; borrow ideas, skip Linear / Memory Engine / runner infra / CLAUDE.md size ratchet / heavy `/pr` fan-out).

## Steps

- [x] 1. Baseline: build stack in Docker, run backend + frontend tests, record what's red (healthy; see log)
- [x] 2. Agent setup: slim CLAUDE.md, AGENTS.md, `.claude/` hooks/skills/agents, GLOSSARY.md, remove `.cursor/` + `.github/instructions/` (merged, PR #460)
- [x] 3. Doc cleanup: archive `reference/`, fix Next 14→15 / Node claims, root script + test fixes (merged, PR #460)
- [~] 4. Dep debt. **Done:** PR A (#461, merged): pin `latest`, in-range security updates, frontend build fix, dependabot config. PR B (#477, merged): Docker images to Node 24, guard-hook fix, temporary dependabot major-ignore. PR C (#480, merged): nodemailer 6 → 10. PR D (#486, merged): jspdf 3 → 4. **PR E (this branch, `chore/prisma-6-latest`):** Prisma 6.10 → 6.19.3. **Remaining, each its own PR, in this order:** (f) **Prisma 6 → 7** (decided: do it soon, not parked; it is the only fix for the `deepmerge-ts` advisory below, and the `prisma.config.ts` / driver-adapter changes need reading first); (e) website: Docusaurus 3.10 + Netlify Node + audit fix; (g) Tailwind 3 → 4 (optional, build-time chain only). Also: close superseded dependabot PRs (see log)
- [ ] 5. Issue triage: ~70 stale issues, none touched since Aug 2025 (`/triage-issues`)

## Decisions and parked ideas

- **TEMPORARY: dependabot ignores semver-major in all three npm blocks** (`.github/dependabot.yml`). Turning on version updates opened 15 PRs at once (#462-#476), many risky majors (eslint 10, babel 8, `@types/node` 26, dotenv 18, ...). **Remove those three ignore entries once step 4's follow-ups (nodemailer, jspdf, Prisma, website) are done**, so majors come back as individual PRs reviewed one at a time. Don't leave this on: majors carry security fixes.

- **Docs hosting is intentional, keep both.** conducky.com (Netlify, `website/netlify.toml`) is the homepage + docs; Read the Docs (`.readthedocs.yaml`) builds the same Docusaurus site on every push to `main` (151 builds, latest = HEAD). Only nit: Netlify pins Node 18, RTD pins Node 20.
- **One branch for steps 2+3**, one PR. Steps 4 and 5 get their own.
- **Parked until stable (after step 5): make conducky deployable on Vercel as well as Railway/Docker and others.** Needs a deploy-target story: Next.js frontend on Vercel is easy; the Express backend + Postgres + uploaded files (stored in DB today, issue #240) + sessions + rate-limit tables need an answer (serverless Express, separate host, or port to route handlers). Don't start before steps 1-5 are done.

## Known problems still open (from initial review, 2026-10-22)

- ~~Docker images ran `node:18-alpine`~~ fixed in PR B. Still on old Node: RTD builds on Node 20 (EOL Apr 2026) and Netlify on 18; both want a bump when the website moves to Docusaurus 3.10 (needs Node 20+; 3.10 also needs `@docusaurus/faster` because of `future.v4`)
- **Unexplained intermittent test failure** (seen once, 2026-10-23, Node 24): `tests/integration/logs-api.test.js › should accept valid frontend log` got `404` on `POST /api/logs` in the first host-run `npm run test:all` right after `docker compose restart backend`. Not reproduced in 7 later full runs (4 in-container, 3 host) or 3 isolated runs of the suite. `index.ts` mounts `/api` routes synchronously, so it isn't an obvious startup race. Also observed: the dev backend's nodemon restarts while tests run (likely jest writing `backend/ctrf/ctrf-report.json`, which nodemon watches; unverified), which makes `/health` return 000 mid-run. If it recurs, capture `--runInBand` output and whether the dev stack was restarting
- `npm run test:all` runs jest **on the host** against the bind-mounted `node_modules` (not in the container as CLAUDE.md's command list implies). Works while Linux-built native modules aren't loaded by the tests; fragile
- Many tracked files have **CRLF line endings** (Dockerfiles, docker-compose.yml, ...). `sed '...$'` anchors silently fail on them; match without `$`, and keep the CRLFs so diffs stay one line
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

## Step 4 log, PR E (2026-10-23): branch `chore/prisma-6-latest`

`prisma` and `@prisma/client` 6.10.1 -> 6.19.3 (still exact-pinned, still moved together). 6.11+ types `Bytes` as `Uint8Array<ArrayBuffer>`, so the five Prisma writes of uploaded files now pass `new Uint8Array(data)` (`event.service.ts` logo, `incident.service.ts` x2 related files, `organization.service.ts` logo, `user.service.ts` avatar). The old `uploader` type error was a knock-on of the failed `data` overload and went away with it.

- Verified: backend 42/42 suites (365 tests), type-check and build clean, container restarted on 6.19.3 (`/health` 200, 12 migrations found and none pending, seeds ran). On the real dev DB, inside a rolled-back transaction, wrote and read back every byte value (0-255) through all four `Bytes` models (`UserAvatar`, `EventLogo`, `OrganizationLogo`, `RelatedFile`, with the `uploader` include): all identical, nothing left behind. Reads now return `Uint8Array` at runtime, but every read path already wraps it in `Buffer.from(...)` before `res.send`, so file serving is unchanged.
- **Audit regression, accepted:** backend `npm audit --omit=dev` goes 0 -> 3 high. All three are one advisory, GHSA-ggr8-5vv4-36mx (`deepmerge-ts` < 8, stack exhaustion on recursive objects), pulled in by `@prisma/config` (the Prisma CLI's config loader) from 6.13 on. It is not reachable from a request. 6.12.0 is the newest release without it, but is 7 releases older. The only real fix is Prisma 7 (`deepmerge-ts` 8): follow-up (f).
- The Prisma entries in `.github/dependabot.yml` were removed (their reason, the Bytes typing, is resolved), so grouped minor/patch PRs bump both packages together. Majors stay blocked by the temporary wildcard.

## Step 4 log, PR D (2026-10-23): branch `chore/jspdf-4`

jspdf `^3.0.1` (locked 3.0.4) -> `^4.2.1`. **Frontend prod audit: no critical left** (was 1: jspdf); 10 remain (6 high, 4 moderate), all the Tailwind 3 build chain and Next's bundled postcss.

- Only user is the incident PDF export in `frontend/components/incidents/EnhancedIncidentList.tsx`, which uses core APIs only (`text`, `line`, `addPage`, `setFont`, `splitTextToSize`, `save`), no plugins.
- Verified: same export calls run in node on 3.0.4 vs 4.2.1 (40 incidents, 6 pages). Output is byte-identical except the `/Producer`, `/CreationDate` and `/ID` lines, all 40 incidents extractable as text. Frontend 20 suites / 134 tests, production build clean, `tsc` unchanged (19 old fixture errors, none in this file).
- **Not verified:** clicking Export > PDF in the browser (no test covers it). The by-hand check was the same API calls outside the component.
- Supersedes dependabot #453 (jspdf 4.1.0, too low).

## Step 4 log, PR C (2026-10-23): merged as #480, branch `chore/nodemailer-10`

nodemailer `^6.9.7` (locked 6.10.1) -> `^10.2.1`; `@types/nodemailer` removed (v10 ships its own types). **Backend prod audit: 0 vulnerabilities** (18 at the start of step 4).

- Usage is one file, `backend/src/utils/email.ts` (`createTransport` for smtp / sendgrid-over-smtp / console `streamTransport`, `verify()`, `sendMail()`). No code depends on error codes, so v8's `NoAuth` -> `ENOAUTH` rename is irrelevant. v7 (SES SDK change) and v9 (TLS validation when fetching *remote content* such as attachment URLs, OAuth2 token endpoints, proxies) don't apply: the app uses none of those. v10 needs Node 20+ (images are on 24).
- **No existing test did a real SMTP send** (`email-security.test.js` covers template paths; password-reset tests use the console path). Verified by hand with a throwaway Mailpit SMTP sink and a temporary script (deleted, not committed), baseline on 6.10.1 vs after on 10.2.1, identical: SMTP with auth `verify()` + `sendMail` through `EmailService.sendPasswordReset` and `sendEmail` (sink received both, `Reply-To` correct, reset link present in text and HTML); console mode; `streamTransport` returns a Buffer; unreachable SMTP falls back to console.
- Verified: backend 42/42 suites (365 tests), type-check clean (with and without `@types/nodemailer`), build clean, `/health` 200 after restart.
- **Not verified:** STARTTLS / port-465 TLS and real SendGrid auth (no credentials or TLS-enabled sink). SMTP TLS behavior isn't in the v7-v10 breaking-change notes, but if email breaks for a deployed instance, check this first.
- Supersedes dependabot #441 (nodemailer 7.0.11, too low to fix the advisories).

## Step 4 log, PR B (2026-10-23): merged as #477, branch `chore/node-24-images`

- `backend/Dockerfile` and `frontend/Dockerfile`: `node:18-alpine` -> `node:24-alpine` (matches CI and docs). The Docker publish workflow builds from these, so published images move to Node 24 too.
- **Host `node_modules` is bind-mounted into the containers** (`./backend:/app`), so it keeps whatever Node installed it. After a Node/Dockerfile change, delete `backend/node_modules` and `frontend/node_modules` before `docker compose up --build` (now noted in CLAUDE.md). The DB volume is not involved.
- Verified on Node 24.22.1: bcrypt, sharp and Prisma client load; backend 42/42 suites (365 tests), type-check clean; frontend 20/20 (134), same 19 old test-fixture `tsc` errors; production `next build` 51/51 pages; both healthy. `frontend/package-lock.json` lost 4 orphaned entries (ajv, fast-uri, json-schema-traverse, require-from-string) when Node 24's npm re-resolved; no version changes.
- **`isomorphic-dompurify` hold NOT lifted** (reason corrected). The Node-18 reason is gone (the app runs fine on Node 24 with the latest 4.6.0), but Jest (CommonJS) can't load jsdom 27+'s ESM-only deps (`@exodus/bytes`, `parse5` 8, `entities` 8, probably more): 28 of 42 suites fail even with a transform allowlist for the first one. The held 2.26.x has no open advisories, so lifting buys nothing and would add a brittle Jest allowlist plus a 2.x -> 4.x major. Revisit if the backend tests move to ESM/vitest. Dependabot `ignore` comment updated.
- **Prisma hold is unrelated to Node** (it's the `Bytes` typing change in 6.11+), so it stays until follow-up (d).
- Fixed `scripts/guard-bash.sh` again: the `down -v` check matched `-v` anywhere later in the command (`... | grep -v ...`). Now limited to the `docker compose down ...` segment. Added `scripts/guard-bash.test.sh` (19 cases; run it after touching the guard).

Superseded dependabot PRs (verified against lockfiles after PR A; not yet closed, waiting on dependabot to self-close): #456 qs, #451 lodash, #444 validator, #442 express, #439 body-parser, #438 js-yaml, #400 form-data, #393 multer (backend), #445 validator (frontend). Obsolete or wrong target: #452 Next 16 (15.5.28 has the fixes), #453 jspdf 4.1.0 (needs >= 4.2.1), #441 nodemailer 7.0.11 (advisories need 10.x). Website PRs (#455 #454 #450 #443 #440 #434 #394) belong to follow-up (e).

## Step 4 log, PR A (2026-10-23): merged as #461, branch `chore/dependency-debt`

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
