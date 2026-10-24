# Conducky revival plan

Working checklist. Update as steps finish. Findings and decisions go under each step so a fresh session can resume from this file alone.

Reference setup for conventions: `~/src/github.com/timescale/tiger-den` (not a Tiger Data project; borrow ideas, skip Linear / Memory Engine / runner infra / CLAUDE.md size ratchet / heavy `/pr` fan-out).

## Steps

- [x] 1. Baseline: build stack in Docker, run backend + frontend tests, record what's red (healthy; see log)
- [x] 2. Agent setup: slim CLAUDE.md, AGENTS.md, `.claude/` hooks/skills/agents, GLOSSARY.md, remove `.cursor/` + `.github/instructions/` (merged, PR #460)
- [x] 3. Doc cleanup: archive `reference/`, fix Next 14→15 / Node claims, root script + test fixes (merged, PR #460)
- [x] 4. Dep debt, done 2026-10-23: #461 (in-range security updates, frontend build fix, dependabot config), #477 (Docker images on Node 24), #480 (nodemailer 10), #486 (jspdf 4), #487 + #488 (Prisma 6.19 then 7.10.1), #489 (Docusaurus 3.10, OpenAPI plugins 5, Node 22 hosting), #491 (dependabot majors re-enabled), grouped dependabot PRs #463 #493 #492 #469, plus the cleanup PR (`chore/post-dependabot-cleanup`). Backend runtime audit 0, frontend runtime 6 (1 high), website 44 (0 critical). Optional leftovers are under "Known problems" below (Tailwind 4, Next 16, Read the Docs on Node 22, docker-publish untested).
- [x] 5. Issue triage, done 2026-10-23: 74 open -> 53 (21 closed, 2 new filed, labels cleaned up, 6 `high-priority`; see the step 5 log). Two small `high-priority` fixes shipped (#499, #500). Next up is the owner's pick from the "next" list in the log (`/triage-issues` for later rounds)

## Decisions and parked ideas

- **DONE (PR H): the TEMPORARY dependabot ignore of semver-major was removed** from all three npm blocks, now that nodemailer, jspdf, Prisma, Node 24 and Docusaurus are upgraded by hand. Majors now come back as individual PRs, reviewed one at a time (monthly, `open-pull-requests-limit: 5` per block). Permanent holds that remain in `.github/dependabot.yml`: backend `isomorphic-dompurify >= 2.27.0` (Jest vs ESM-only jsdom 27+ deps) and website `@docusaurus/*` (all packages must share one exact version, bump together by hand).

- **Docs hosting is intentional, keep both.** conducky.com (Netlify, `website/netlify.toml`) is the homepage + docs; Read the Docs (`.readthedocs.yaml`) builds the same Docusaurus site on every push to `main` (151 builds, latest = HEAD). Only nit: Netlify pins Node 18, RTD pins Node 20.
- **One branch for steps 2+3**, one PR. Steps 4 and 5 get their own.
- **Follow-up (after step 5): re-evaluate every third-party tool and service on the repo.** The set was chosen over a year ago. Known trigger: DeepSource now gates monorepo support behind team accounts (the dashboard shows "Monorepos is only available for teams accounts" when logged in; results are still visible when logged out), and it has been the only failing check on a PR. Review DeepSource, SonarCloud, CodeFactor, Codeac, Codecov, GitGuardian, CodeQL, codebeat (README badge, `.codebeatignore`) and `.deepsource.toml`: which are still connected, which add signal beyond CI + CodeQL, which to drop. Decide per tool, keep the badges honest.
- **Parked until stable (after step 5): make conducky deployable on Vercel as well as Railway/Docker and others.** Needs a deploy-target story: Next.js frontend on Vercel is easy; the Express backend + Postgres + uploaded files (stored in DB today, issue #240) + sessions + rate-limit tables need an answer (serverless Express, separate host, or port to route handlers). Don't start before steps 1-5 are done.

## Known problems still open (from initial review, 2026-10-22)

- ~~Docker images ran `node:18-alpine`~~ fixed in PR B. ~~Netlify on Node 18, RTD on Node 20~~: both moved to Node 22 in #489. **Not yet confirmed:** the first Read the Docs build on Node 22 (RTD only builds on push to `main`); if it fails, the fix is the `nodejs` line in `.readthedocs.yaml`
- **Unexplained intermittent test failure** (seen once, 2026-10-23, Node 24): `tests/integration/logs-api.test.js › should accept valid frontend log` got `404` on `POST /api/logs` in the first host-run `npm run test:all` right after `docker compose restart backend`. Not reproduced in 7 later full runs (4 in-container, 3 host) or 3 isolated runs of the suite. `index.ts` mounts `/api` routes synchronously, so it isn't an obvious startup race. Also observed: the dev backend's nodemon restarts while tests run (likely jest writing `backend/ctrf/ctrf-report.json`, which nodemon watches; unverified), which makes `/health` return 000 mid-run. If it recurs, capture `--runInBand` output and whether the dev stack was restarting
- `npm run test:all` runs jest **on the host** against the bind-mounted `node_modules` (not in the container as CLAUDE.md's command list implies). Works while Linux-built native modules aren't loaded by the tests; fragile
- Many tracked files have **CRLF line endings** (Dockerfiles, docker-compose.yml, ...). `sed '...$'` anchors silently fail on them; match without `$`, and keep the CRLFs so diffs stay one line. Also: `npm install`/`uninstall` on this machine once rewrote `frontend/package-lock.json` with CRLF (a 36k-line diff for removing one package). Always check `git diff --stat` on lockfiles; convert back to LF (`b.replace(b'\r\n', b'\n')`) if it explodes
- Remaining vulnerabilities (verified 2026-10-23 after the dependabot merges): backend runtime audit **0**; frontend runtime 6 (1 high, 5 moderate), from two advisories: `postcss` <= 8.5.22 bundled inside Next (high; fixed only by Next 16, see #452) and `postcss-selector-parser` via the Tailwind 3 / `@tailwindcss/typography` chain (moderate; Tailwind 4 would clear it); website 44 (0 critical; pinned by Docusaurus's own dependencies, needs upstream releases; a temporary `tinypool` override is in `website/package.json`, see the PR G log). Nothing here is reachable from a request
- ~~~70 open issues, stale/duplicated~~ triaged in step 5 (53 open). Still broken and filed: `npm run sample-data` (#502; the dev database is empty until it is fixed or a patched copy is run), `/admin/events` mobile overflow (#501)
- If the dev frontend answers 500 with `Cannot find module './chunks/vendor-chunks/next.js'`, `frontend/.next` is a stale mix of build outputs (seen after switching branches under a running dev server): delete `frontend/.next` (gitignored) and `docker compose restart frontend`. The restart also rewrites the tracked `frontend/next-env.d.ts`; `git checkout` it
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

## Step 5 log (2026-10-23): issue triage, DONE

74 open issues (filed Jun-Aug 2025, none touched since) -> **53 open** at the end of the day: 21 closed, 2 new issues filed (#501, #502), 6 marked `high-priority`. Each close has a one-line reason on the issue. The sections below are the first pass (groups A-D); "Afterwards" at the end has everything done since. For each possibly-done issue I checked the code first rather than trusting the body.

**Closed as done / obsolete (5):** #421 delete orgs (API route + Delete button in org settings; note the issue floated "only empty orgs", the endpoint deletes the org and its data), #278 org logo upload (route + file input in org settings), #417 org analytics API reference pages (exist under `website/docs/api`), #94 and #118 (pointed at `ReportForm.js` / `Avatar.js`, which no longer exist; `IncidentForm.tsx` has try/catch/finally, avatars use shadcn `AvatarFallback`).

**Closed as duplicates (9):** anonymous reporting #72 #73 #76 -> #12 (not built; the event page shows a "Coming soon" placeholder); virus scanning #234 -> #242; SLA #114 #23 -> #113; comments #247 -> #260; #275 (RLS) -> #423 (noted there); #294 -> #244 (I did not verify every bullet of #244, much of audit logging exists).

**Closed as won't do (6):** #235 #238 #253 (generic performance umbrellas, no measured problem; Next already splits per page), #274 (ML pattern detection: privacy-sensitive, out of scope), #357 (jest-puppeteer; open a Playwright issue if e2e is wanted), #259 (websockets: infrastructure against simple deploys, incl. Vercel/Railway).

**Marked `high-priority` (6), the "next" list:** #430 (explain on the incident form why the CoC team is shown, and that titles are not encrypted), #328 (reporting someone on the CoC team, conflict of interest; needs a design call), #423 (tenant scoping at the data layer), #411 (login `autocomplete` attributes, verified missing), #263 (report details cut off with large text on mobile), #242 (virus scanning).

**Kept as "later" (no label):** everything else, including #117 (avatar queries in a loop, verified still in `event.service.ts`) and #214 (in-memory sort in `getUserActivity`, verified), #240 (cloud file storage; default to DB, optional cloud), #241 (Redis rate limiting; owner wants it optional), #279 (org-scoped event paths; implementation plan in the comments), #281 (Railway template, in progress; tied to the parked Vercel/Railway deployability work).

**Afterwards (same day):**
- **Shipped from the "next" list:** #430 and #411 in #499 (privacy copy on the incident form, login `autocomplete` and `aria-pressed`; the toggle's `aria-label` is now constant because a flipping label plus `aria-pressed` double-announces). #263 in #500: the cut-off screenshot was the **Team** page, not incident details; the app shell's flex row and `main` needed `min-w-0`, so wide content (a table) stretched the page to 627px at 390px width. `Refs #263`, so the issue **stays open until checked on a real phone**.
- **Parked, each needs a design discussion first:** #328 (nothing exists for hiding an incident from specific people; any exclusion rule has to be enforced in RBAC and in every incident query, count, search and export, and a reporter-chosen exclusion list can be abused), #242 (virus scanning: ClamAV opt-in, off by default, fail closed when on; drop the VirusTotal option, which would send evidence to a third party), #423 (row-level security).
- **Owner calls:** #296 closed (the `ValidatedInput` component was never built; an earlier note above saying it exists was wrong), #314 email verification marked `high-priority` (no verification fields in the schema; prerequisite for trusting password reset and 2FA), #377 2FA, #337 SMS and #367 incidents by email left as "later".
- **Labels:** #12, #16, #33 got `enhancement`; #117, #214, #229 got `performance`; `high priority` merged into `high-priority` (added to #244, label deleted). Open `high-priority`: #423, #328, #263, #244, #242, #314.
- **Found along the way, filed:** #501 (`/admin/events` overflows horizontally on mobile, 442px at 390px width) and #502 (`npm run sample-data` crashes: it queries the removed `organizationMembership` model, unrelated to Prisma 7).

## Step 4 log, PR I (2026-10-23): grouped dependabot PRs + cleanup (`chore/post-dependabot-cleanup`)

Reviewed one at a time, each in an isolated git worktree (not the main tree's bind-mounted `node_modules`), then merged:
- **#463 backend** (`swagger-jsdoc` 6.2.8 -> 6.3.0, `jest-ctrf-json-reporter` 0.0.9 -> 0.2.0): `swagger.json` regenerated with both versions is byte-identical (and equals the tracked file), so the API docs cannot change; the new reporter passes 42/42 suites and writes a CTRF 0.2.0 report that is a superset of the old shape (extra fields, ~190 KB -> 315 KB); CI's combine step passed.
- **#493 frontend** (`@types/dompurify` 3.0.5 -> 3.2.0, same reporter): tests 134, `tsc` 19 (unchanged), build clean. `@types/dompurify` 3.2.0 is a deprecated stub (DOMPurify ships its own types), so this cleanup PR removes it (tests, `tsc` 19, build all unchanged without it).
- **#492 website** (`react`/`react-dom` 19.1.0 -> 19.3.1, `@mdx-js/react` 3.1.1): built in a worktree; same 131 pages, **visible text identical on 131/131** vs a build of `main`.
- **#469 GitHub Actions group** (10 updates, mostly majors): the `test.yml` bumps were exercised by the PR's own CI. The `docker-publish.yml` bumps (`setup-buildx` 4, `login-action` 4, `metadata-action` 6, `build-push-action` 7, `attest-build-provenance` 4, `checkout` 7) were checked against the release notes: the workflow uses none of the removed inputs/envs or the changed `#` handling; the Node 24 runtime needs runner >= v2.327.1, which `ubuntu-latest` has. **Still untested end to end: it only runs on a `v*` tag.** Watch the first release's "Publish Docker Images" run; if it fails, revert `docker-publish.yml` from #469.
- After #469, the test workflow on `main` passed and Codecov processed the `main` upload (36.43%, unchanged), so `codecov-action` v7 works with the repo token.

Things learned:
- **Dependabot PRs never get `codecov/*` statuses**: Dependabot runs don't receive the repo's `CODECOV_TOKEN` secret, so the upload fails with "Token required because branch is protected" (the step has `fail_ci_if_error: false`, so the job still passes). Not a regression.
- The test workflow still uses `codecov/test-results-action@v1`, which logs "This action is being deprecated in favor of 'codecov-action'". Part of the tools re-evaluation follow-up.

Also in this PR: `@types/dompurify` removed from `frontend`; the step 4 / known-problems / superseded-PR lines above brought up to date.

## Step 4 log, PR H (2026-10-23): branch `chore/dependabot-allow-majors`

Removed the three `dependency-name: "*"` / `semver-major` ignore entries (and the frontend block's now-empty `ignore:` key) from `.github/dependabot.yml`. YAML validated; remaining ignores are backend `isomorphic-dompurify >=2.27.0` and website `@docusaurus/*`. Expect the next monthly run to open a few major-version PRs (Tailwind 4, eslint, `@types/node`, etc.); each is its own PR and gets the same test + build + restart check as today's. Updates are on a monthly schedule; the repo's Insights > Dependency graph > Dependabot page has a "Check for updates" button to trigger a run sooner.

## Step 4 log, PR G (2026-10-23): branch `chore/docusaurus-3-10`

Website only (static site, build-time tooling; no runtime exposure). All `@docusaurus/*` exact-pinned at **3.10.2** (was 3.8.1), plus `@docusaurus/faster`; `docusaurus-plugin-openapi-docs` / `docusaurus-theme-openapi-docs` 4.5.1 -> **5.2.0** (5.x peers need Docusaurus >= 3.10 and `docusaurus-plugin-sass`, added; 4.5.1 fails on 3.10 with `useTabsContext() must be used within a Tabs component` on all 31 API pages).

**Why it was not a bump:** `future: { v4: true }` is a shortcut, and 3.10 added flags to it that 3.8 did not have: `mdx1CompatDisabledByDefault`, `fasterByDefault`, `useCssCascadeLayers`, `siteStorageNamespacing`. Effects found and fixed:
- `mdx1Compat` off: 25 HTML comments (`<!-- Screenshot Placeholder -->`) in 13 pages were hard MDX errors -> `{/* ... */}`.
- `mdx1Compat` off, silent: 13 old-style admonitions (`:::warning Title`) in 8 pages rendered as literal text, including the System Admin access/isolation warnings -> `:::warning[Title]`. **The build succeeded with these broken**; only a visible-text diff against a saved 3.8.1 build caught it. Do this check on any future Docusaurus bump.
- `onBrokenMarkdownLinks` moved to `markdown.hooks.onBrokenMarkdownLinks` (deprecated top-level option).
- `useCssCascadeLayers` / `siteStorageNamespacing`: compared home, a docs page and an API page in a browser against the 3.8.1 build, no visual difference. Storage namespacing means a returning visitor's saved light/dark choice resets once.

**Hosting:** Node 18 -> 22 in `netlify.toml` and `website/netlify.toml` (Docusaurus 3.10 needs Node 20+), RTD `nodejs` 20 -> 22 (20 is EOL), `website/package.json` engines `>=20`. Not verifiable locally: the Netlify deploy preview on the PR is the check; RTD builds on push to `main`.

**Audit** (`npm audit`, all dependencies): 91 (20 critical) -> 55 (0 critical). `npm audit fix` (non-forced, Docusaurus stays aligned) took it to 55; an `overrides` entry `tinypool: 2.2.0` clears the 18 critical entries (all one prototype-pollution advisory; Docusaurus core pins tinypool 1.1.1 exactly). **TEMPORARY: remove the `overrides` block when Docusaurus core moves off tinypool 1.x.** Remaining 55 (16 moderate, 39 high; the "high" count rose from 21 only because wrapper packages inherit severity) are stuck behind Docusaurus's own pins: `serialize-javascript` (copy-webpack-plugin 11), `braces` (no patched release exists), `js-yaml`/`yaml`/`uuid` (openapi plugin chain), `@faker-js/faker` (postman-collection), `postcss-selector-parser`. Needs upstream releases; build-time only. The suggested `npm audit fix --force` "fixes" are downgrades (`docusaurus-plugin-openapi-docs@2.1.3`, `@docusaurus/core@3.7.0`): ignore them.

Verified: production build succeeds, no warnings or errors; same 131 pages as 3.8.1; **visible text of 130/131 pages identical** to the 3.8.1 build (the one difference is an emoji variation selector in the API index). API reference pages render with the 5.x plugin's slightly different request-body block (type/example toggle). `docs/api` is regenerated by every build (`build-docs.js` cleans and regenerates; two runs are byte-identical) and the 5.x plugin adds 91 `.json` files, so the regenerated output is committed in its own commit.

**Not verified:** the Netlify deploy preview and the RTD build on Node 22; search, if any; any page not in the three I compared in a browser (home, account-setup, one API page).

## Step 4 log, PR F (2026-10-23): branch `chore/prisma-7`

`prisma`, `@prisma/client` 6.19.3 -> **7.10.1** (exact-pinned; npm's `latest` tag is now `8.0.0-rc.27`, a release candidate, so 7.10.1 is the last stable 7.x), plus new `@prisma/adapter-pg` 7.10.1 and `pg`. **Backend prod audit is back to 0**: Prisma 7 pulls `deepmerge-ts` 8, which fixes the advisory accepted in #487.

What changed:
- **Generator** `prisma-client` (was `prisma-client-js`), output `backend/src/generated/prisma` (gitignored), `moduleFormat = "cjs"` so the backend stays CommonJS. The 23 stray tracked files in `backend/generated/` (nothing imported them) are deleted. `binaryTargets` is gone.
- **`backend/prisma.config.ts`** now holds the schema path, migrations path and datasource URL (the URL left `schema.prisma`). It uses `process.env.DATABASE_URL ?? ""` rather than `env()`, because `env()` throws at load time and `prisma generate` runs in CI and image builds without a database; `migrate` still fails on an empty URL ("Connection url is empty").
- **Driver adapter.** Every client needs one. `backend/src/config/prisma-client.ts` has `createAdapter()` (`PrismaPg`, 5s `connectionTimeoutMillis` to match v6) and `createPrismaClient()`. 20 `new PrismaClient()` sites in `src/` + `index.ts` use it; `config/database.ts` keeps its own typed client (log events) on the shared adapter.
- **64-file import move**: `src/` and `index.ts` import from `generated/prisma/client`. Tests keep importing `@prisma/client`; `jest.config.js` `moduleNameMapper` points both that and the generated path at the existing `__mocks__/@prisma/client.js` in-memory mock.
- **Plain-node scripts** (6 in `prisma/`, 5 in `scripts/`) can't `require` a TypeScript client, so `backend/prisma/db.js` registers ts-node and re-exports the factory. Their `package.json` / entrypoint commands are unchanged.
- **Bug fixed on the way:** `middleware/unified-rbac.ts` built a new `PrismaClient` (a new connection pool) on every request that resolved an event slug and never disconnected it; it now uses one module-level client.
- **CI:** the backend job runs `npx prisma generate` before the build (Prisma 7 no longer generates on install). Docs: `CLAUDE.md` (Prisma 7 conventions), `database-monitoring.md` (generate after migrate), `deployment.md` (5s timeout, stricter TLS / `P1010`).

Verified: backend 42/42 suites (365 tests), type-check and build clean. Container restart: generate + `migrate deploy` ("No pending migrations") + seeds (through the ts-node shim) + server healthy. **Real DB:** all 256 byte values round-trip through `UserAvatar`, `EventLogo`, `OrganizationLogo`, `RelatedFile` (with the `uploader` include) inside a rolled-back transaction. **Fresh DB:** all 12 migrations applied to a throwaway database, `migrate diff` against `schema.prisma`: no difference; throwaway dropped. **Compiled prod build** (`node dist/index.js`, `NODE_ENV=production`): `/health` 200 and a bad-credentials login is a clean 401, so the engine loads from `dist/`.

Decision: did **not** consolidate the ~20 clients into one. Measured: 30 parallel real queries held 16 idle connections, and 12s later 0 (pg's 10s idle timeout), against Postgres `max_connections = 100`. Only the per-request client above was a real leak.

**Not verified:** TLS / `sslmode=require` against a managed Postgres (dev DB has no TLS); uploading an avatar or logo through the UI (the DB layer is checked); `docker-publish` image build (the new CI generate step only covers the test job; the entrypoint generates at container start, as before).

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

Superseded dependabot PRs: **closed 2026-10-23** with a "superseded" comment after checking each target version against the lockfiles on `main` (#393 #394 #400 #438 #439 #440 #441 #442 #443 #444 #445 #450 #451 #453 #454 #455 #456 #484 #485). Dependabot reopens one if it is still needed. #452 (Next 16) stays open as a real major for later.

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
