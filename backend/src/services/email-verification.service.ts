import crypto from 'crypto';
import bcrypt from 'bcrypt';
import validator from 'validator';
import type { PrismaClient, User } from '../generated/prisma/client';
import { emailService, maskEmail } from '../utils/email';
import { logAudit } from '../utils/audit';
import logger from '../config/logger';

export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const UNVERIFIED_PURGE_MS = 7 * 24 * 60 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const TAKEOVER_GRACE_MS = 60 * 60 * 1000;

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/** Gated = verification required and not yet verified. Missing fields mean not gated. */
export function isGated(user: {
  emailVerificationRequired?: boolean | null;
  emailVerifiedAt?: Date | null;
}): boolean {
  return !!user.emailVerificationRequired && !user.emailVerifiedAt;
}

export type VerifyResult =
  | { status: 'verified' | 'email_changed'; userId: string }
  | { status: 'already_verified' }
  | { status: 'invalid' };

export type CorrectEmailResult =
  | { status: 'ok'; email: string; verificationEmailSent: boolean }
  | { status: 'invalid_input' | 'invalid_email' | 'invalid_credentials' | 'not_eligible' | 'taken' | 'cooldown' };

export type OwnVerificationResult =
  | { status: 'ok'; emailSent: boolean; email: string }
  | { status: 'already_verified' | 'not_eligible' | 'cooldown' | 'pending_change' };

// Valid bcrypt hash of a throwaway string: unknown accounts still pay for a compare (timing).
const DUMMY_HASH = '$2b$10$K7L1OJ45/4Y.aKqyudyeNu.oQ8fP3WXAoVLYU2aEXCLWHuCrTyHqS';
const norm = (v: unknown): string => (typeof v === 'string' ? v.trim().toLowerCase() : '');

export class EmailVerificationService {
  constructor(
    private prisma: PrismaClient,
    private mailer = emailService
  ) {}

  /**
   * Replaces the user's earlier unused tokens; returns the raw token (only its hash is stored).
   * `email` is the address this token is mailed to; verifyToken only honours it while it is still the user's address.
   */
  async issueToken(userId: string, email: string, pendingEmail?: string): Promise<string> {
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } });
    const raw = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(raw),
        email: norm(email),
        pendingEmail: pendingEmail ? norm(pendingEmail) : null,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });
    return raw;
  }

  /** Revokes the user's unused tokens (e.g. a pending email change) after a password change or an unconfigured-mail email write. Logs, never throws. */
  async revokeUnusedTokens(userId: string): Promise<void> {
    try {
      await this.prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } });
    } catch (err) {
      logger().error('Failed to revoke unused verification tokens', {
        userId,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  async sendVerification(
    user: { id: string; email: string; name: string | null },
    pendingEmail?: string
  ): Promise<boolean> {
    try {
      // The console provider logs whole mails, link included: never issue a token or mail without a real provider.
      if (!(await this.mailer.isConfigured())) return false;
      // ONE destination for both the token binding and the recipient, so they cannot diverge.
      const to = norm(pendingEmail ?? user.email);
      const raw = await this.issueToken(user.id, to, pendingEmail);
      const result = await this.mailer.sendVerificationEmail(
        to,
        user.name ?? '',
        raw,
        { emailChange: !!pendingEmail }
      );
      if (!result.success) return false;
      await this.prisma.user.update({ where: { id: user.id }, data: { verificationSentAt: new Date() } });
      // The mail is out and verificationSentAt is set: a failed audit must not report "could not send".
      try {
        await logAudit({ action: 'verification_email_sent', targetType: 'User', targetId: user.id, userId: user.id });
      } catch (auditErr) {
        logger().error('Audit of verification email failed', {
          userId: user.id,
          error: auditErr instanceof Error ? auditErr.message : 'unknown',
        });
      }
      return true;
    } catch (err) {
      logger().error('Failed to send verification email', {
        userId: user.id,
        error: err instanceof Error ? err.message : 'unknown',
      });
      return false;
    }
  }

  async verifyToken(raw: string): Promise<VerifyResult> {
    if (!raw) return { status: 'invalid' };
    const token = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(raw) } });
    if (!token) return { status: 'invalid' };
    // An email-change token is bound to the PENDING address; anything else fails closed.
    const pending = token.pendingEmail ? norm(token.pendingEmail) : null;
    if (pending && norm(token.email) !== pending) return { status: 'invalid' };
    // Expiry first, so a used token that has also expired is invalid, not already_verified.
    if (token.expiresAt.getTime() < Date.now()) return { status: 'invalid' };

    // Claim + verify in one transaction: a concurrent duplicate waits on the winner's row lock, then
    // re-reads the user (after the lost claim) to see the committed emailVerifiedAt, and a failed user
    // update can't burn the token.
    // The token only counts for the address it was mailed to (token.email), which must still be the
    // user's current address; the conditional updateMany makes that check atomic with the update.
    const ROLLBACK = new Error('address changed since the token was mailed');
    type Outcome =
      | { kind: 'verified' }
      | { kind: 'already_verified' }
      | { kind: 'invalid' }
      | { kind: 'changed'; oldEmail: string; name: string | null; newEmail: string };
    let outcome: Outcome;
    try {
      outcome = await this.prisma.$transaction(async (tx): Promise<Outcome> => {
        const u = await tx.user.findUnique({ where: { id: token.userId } });
        // A token for a stale (or unbound) address is rejected before it is claimed.
        // (A change token's address is the pending one, so it legitimately differs from the current one.)
        if (!u || !token.email || (!pending && norm(token.email) !== norm(u.email))) return { kind: 'invalid' };
        const claimed = await tx.emailVerificationToken.updateMany({
          where: { id: token.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        if (claimed.count === 0) {
          // Lost the claim: answer from a FRESH read, never the pre-claim one, which may predate the winner's commit.
          const cur = await tx.user.findUnique({ where: { id: token.userId } });
          return cur?.emailVerifiedAt && norm(cur.email) === norm(token.email)
            ? { kind: 'already_verified' }
            : { kind: 'invalid' };
        }
        if (pending) {
          // Token already claimed: an unused change token whose address is already the user's is stale.
          if (norm(u.email) === pending) throw ROLLBACK;
          const owner = await tx.user.findUnique({ where: { email: pending } });
          if (owner && owner.id !== token.userId) throw ROLLBACK;
          // Other unused tokens (a stale change, an old link) must not outlive the change. Token rows
          // before the user row, as everywhere else. The claimed token has usedAt set, so it stays.
          await tx.emailVerificationToken.deleteMany({ where: { userId: token.userId, usedAt: null } });
          const applied = await tx.user.updateMany({
            where: { id: token.userId, email: u.email },
            data: { email: pending, emailVerifiedAt: new Date() },
          });
          if (applied.count !== 1) throw ROLLBACK;
          return { kind: 'changed', oldEmail: u.email, name: u.name, newEmail: pending };
        }
        const { count } = await tx.user.updateMany({
          where: { id: token.userId, email: u.email },
          data: { emailVerifiedAt: new Date() },
        });
        if (count !== 1) throw ROLLBACK;
        return { kind: 'verified' };
      });
    } catch (err) {
      if (err === ROLLBACK) return { status: 'invalid' };
      // The pending address was taken between the owner check and the update.
      if (pending && (err as { code?: string } | null)?.code === 'P2002') return { status: 'invalid' };
      throw err;
    }
    if (outcome.kind === 'changed') {
      await this.afterEmailChanged(token.userId, outcome.oldEmail, outcome.name, outcome.newEmail);
      return { status: 'email_changed', userId: token.userId };
    }
    if (outcome.kind !== 'verified') return { status: outcome.kind };
    await logAudit({ action: 'email_verified', targetType: 'User', targetId: token.userId, userId: token.userId });
    return { status: 'verified', userId: token.userId };
  }

  /** Post-commit side effects of an applied email change; none of them may fail the (already committed) change. */
  private async afterEmailChanged(userId: string, oldEmail: string, name: string | null, newEmail: string) {
    try {
      if (await this.mailer.isConfigured()) {
        await this.mailer.sendEmailChangedNotice(oldEmail, name ?? '', maskEmail(newEmail));
      }
    } catch (err) {
      logger().error('Failed to send email-changed notice', { userId, error: err instanceof Error ? err.message : 'unknown' });
    }
    try {
      await logAudit({ action: 'email_change_applied', targetType: 'User', targetId: userId, userId });
    } catch (err) {
      logger().error('Audit of email change failed', { userId, error: err instanceof Error ? err.message : 'unknown' });
    }
  }

  async onSignup(
    user: User,
    opts: { isFirstUser: boolean }
  ): Promise<{ verificationRequired: boolean; emailSent: boolean }> {
    if (opts.isFirstUser) {
      await this.prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
      return { verificationRequired: false, emailSent: false };
    }
    if (!(await this.mailer.isConfigured())) return { verificationRequired: false, emailSent: false };
    await this.prisma.user.update({ where: { id: user.id }, data: { emailVerificationRequired: true } });
    const emailSent = await this.sendVerification(user);
    return { verificationRequired: true, emailSent };
  }

  /**
   * onSignup for a just-created user, failing closed: if gating throws, log the error first, then try to
   * delete the user so no usable ungated account survives. Returns null on failure (callers answer
   * `Registration failed.`); never throws.
   */
  async gateNewUser(
    user: User,
    opts: { isFirstUser: boolean }
  ): Promise<{ verificationRequired: boolean; emailSent: boolean } | null> {
    try {
      return await this.onSignup(user, opts);
    } catch (err) {
      logger().error('Signup gating failed; removing new user', {
        userId: user.id,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
    try {
      await this.prisma.user.delete({ where: { id: user.id } });
    } catch (err) {
      logger().error('Cleanup of ungated new user failed; account may remain ungated', {
        userId: user.id,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
    return null;
  }

  /**
   * Frees an address held by an unverified signup so someone else can register it.
   * Only when mail works and the last verification mail (or, if none was sent, account creation)
   * is over TAKEOVER_GRACE_MS old, so a pending signup cannot be wiped by a stranger.
   * Returns false, never throws on a blocked delete (see deleteGatedUnverifiedAccount).
   */
  async releaseUnverifiedAddress(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !isGated(user)) return false;
    if (!(await this.mailer.isConfigured())) return false;
    const now = Date.now();
    const since = user.verificationSentAt ?? user.createdAt;
    if (since && now - since.getTime() <= TAKEOVER_GRACE_MS) return false;
    if (!(await this.deleteGatedUnverifiedAccount(user.id, { lastMailBefore: new Date(now - TAKEOVER_GRACE_MS) }))) return false;
    // userId null: the actor is the anonymous registrant, and AuditLog.userId would FK-fail on the deleted id.
    await logAudit({ action: 'unverified_account_replaced', targetType: 'User', targetId: user.id, userId: null });
    return true;
  }

  /**
   * Deletes exactly one gated, unverified account plus the ON DELETE RESTRICT children it can have.
   * Does NOT check the grace window or isConfigured: callers (release, purge) do.
   * True only when that account was deleted. False if it is not gated-unverified (or vanished), or
   * a remaining RESTRICT relation blocks the delete (P2003: created organizations or organization
   * invite links, which a never-signed-in gated account cannot have). Other errors are rethrown.
   * UserRole rows go with the user (ON DELETE CASCADE), so role holders are deleted too.
   * With opts.lastMailBefore, the delete also requires the last verification mail (or, if none was
   * sent, account creation) to predate it, so a resend that lands after the caller's check wins.
   */
  async deleteGatedUnverifiedAccount(userId: string, opts?: { lastMailBefore?: Date }): Promise<boolean> {
    const ROLLBACK = new Error('not a gated unverified account');
    try {
      await this.prisma.$transaction(async (tx) => {
        const where = { userId };
        // Token rows before the user row, like verifyToken and correctEmail, so a racing click cannot deadlock the purge.
        await tx.emailVerificationToken.deleteMany({ where });
        await tx.passwordResetToken.deleteMany({ where });
        await tx.userNotificationSettings.deleteMany({ where });
        await tx.userAvatar.deleteMany({ where });
        await tx.socialAccount.deleteMany({ where });
        await tx.notification.deleteMany({ where });
        // Conditional delete closes the race with a concurrent verification; rollback undoes the child deletes.
        const { count } = await tx.user.deleteMany({
          where: {
            id: userId,
            emailVerificationRequired: true,
            emailVerifiedAt: null,
            ...(opts?.lastMailBefore && {
              OR: [
                { verificationSentAt: { lt: opts.lastMailBefore } },
                { verificationSentAt: null, createdAt: { lt: opts.lastMailBefore } },
              ],
            }),
          },
        });
        if (count !== 1) throw ROLLBACK;
      });
      return true;
    } catch (err) {
      if (err === ROLLBACK || (err as { code?: string })?.code === 'P2003') return false;
      throw err;
    }
  }

  /**
   * A signed-in password account asks for a verification mail to its CURRENT address (the nudge for
   * accounts that predate verification). Re-reads the user; never blocks anything, so no gating involved.
   */
  async sendOwnVerification(userId: string): Promise<OwnVerificationResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { status: 'not_eligible' };
    if (user.emailVerifiedAt) return { status: 'already_verified' };
    // isConfigured last: the console provider logs the whole mail, token included.
    if (!user.passwordHash || !(await this.mailer.isConfigured())) return { status: 'not_eligible' };
    if (user.verificationSentAt && Date.now() - user.verificationSentAt.getTime() < RESEND_COOLDOWN_MS) {
      return { status: 'cooldown' };
    }
    // A live change token would be revoked by issuing a new one, silently killing the link already mailed.
    const live = await this.prisma.emailVerificationToken.findMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (live.some((t) => t.pendingEmail)) return { status: 'pending_change' };
    return { status: 'ok', emailSent: await this.sendVerification(user), email: norm(user.email) };
  }

  /** Never reveals whether the address exists, is verified or is rate limited. */
  async resendFor(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !isGated(user)) return;
    if (!(await this.mailer.isConfigured())) return;
    if (user.verificationSentAt && Date.now() - user.verificationSentAt.getTime() < RESEND_COOLDOWN_MS) return;
    await this.sendVerification(user);
  }

  /**
   * Lets a gated unverified account fix a mistyped address. Order matters: ALL validation first
   * (inputs, password, eligibility), then release of a stale holder, then one transaction that
   * revokes unused tokens and changes the address only if the account is STILL gated, so a
   * concurrent verification (or an old token) can never verify an address that was not mailed.
   */
  async correctEmail(input: { email: unknown; password: unknown; newEmail: unknown }): Promise<CorrectEmailResult> {
    const email = norm(input.email);
    const newEmail = norm(input.newEmail);
    const password = input.password;
    if (!email || typeof password !== 'string' || !password) return { status: 'invalid_input' };
    if (!newEmail || newEmail.length > 254 || !validator.isEmail(newEmail)) return { status: 'invalid_email' };

    const user = await this.prisma.user.findUnique({ where: { email } });
    const hashOk = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
    if (!user || !user.passwordHash || !hashOk) return { status: 'invalid_credentials' };
    if (!isGated(user) || !(await this.mailer.isConfigured())) return { status: 'not_eligible' };

    if (newEmail === email) {
      if (user.verificationSentAt && Date.now() - user.verificationSentAt.getTime() < RESEND_COOLDOWN_MS) {
        return { status: 'cooldown' };
      }
      return { status: 'ok', email, verificationEmailSent: await this.sendVerification(user) };
    }

    // Same cooldown as the same-address branch, checked before anything is released, changed or sent.
    if (user.verificationSentAt && Date.now() - user.verificationSentAt.getTime() < RESEND_COOLDOWN_MS) {
      return { status: 'cooldown' };
    }

    if (await this.prisma.user.findUnique({ where: { email: newEmail } })) {
      if (!(await this.releaseUnverifiedAddress(newEmail))) return { status: 'taken' };
    }

    try {
      const changed = await this.prisma.$transaction(async (tx) => {
        await tx.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } });
        const { count } = await tx.user.updateMany({
          where: { id: user.id, emailVerificationRequired: true, emailVerifiedAt: null },
          data: { email: newEmail },
        });
        return count === 1;
      });
      if (!changed) return { status: 'not_eligible' };
    } catch (err) {
      if ((err as { code?: string } | null)?.code === 'P2002') return { status: 'taken' };
      throw err;
    }

    const verificationEmailSent = await this.sendVerification({ id: user.id, email: newEmail, name: user.name });
    try {
      await logAudit({ action: 'verification_email_corrected', targetType: 'User', targetId: user.id, userId: user.id });
    } catch (err) {
      logger().error('Audit of email correction failed', {
        userId: user.id,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
    return { status: 'ok', email: newEmail, verificationEmailSent };
  }
}
