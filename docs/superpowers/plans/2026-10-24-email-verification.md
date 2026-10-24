# Email verification (#314) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New email/password signups must verify their address before signing in, OAuth stops being a takeover path, email changes are verified and announced to the old address, and instances without email stay usable but loudly warned.

**Architecture:** A `User.emailVerificationRequired` flag ("gated") is set only on new signups made while email is configured, so existing accounts are never blocked or purged by construction. A new `EmailVerificationService` owns tokens, signup handling and verification; `LocalStrategy` enforces the block after the password check; OAuth account resolution moves into one shared service; a daily job purges stale gated accounts. Frontend adds a verify page, a "check your email" component and banners.

**Tech Stack:** Express 5, Prisma 7 (`createPrismaClient()`), Passport, nodemailer via `EmailService`, Next.js 15 Pages Router, shadcn/ui, Jest + supertest + RTL.

**Spec:** `docs/superpowers/specs/2026-10-24-email-verification-design.md` (read it first; this plan only records what the spec leaves open).

## Global Constraints

- Verification link TTL is 24 hours, unverified gated accounts are purged after 7 days, and a pending unverified account cannot be replaced by a new signup for 1 hour after its last verification email; all are constants in `email-verification.service.ts`, never settings. There is no setting to turn verification off.
- Tokens: random 32 bytes hex, stored only as a sha256 hash, single use, never logged or returned in any response or audit entry.
- Responses about verification or resend are neutral: they never reveal whether an address is registered.
- Audit-log with `logAudit`: `verification_email_sent`, `email_verified`, `verification_email_corrected`, `unverified_account_replaced`, `unverified_account_purged`, `email_change_requested`, `email_change_applied`, `oauth_linked_unverified_account`.
- New auth endpoints use `authRateLimit` and validate input server-side.
- "Configured" means `emailService.isConfigured()`: a real provider (SMTP or SendGrid), not the console fallback. Do not change `GET /api/config/email-enabled` (the profile page uses it and it treats console as enabled).
- No cancel link in change notices. Old address gets two notices only: change proposed, change applied.
- Prisma 7: use `createPrismaClient()`, generate with `npx prisma generate`, create migrations with `prisma migrate dev` (append-only). Run commands in containers (`docker compose exec backend ...`).
- Backend tests mostly mock Prisma, so passing tests do not prove SQL; Tasks 1 and 8 end with a real-database check in the dev stack.
- Frontend: shadcn/ui, Tailwind, mobile-first, 44px touch targets, labels on every input, errors announced to screen readers, visible focus.
- Keep `website/docs/` true (Task 14). Never commit to or push `main`; branch per PR, stage files by name.

## Review Focus

Input classes the spec implies but nothing else pins. Each has its test in the owning task.

1. **Link clicked twice** (double-click, mail scanner prefetch, back button): the second visit must not show an error to someone who is already verified. Test in Task 3.
2. **Email send fails at signup**: the account exists but no mail went out; the person must be told and offered "resend", not left on a silent "check your email". Test in Task 4.
3. **Mixed-case address on resend, correct-email and OAuth**: all lookups lowercase, matching login. Test in Task 6.
4. **Email change to an address another account owns** (at request time, and again at apply time if it was taken meanwhile): rejected, old address untouched. Test in Task 10.
5. **Resend for an unknown, already verified, or ungated address**: same neutral response and no mail sent. Test in Task 3.

## File Structure

Backend: `prisma/schema.prisma` and a new migration; `__mocks__/@prisma/client.js`; `src/utils/email.ts` (additions); new `src/services/email-verification.service.ts`, `src/services/oauth-account.service.ts`, `src/services/unverified-purge.service.ts`; modified `src/services/auth.service.ts`, `invite.service.ts`, `user.service.ts`, `src/config/passport.ts`, `src/middleware/auth.ts`, `src/routes/auth.routes.ts`, `admin.routes.ts`, `user.routes.ts`, `index.ts`. Frontend: new `pages/verify-email.tsx`, `components/CheckYourEmail.tsx`, `components/EmailSetupBanner.tsx`, `components/UnverifiedEmailBanner.tsx`; modified `pages/login.tsx`, `pages/register.tsx`, `pages/profile/settings.tsx`, `pages/_app.tsx`. Suggested PRs: **A** = Tasks 1-8 (backend gate), **B** = Task 9 (frontend), **C** = Tasks 10-11 (email change), **D** = Tasks 12-14 (loud config, nudge, docs). Each is shippable; B must ship with or right after A, because A makes sign-in start returning the new error code.

---

## Phase 1: the gate

### Task 1: Schema, migration, test mock

**Files:**
- Modify: `backend/prisma/schema.prisma` (model `User`, new model)
- Create: `backend/prisma/migrations/<timestamp>_email_verification/migration.sql`
- Modify: `backend/__mocks__/@prisma/client.js`, the three seeds (`backend/prisma/seed.js`, `sample-data-seed.js`, `org-seed.js`: add `emailVerifiedAt: new Date()` to each `user.upsert` `create` data, so a dev who configures real email and seeds can still sign in)
- Test: `backend/tests/unit/email-verification-migration.test.js`

**Interfaces:**
- Produces: `User.emailVerifiedAt DateTime?`, `User.emailVerificationRequired Boolean @default(false)`, `User.verificationSentAt DateTime?`, `User.emailVerificationTokens EmailVerificationToken[]`; model `EmailVerificationToken { id String @id @default(uuid()); user User @relation(fields:[userId], references:[id], onDelete: Cascade); userId String; tokenHash String @unique; email String? (added later by Task 6's second migration: the address the link was mailed to); pendingEmail String?; expiresAt DateTime; usedAt DateTime?; createdAt DateTime @default(now()); @@index([userId]) }`. Mock: `inMemoryStore.emailVerificationTokens` and `client.emailVerificationToken` with `create`, `findUnique({where:{tokenHash}})`, `update({where:{id}})`, `updateMany`, `deleteMany({where:{userId}})`, modeled on the `passwordResetToken` mock.

- [ ] **Step 1: Write the failing test** `email-verification-migration.test.js`: finds the migration directory ending `_email_verification` under `prisma/migrations`, reads `migration.sql`, and asserts it contains `ALTER TABLE "User" ADD COLUMN "emailVerifiedAt"`, `CREATE TABLE "EmailVerificationToken"`, and `UPDATE "User" SET "emailVerifiedAt" = NOW() WHERE "passwordHash" IS NULL` (social-only users were vouched for by their provider).
- [ ] **Step 2: Run it:** `docker compose exec backend npx jest tests/unit/email-verification-migration.test.js`. Expected: FAIL (no migration directory).
- [ ] **Step 3: Edit the schema, then** `docker compose exec backend npx prisma migrate dev --create-only --name email_verification`; append the backfill `UPDATE` to the generated SQL; apply with `npx prisma migrate dev`; run `npx prisma generate`. Add the mock model and store array.
- [ ] **Step 4: Run the test (PASS), then** `npm run type-check`. Real-database check: in `psql`, inside `BEGIN; ... ROLLBACK;`, insert a user with `passwordHash` NULL and one with a hash, rerun the backfill `UPDATE`, and confirm only the NULL-hash user got `emailVerifiedAt`. Seeds: on a fresh dev database run `npm run seed` and `npm run sample-data` and confirm `select count(*) from "User" where "emailVerifiedAt" is null` returns 0.
- [ ] **Step 5: Commit** `feat(auth): schema for email verification` (schema, migration, mock, test).

### Task 2: EmailService additions

**Files:**
- Modify: `backend/src/utils/email.ts`
- Test: `backend/tests/unit/email-verification-emails.test.ts`

**Interfaces:**
- Produces (on `EmailService`, plus one exported function): `async isConfigured(): Promise<boolean>` (awaits `initialize()`, returns `this.config.provider !== 'console'`, so a failed init that fell back to console is false); `export function maskEmail(email: string): string` (`john@example.com` -> `j***@example.com`; one-character local part -> `*@example.com`); `async sendVerificationEmail(to: string, name: string, token: string, opts?: { emailChange?: boolean }, frontendUrl?: string): Promise<EmailResult>` (link `${frontendUrl}/verify-email?token=${token}`, default frontend URL as in `sendPasswordReset`, body says it expires in 24 hours); `async sendEmailChangeRequestedNotice(to: string, name: string, maskedNewEmail: string): Promise<EmailResult>`; `async sendEmailChangedNotice(to: string, name: string, maskedNewEmail: string): Promise<EmailResult>`.

- [ ] **Step 1: Write the failing tests** (mock `nodemailer` so `createTransport` returns `{ verify, sendMail }`): `isConfigured` is false with default env; true with `EMAIL_PROVIDER=smtp` and `verify` resolving; false when `verify` rejects (init fallback); `maskEmail` for `john@example.com`, `a@b.co`; verification email text contains `/verify-email?token=abc` and `24 hours`; both notices contain the masked address, never the full new address; the requested notice contains `change your password`.
- [ ] **Step 2: Run to see them fail:** `docker compose exec backend npx jest tests/unit/email-verification-emails.test.ts`.
- [ ] **Step 3: Implement the five members in `email.ts`,** following the text and HTML layout of `sendPasswordReset`.
- [ ] **Step 4: Run to pass,** then `npm run type-check`.
- [ ] **Step 5: Commit** `feat(email): verification email, change notices, isConfigured`.

### Task 3: EmailVerificationService

**Files:**
- Create: `backend/src/services/email-verification.service.ts`
- Test: `backend/tests/unit/email-verification.service.test.ts`

**Interfaces:**
- Consumes: Task 1 schema and mock; Task 2 `emailService.isConfigured`, `sendVerificationEmail`.
- Produces: `export const TOKEN_TTL_MS = 24*60*60*1000; export const UNVERIFIED_PURGE_MS = 7*24*60*60*1000; export const RESEND_COOLDOWN_MS = 60*1000; export const TAKEOVER_GRACE_MS = 60*60*1000;` `export function hashToken(raw: string): string` (sha256 hex); `export function isGated(user: { emailVerificationRequired?: boolean | null; emailVerifiedAt?: Date | null }): boolean` (required and not verified; undefined/null means not gated); `export type VerifyResult = { status: 'verified' | 'email_changed'; userId: string } | { status: 'already_verified' } | { status: 'invalid' }`; `export class EmailVerificationService { constructor(prisma: PrismaClient, mailer = emailService); issueToken(userId: string, email: string, pendingEmail?: string): Promise<string>; sendVerification(user: { id: string; email: string; name: string | null }, pendingEmail?: string): Promise<boolean>; verifyToken(raw: string): Promise<VerifyResult>; onSignup(user: User, opts: { isFirstUser: boolean }): Promise<{ verificationRequired: boolean; emailSent: boolean }>; releaseUnverifiedAddress(email: string): Promise<boolean>; resendFor(email: string): Promise<void> }`.
- Behaviors: `issueToken` deletes the user's earlier unused tokens, returns the raw token, stores only its hash and (as built in Task 6, round 2) the lowercased address the link is mailed to; `verifyToken` only verifies while that address still equals the user's current email. `sendVerification` sends to `pendingEmail ?? user.email`, returns false on failure, sets `verificationSentAt` only on success, audits `verification_email_sent`. `verifyToken` (this task handles the plain case; Task 10 adds `pendingEmail`): unknown or expired token -> `invalid` with no state change; valid -> sets `emailVerifiedAt`, `usedAt`, audits `email_verified`; a used token whose user is already verified -> `already_verified`. `onSignup`: first user -> set `emailVerifiedAt`, return `{false,false}`; not configured -> `{false,false}` (account stays ungated); else set `emailVerificationRequired = true`, send, return `{true, emailSent}`. `releaseUnverifiedAddress`: if the account for `email` is gated, email is configured, and `verificationSentAt` is null or older than `TAKEOVER_GRACE_MS`, delete it, audit `unverified_account_replaced`, return true; otherwise false (so a pending signup less than an hour old cannot be wiped by someone else registering the same address). `resendFor(email)` (lowercases): silent no-op unless the account exists, is gated, email is configured, and `verificationSentAt` is older than `RESEND_COOLDOWN_MS`.

- [ ] **Step 1: Write the failing tests** using the mock client and `jest.spyOn(emailService, ...)`: `issueToken` stores `hashToken(raw)` and never `raw`, expiry about 24h; `verifyToken` verified / expired -> invalid / garbled -> invalid (no `emailVerifiedAt` change) / **second call after success -> `already_verified` (Review Focus 1)**; `isGated` truth table including `undefined` fields; `onSignup` for first user, unconfigured, configured; `releaseUnverifiedAddress` deletes a gated account whose last mail was 2 hours ago or never sent, **leaves one whose last mail was 10 minutes ago**, and leaves a verified one and an ungated one; **`resendFor` sends nothing for unknown, verified and ungated addresses and responds identically (Review Focus 5)**, sends once for a gated unverified account, and not again inside the cooldown.
- [ ] **Step 2: Run to fail:** `docker compose exec backend npx jest tests/unit/email-verification.service.test.ts`.
- [ ] **Step 3: Implement the service** (tokens: `crypto.randomBytes(32).toString('hex')`).
- [ ] **Step 4: Run to pass,** then `npm run type-check`.
- [ ] **Step 5: Commit** `feat(auth): email verification service`.

### Task 4: Registration paths

**Files:**
- Modify: `backend/src/services/auth.service.ts` (`registerUser`), `backend/src/services/invite.service.ts` (`registerWithInvite`, `user.create` near line 514), `backend/src/controllers/auth.controller.ts` (response), `backend/src/routes/auth.routes.ts` (`/register/invite/:inviteCode` response)
- Test: `backend/tests/integration/email-verification-register.test.js`

**Interfaces:**
- Consumes: `EmailVerificationService.onSignup`, `releaseUnverifiedAddress` (Task 3).
- Produces: both registration responses gain `verificationRequired: boolean` and `verificationEmailSent: boolean`. `registerUser` passes `isFirstUser: userCount === 0`; `registerWithInvite` passes `false`. Both replace their "email exists" check with: if the existing account can be released (`releaseUnverifiedAddress`) continue, else return `Email already registered.` (409 for `register`).

- [ ] **Step 1: Write the failing tests** (supertest, `emailService.isConfigured` spied): configured signup -> user has `emailVerificationRequired: true`, response `verificationRequired: true`, `sendVerificationEmail` called with a raw token; unconfigured signup -> not gated, `verificationRequired: false`; first user -> `emailVerifiedAt` set, `madeSystemAdmin` true, not gated; address held by a gated unverified account last mailed 2 hours ago -> old account removed, new one created, and the same address held by one mailed 10 minutes ago -> 409 `Email already registered.` with the old account intact; address held by a verified account -> 409; **`sendVerificationEmail` rejecting -> account still created, response `verificationEmailSent: false` (Review Focus 2)**; invite signup is gated too and still receives its role.
- [ ] **Step 2: Run to fail:** `docker compose exec backend npx jest tests/integration/email-verification-register.test.js`.
- [ ] **Step 3: Wire `onSignup` and `releaseUnverifiedAddress` into both paths** and add the response fields.
- [ ] **Step 4: Run to pass,** then the existing `tests/integration/auth.test.js` and `oauth-invite-flow.test.js` to prove nothing regressed.
- [ ] **Step 5: Commit** `feat(auth): gate new signups behind email verification`.

### Task 5: Sign-in block

**Files:**
- Modify: `backend/src/config/passport.ts` (`LocalStrategy`), `backend/src/middleware/auth.ts` (`loginMiddleware`)
- Test: `backend/tests/integration/email-verification-login.test.js`

**Interfaces:**
- Consumes: `isGated` (Task 3), `emailService.isConfigured`.
- Produces: after a correct password, if `isGated(user) && await emailService.isConfigured()`, the strategy returns `done(null, false, { message: 'Please verify your email address to sign in.', code: 'EMAIL_NOT_VERIFIED' })`, and `loginMiddleware` responds `401 { error: info.message, code: info.code }` (no `code` key otherwise). Wrong password still returns the generic message.

- [ ] **Step 1: Write the failing tests:** gated + unverified + configured + correct password -> 401 with `code: 'EMAIL_NOT_VERIFIED'` and no session; same user, wrong password -> 401 with `Invalid email or password.` and no `code`; gated user who is verified -> 200; ungated old user (flags undefined) -> 200; gated unverified user with email not configured -> 200.
- [ ] **Step 2: Run to fail:** `docker compose exec backend npx jest tests/integration/email-verification-login.test.js`.
- [ ] **Step 3: Implement** in the strategy and middleware.
- [ ] **Step 4: Run to pass,** plus `tests/integration/auth-audit.test.js`.
- [ ] **Step 5: Commit** `feat(auth): block sign-in for unverified gated accounts`.

### Task 6: Verify, resend, correct-email endpoints

**Files:**
- Modify: `backend/src/routes/auth.routes.ts`
- Test: `backend/tests/integration/email-verification-routes.test.js`

**Interfaces:**
- Consumes: `EmailVerificationService` (Task 3).
- Produces: `POST /api/auth/verify-email {token}` -> `200 {status}` from `verifyToken`, or `400 {error}` for `invalid`; `POST /api/auth/resend-verification {email}` -> always `200 {message}` (neutral), calls `resendFor`; `POST /api/auth/correct-email {email, password, newEmail}` -> `200 {email: newEmail}`. `correct-email` requires the right password (else `401` generic), a gated unverified account with email configured (else `400`), a valid `newEmail`, lowercases both addresses, uses `releaseUnverifiedAddress(newEmail)` when another account holds it (else `409 Email already registered.`), updates the email, issues and sends a new token, audits `verification_email_corrected`. All three use `authRateLimit`.

- [ ] **Step 1: Write the failing tests:** verify with a good token -> 200 `verified`; garbage -> 400 and no change; resend for a gated account sends once, for an unknown address returns the identical body and sends nothing; **`correct-email` with `Foo@Example.com` and `FOO@example.com` resolves the same account (Review Focus 3)**; wrong password -> 401; target address verified elsewhere -> 409; success changes the address and sends to the new one.
- [ ] **Step 2: Run to fail:** `docker compose exec backend npx jest tests/integration/email-verification-routes.test.js`.
- [ ] **Step 3: Implement the three routes.**
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit** `feat(auth): verify, resend and correct-email endpoints`.

### Task 7: OAuth account resolution

**Files:**
- Create: `backend/src/services/oauth-account.service.ts`
- Modify: `backend/src/config/passport.ts` (both OAuth strategies call the service; delete their duplicated find/link/create blocks)
- Test: `backend/tests/unit/oauth-account.service.test.ts`

**Interfaces:**
- Produces: `export function pickVerifiedEmail(emails?: { value: string; verified?: boolean; primary?: boolean }[]): string | null` (lowercased, trimmed; prefers primary and verified, else first verified, else null); `export async function resolveOAuthUser(prisma: PrismaClient, input: { provider: SocialProvider; providerId: string; email: string; displayName?: string; profileData: string }): Promise<User>` (email is already provider-verified). Rules: no existing user -> create with `passwordHash: null`, `emailVerifiedAt: now`, social account; existing user with `emailVerifiedAt` -> link as today; existing user without it -> link, set `emailVerifiedAt`, and if `emailVerificationRequired` also set `passwordHash: null`; audit `oauth_linked_unverified_account` (with whether the password was cleared) in the unverified case. Strategies: if `pickVerifiedEmail(profile.emails)` is null, `done(new Error('Your <Google|GitHub> email address is not verified by <provider>.'), false)`.

- [ ] **Step 1: Write the failing tests:** `pickVerifiedEmail` for primary-verified, only-unverified (null), mixed case and spaces; `resolveOAuthUser`: new user is created verified with no password; existing verified user is linked and untouched; **existing gated unverified user -> linked, verified, password cleared**; **existing old (ungated, unverified) user -> linked, verified, password kept**; existing social account for the provider is updated, not duplicated.
- [ ] **Step 2: Run to fail:** `docker compose exec backend npx jest tests/unit/oauth-account.service.test.ts`.
- [ ] **Step 3: Implement the service and replace both strategy bodies.** Confirm the real `profile.emails` shape of `passport-google-oauth20` and `passport-github2` (`verified` flag) in `node_modules` and note it in the commit message.
- [ ] **Step 4: Run to pass,** plus `tests/integration/oauth-invite-flow.test.js`.
- [ ] **Step 5: Commit** `fix(auth): only trust provider-verified emails and stop OAuth linking into unverified accounts`.

### Task 8: Purge job

**Files:**
- Create: `backend/src/services/unverified-purge.service.ts`
- Modify: `backend/index.ts`
- Test: `backend/tests/unit/unverified-purge.service.test.ts`

**Interfaces:**
- Consumes: `UNVERIFIED_PURGE_MS`, `isGated` (Task 3).
- Produces: `export async function purgeUnverifiedAccounts(prisma: PrismaClient, now: Date = new Date()): Promise<number>` (returns how many were deleted; returns 0 and does nothing when `!(await emailService.isConfigured())`; selects with `where: { emailVerificationRequired: true, emailVerifiedAt: null, verificationSentAt: { lt: new Date(now.getTime() - UNVERIFIED_PURGE_MS) } }`, deletes each by id, audits `unverified_account_purged`); `export function startUnverifiedPurge(prisma: PrismaClient): NodeJS.Timeout | null` (returns null when `NODE_ENV === 'test'`; runs once at start then every 24h). `index.ts` calls `startUnverifiedPurge` after the server starts.

- [ ] **Step 1: Write the failing tests** with a hand-written fake `prisma` (`user.findMany`, `user.delete` as `jest.fn`): the `where` passed to `findMany` is exactly the shape above (this is the guarantee that old accounts, OAuth accounts, verified accounts and accounts whose mail never went out are never selected); candidates are deleted by id and counted; email not configured -> `findMany` never called, returns 0; `startUnverifiedPurge` returns null under `NODE_ENV=test`.
- [ ] **Step 2: Run to fail:** `docker compose exec backend npx jest tests/unit/unverified-purge.service.test.ts`.
- [ ] **Step 3: Implement and wire into `index.ts`.**
- [ ] **Step 4: Run to pass. Real-database check** (the mock cannot prove this query): in the dev stack with `EMAIL_PROVIDER` pointed at a local SMTP sink, insert via `psql` an old ungated user, a gated unverified user with `verificationSentAt` 8 days ago, one 1 day ago, and a verified gated user; run `purgeUnverifiedAccounts` (a one-off script through `prisma/db.js`) and confirm only the 8-day-old gated unverified user is gone; paste the before and after rows in the PR description.
- [ ] **Step 5: Commit** `feat(auth): purge stale unverified accounts`.

## Phase 2 (frontend for phase 1)

### Task 9: Verify page, "check your email", login and register

**Files:**
- Create: `frontend/pages/verify-email.tsx`, `frontend/components/CheckYourEmail.tsx`
- Modify: `frontend/pages/login.tsx`, `frontend/pages/register.tsx`
- Test: `frontend/__tests__/pages/verify-email.test.tsx`, `frontend/components/CheckYourEmail.test.tsx`, extend `frontend/__tests__/pages/login.test.tsx` and `register.test.tsx`

**Interfaces:**
- Consumes: Task 4 response fields, Task 5 `code: 'EMAIL_NOT_VERIFIED'`, Task 6 endpoints.
- Produces: `CheckYourEmail` props `{ email: string; password: string; emailSent: boolean; onEmailChanged?: (email: string) => void }`: states "we sent a link to <email>" (or "we could not send the email; use resend" when `emailSent` is false), a Resend button (`POST /api/auth/resend-verification`), and a "Wrong address?" labeled input plus submit (`POST /api/auth/correct-email`), with success and error text in an `aria-live="polite"` region. `verify-email` page: reads `router.query.token`, `POST /api/auth/verify-email`, shows verifying / verified (link to sign in) / already verified / invalid (link to sign in, where Resend lives).
- Login: on 401 with `code === 'EMAIL_NOT_VERIFIED'` render `CheckYourEmail` (using the email and password already typed) instead of the generic error. Register: when the response has `verificationRequired` render `CheckYourEmail` instead of redirecting to `/login`; otherwise unchanged.

- [ ] **Step 1: Write the failing tests:** verify page shows success for 200, "already verified" copy for `already_verified`, an invalid-link message with a sign-in link for 400; `CheckYourEmail` Resend posts the email, the correct-address form posts `{email, password, newEmail}` and calls `onEmailChanged`, `emailSent={false}` shows the could-not-send copy; login with a mocked `EMAIL_NOT_VERIFIED` 401 renders the component and not the generic error; register with `verificationRequired: true` renders it and does not navigate.
- [ ] **Step 2: Run to fail:** `docker compose exec frontend npx jest __tests__/pages/verify-email.test.tsx components/CheckYourEmail.test.tsx __tests__/pages/login.test.tsx __tests__/pages/register.test.tsx`.
- [ ] **Step 3: Implement** (shadcn `Alert`, `Button`, `Input`, `Label`; focus moves to the heading when the component appears).
- [ ] **Step 4: Run to pass, then** `docker compose exec frontend npx tsc --noEmit` (no new errors) and the full frontend suite. Run the `accessibility-reviewer` agent on the diff.
- [ ] **Step 5: Commit** `feat(auth): verify-email page and check-your-email flow`.

## Phase 3: email change

### Task 10: Email change on the backend

**Files:**
- Modify: `backend/src/services/user.service.ts` (`updateProfile`), `backend/src/services/email-verification.service.ts` (`verifyToken` handles `pendingEmail`)
- Test: `backend/tests/integration/email-change.test.js`

**Interfaces:**
- Consumes: Tasks 2 and 3.
- Produces: `updateProfile(userId, { name, email })` with a changed address: if email is not configured, behaves as today (writes the new email); otherwise does **not** write it, rejects with `Email already in use.` when another account owns it, calls `sendVerification(user, newEmail)` (which issues the token bound to `newEmail` and mails it there), `sendEmailChangeRequestedNotice(oldEmail, name, maskEmail(newEmail))`, audits `email_change_requested`, and returns the profile plus `emailChangePending: newEmail`. `verifyToken` for a token with `pendingEmail`: re-check no other account owns it (else `invalid`, address unchanged), set `email = pendingEmail` and `emailVerifiedAt = now` (the token's bound address is the pending address, so the plain-case "token address must equal the user's current email" rule does not apply to this branch; make the update conditional on the user's current email being the one just read, as in the plain case), send `sendEmailChangedNotice(oldEmail, name, maskEmail(newEmail))`, audit `email_change_applied`, return `{status: 'email_changed', userId}`. The old address stays in use until then.

- [ ] **Step 1: Write the failing tests:** configured change -> email unchanged, token created with `pendingEmail`, verification sent to the new address, requested notice sent to the old address with the masked new one; unconfigured change -> applied immediately, no mail; **new address owned by another account -> rejected at request, and if taken between request and verify -> `invalid` and old address intact (Review Focus 4)**; verifying applies the change, sends the changed notice to the old address, and the user can then sign in with the new address.
- [ ] **Step 2: Run to fail:** `docker compose exec backend npx jest tests/integration/email-change.test.js`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to pass,** plus `tests/integration/profile.test.js`.
- [ ] **Step 5: Commit** `feat(auth): verify email changes and notify the old address`.

### Task 11: Email change on the profile page

**Files:**
- Modify: `frontend/pages/profile/settings.tsx` (`handleProfileSubmit`)
- Test: `frontend/__tests__/pages/profile/settings.test.tsx` (extend or create)

**Interfaces:**
- Consumes: Task 10 response `emailChangePending`.
- Produces: after a successful `PATCH /api/users/me/profile` with `emailChangePending`, show an `Alert` (announced politely): "We sent a link to <new>. Your email stays <old> until you verify." The form's email field keeps showing the current address.

- [ ] **Step 1: Write the failing test:** a mocked PATCH response with `emailChangePending: 'new@example.com'` renders that message and the old address is still in the field.
- [ ] **Step 2: Run to fail:** `docker compose exec frontend npx jest __tests__/pages/profile/settings.test.tsx`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to pass,** `tsc --noEmit`, accessibility-reviewer on the diff.
- [ ] **Step 5: Commit** `feat(profile): show pending email change`.

## Phase 4: loud config, nudge, docs

### Task 12: No-email warning (log and admin banner)

**Files:**
- Modify: `backend/src/routes/admin.routes.ts`, `backend/index.ts`, `frontend/pages/_app.tsx`
- Create: `frontend/components/EmailSetupBanner.tsx`
- Test: `backend/tests/integration/admin-email-status.test.js`, `frontend/components/EmailSetupBanner.test.tsx`

**Interfaces:**
- Produces: `GET /api/admin/email-status` (`requireSystemAdmin()`) -> `{ configured: boolean }` from `emailService.isConfigured()`; at startup, when not configured, `logger().warn` a multi-line message stating that email verification is DISABLED and email setup is strongly recommended (name `EMAIL_PROVIDER`); `EmailSetupBanner` (shadcn `Alert`, `role="alert"`) rendered by `_app.tsx` above the page for system admins when the pathname starts with `/admin` and `configured` is false, linking to the email section of the admin guide.

- [ ] **Step 1: Write the failing tests:** endpoint returns `{configured:false}` / `true` for a system admin and 403 for others; banner renders for `configured: false` with the strong wording and renders nothing when true.
- [ ] **Step 2: Run to fail:** `docker compose exec backend npx jest tests/integration/admin-email-status.test.js` and `docker compose exec frontend npx jest components/EmailSetupBanner.test.tsx`.
- [ ] **Step 3: Implement** (endpoint, startup warning in the `app.listen` callback, banner, `_app.tsx` wiring).
- [ ] **Step 4: Run to pass,** `tsc --noEmit`, accessibility-reviewer.
- [ ] **Step 5: Commit** `feat(admin): loudly warn when email is not configured`.

### Task 13: Nudge for existing unverified users

**Files:**
- Modify: `backend/src/routes/auth.routes.ts` (`GET /session`), `backend/src/routes/user.routes.ts`, `frontend/pages/_app.tsx`
- Create: `frontend/components/UnverifiedEmailBanner.tsx`
- Test: `backend/tests/integration/session-verification.test.js`, `frontend/components/UnverifiedEmailBanner.test.tsx`

**Interfaces:**
- Produces: `/api/session` user gains `emailVerified: boolean` and `canVerifyEmail: boolean` (`!emailVerified && !!passwordHash && await emailService.isConfigured()`); `POST /api/users/me/verification-email` (authenticated) issues and sends a token to the current address (respecting the 60 second cooldown) and returns `200 {message}`; `UnverifiedEmailBanner` shows when `canVerifyEmail`, with a "Send verification email" button and polite confirmation.

- [ ] **Step 1: Write the failing tests:** session fields for verified, unverified with password and email configured (`canVerifyEmail` true), OAuth-only, and email not configured (false); the endpoint sends once and the cooldown blocks an immediate repeat; the banner shows only for `canVerifyEmail` and posts on click.
- [ ] **Step 2: Run to fail:** `docker compose exec backend npx jest tests/integration/session-verification.test.js` and `docker compose exec frontend npx jest components/UnverifiedEmailBanner.test.tsx`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to pass,** `tsc --noEmit`, accessibility-reviewer.
- [ ] **Step 5: Commit** `feat(auth): nudge existing users to verify their email`.

### Task 14: Documentation

**Files:**
- Modify: `website/docs/admin-guide/deployment.md` (a prominent callout: email is strongly recommended, verification is off without it), `website/docs/admin-guide/system-configuration.md` (email section: what changes when configured), `website/docs/user-guide/authentication.md` and `profile-management.md` (verifying at signup, changing email, the notices), `website/docs/user-guide/invite-links.md` (invited signups verify too), `website/docs/security/authentication.md` and `audit-logging.md` (verification, OAuth rules, new audit actions), `website/docs/developer-docs/data-model.md` (new `User` fields and `EmailVerificationToken`), `docs/revival-plan.md`.

- [ ] **Step 1: Update each file** to match the shipped behavior; run `/docs-review` logic over the diff.
- [ ] **Step 2: Build the docs:** `cd website && npm run build`; expected: succeeds with no new broken-link warnings.
- [ ] **Step 3: Commit** `docs: email verification`.
