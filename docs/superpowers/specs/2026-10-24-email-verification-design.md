# Email verification (#314): design

Status: draft for builder review. Issue: #314 (the issue itself has no description, only a title). Written 2026-10-24 after a design conversation with the maintainer. Anything marked **(my call)** is the designer's decision, not the maintainer's, and is open to override.

## Why

Two problems, in the maintainer's words:

1. Someone signs up with a typo in their email, so they never get notifications and nothing tells them.
2. Someone creates a fake user with no verified email and uses it for abuse.

The first matters most in this product: for a reporter, email is how they hear that an incident was acknowledged or resolved, so a silent typo means they report something sensitive and never get a response. What would make the maintainer wince: **nobody tells a person that their email was changed.**

A third problem turned up while reading the code (account takeover, below), and verification closes it.

## What exists today

- `User` (`backend/prisma/schema.prisma`) has no verified field. `passwordHash` is optional (social-only users).
- Four places create users: `AuthService.registerUser` (`backend/src/services/auth.service.ts`), `InviteService.registerWithInvite` (`backend/src/services/invite.service.ts`, its own `user.create`), and the Google and GitHub strategies in `backend/src/config/passport.ts`. The seeds (`backend/prisma/seed.js`, `sample-data-seed.js`, `org-seed.js`) also create users.
- `registerUser` makes the **first user on an instance System Admin**.
- Registration does not sign anyone in; `frontend/pages/register.tsx` redirects to `/login` with a success message.
- Sign-in is `LocalStrategy` in `passport.ts`: look up by email, bcrypt compare, done.
- **Account takeover hole:** both OAuth strategies find an existing user by email and link the social account to it, with no check of that account's verification and no check of the provider's own verified flag (Google `email_verified`; GitHub reports a verified flag per email, which is unchecked). So someone can register with a victim's email plus a password; when the victim later signs in with Google they land in the attacker's account, which still has the attacker's password.
- Users can change their email today: `PUT` profile calls `UserService.updateProfile` (`backend/src/services/user.service.ts`), which writes `email` immediately with no check.
- Email goes through `EmailService` (`backend/src/utils/email.ts`), which reads **environment variables** at construction (`EMAIL_PROVIDER`, default `console`; falls back to console if the connection test fails). The admin UI (`backend/src/routes/admin.routes.ts`, `/settings/email`) saves email settings to the `email` `SystemSetting` and can send a test message from them, but nothing applies those saved settings to the live `emailService`. That is a separate, existing gap (not fixed here).
- `PasswordResetToken` (`token`, `expiresAt`, `used`) is the existing pattern for emailed single-use tokens. `authRateLimit` (`backend/src/middleware/rate-limit.ts`) and `logAudit` exist.

## Decisions (the maintainer's)

**Sign-in rules**
- Email/password signups cannot sign in until they verify, enforced as a hard block. The block applies after the password is checked, so it never reveals anything to someone who does not know the password. The rejection carries a distinct code so the UI can offer "resend".
- Google and GitHub users need no verification step. They are verified from the start, but only when the provider marks the email verified; an unverified provider email is rejected.
- OAuth sign-in must not silently link into an existing account whose email is unverified (closes the takeover hole). When the provider vouches for the email (see above) and the matching account is unverified, it links, marks the account verified, and then differs by account type: for a **new gated account**, it also clears the password hash (the person can set a new one with "forgot password") and ends that account's other sessions; for an **old (grandfathered) account**, it keeps the password, because those people have been signing in with it and clearing it would surprise them. Accepted cost, decided by the maintainer: an old account an attacker created on someone else's email stays a small, unlikely hole.
- If the instance has no working email setup, verification is skipped (no block), and the app is loud about it. "Configured" means a real provider (SMTP or SendGrid), not the console fallback. Loud means: a warning in the backend startup log, a banner for System Admins on the admin pages, and a "strongly recommended" callout in the deployment guide.
- The "check your email" screen after signup lets people correct the address and resend, so a typo does not strand them.

**Existing accounts**
- Existing users are never locked out. They keep signing in, and they see a banner asking them to verify. Only new signups are blocked.

**Lifecycle**
- A verification link expires after 24 hours and can be resent.
- A new account that never verifies is deleted after about 7 days, which frees its address. If a real owner signs up with an address held by an unverified account, they take it over and the unverified account is replaced.
- 24 hours and 7 days are constants, not settings.

**Email change**
- A changed email is not applied until the new address is verified. The old address stays active (sign-in, notifications, password reset) until then. A verification link goes to the new address.
- The old address gets two notices: when the change is proposed (partly masked new address; "if this was not you, change your password") and when it takes effect. No cancel link in this version.

## My calls

- **(my call) The first user is exempt from the block** and is stored as verified at creation (so they can never be blocked, taken over or purged). "First user" is the same `userCount === 0` rule `registerUser` already uses for the System Admin grant; the seeds are unaffected because they mark their users verified. They are the instance owner and the bootstrap System Admin; a mail setup that tests fine but does not deliver must not be able to lock them out of their own instance.
- **(my call) Invite signups are gated like normal signups.** Invite links (`EventInviteLink`, `OrganizationInviteLink`) carry a code, expiry and max uses but are not bound to an email address, and `registerWithInvite` accepts any address, so an invite proves nothing about the email. The role is still granted at registration, but the account cannot sign in until it verifies, and an unverified invited account is purgeable like any other (builder: decide whether a purged account gives its invite use back).
- **(my call) "Gated" is a fact recorded at account creation**, true only if email was configured at that moment. Accounts created while email is not configured are never gated (they behave like existing accounts: they sign in, they see the nudge banner), even if the operator configures email later. The sign-in block and the purge each also check "configured" at the time they run: if email is not configured or has broken since, nobody is blocked and nothing is purged. The purge age is measured from the last verification email that was sent successfully (a resend restarts it), so an outage cannot get someone deleted for a link they never received.
- **(my call) "Configured" is decided from the live `EmailService`, not from the admin UI's saved settings,** because only the live service actually sends. File a separate issue for the admin UI settings not reaching `emailService`.
- **(my call) Tokens** are random, stored hashed, single use, with a 24 hour expiry, in a new table modeled on `PasswordResetToken`, with an optional pending new email for the change flow. Never logged.
- **(my call) Verification responses are neutral** (resend never says whether an address is registered). Fixing the existing enumeration through `register` and `check-email` is out of scope.
- **(my call) Seeds mark their users verified,** so a dev who configures real email and seeds can still sign in.

## Goals

- A typo at signup, or at an email change, is caught and correctable before it silently breaks notifications.
- A fake account cannot sign in without controlling its address, and cannot take over a real person's account through OAuth.
- Nobody's email changes without the previous address being told.

## Non-goals

- 2FA (#377). Periodic re-verification. Forcing existing users to verify. A cancel link on change notices. Fixing account enumeration on `register` and `check-email`. Making the admin UI email settings take effect. A setting to turn verification off (the no-email case is the only off switch).

## Anti-goals (a failure even if it technically works)

- Locking out any existing user on upgrade, or locking out an instance with no email.
- The 7 day purge ever touching an account that existed before this ships, or any OAuth account. It must only target accounts that were gated.
- A silent email change.
- Tokens in logs, responses or audit entries. Confirming to an anonymous caller that an address is registered.

## Constraints

- Project rules apply (`CLAUDE.md`): audit-log security-relevant actions with `logAudit` (verification sent, verified, email change requested and applied, unverified account purged); rate-limit the new endpoints; validate server-side; tests ship with the code; keep `website/docs/` true; accessibility (the new screens and banners need labels, announced errors, keyboard access, visible focus).
- Express 5, Prisma 7 (use `createPrismaClient()`, add a migration with `prisma migrate dev`), Next.js Pages Router, shadcn/ui.
- All four user-creation paths must set verification state consistently.

## Left to the builder

- How existing (grandfathered) accounts are told apart from new unverified ones, as long as the purge and the block can never touch an existing account: for example a column set only on new signups, or a stored cutover. Schema shape in general.
- Phasing. Suggested split: (1) schema, token service, registration and sign-in block, OAuth rules; (2) email change flow and notices; (3) banners, startup warning, docs. Each phase is shippable.
- How the purge runs (startup sweep, scheduled job, or lazily on signup), within the instance's existing infrastructure.
- Email copy and template styling, following the existing helpers in `email.ts`.
- Docs to update: deployment guide, user guide (signup, profile), security docs, and the revival plan.
