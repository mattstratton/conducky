import crypto from 'crypto';
import type { PrismaClient, User } from '../generated/prisma/client';
import { emailService } from '../utils/email';
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

export class EmailVerificationService {
  constructor(
    private prisma: PrismaClient,
    private mailer = emailService
  ) {}

  /** Replaces the user's earlier unused tokens; returns the raw token (only its hash is stored). */
  async issueToken(userId: string, pendingEmail?: string): Promise<string> {
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } });
    const raw = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(raw),
        pendingEmail: pendingEmail ?? null,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });
    return raw;
  }

  async sendVerification(
    user: { id: string; email: string; name: string | null },
    pendingEmail?: string
  ): Promise<boolean> {
    try {
      const raw = await this.issueToken(user.id, pendingEmail);
      const result = await this.mailer.sendVerificationEmail(
        pendingEmail ?? user.email,
        user.name ?? '',
        raw,
        { emailChange: !!pendingEmail }
      );
      if (!result.success) return false;
      await this.prisma.user.update({ where: { id: user.id }, data: { verificationSentAt: new Date() } });
      await logAudit({ action: 'verification_email_sent', targetType: 'User', targetId: user.id, userId: user.id });
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

    const alreadyVerified = async (): Promise<VerifyResult> => {
      const u = await this.prisma.user.findUnique({ where: { id: token.userId } });
      return u?.emailVerifiedAt ? { status: 'already_verified' } : { status: 'invalid' };
    };

    if (token.usedAt) return alreadyVerified();
    if (token.expiresAt.getTime() < Date.now()) return { status: 'invalid' };

    // Atomic single-use claim: of two concurrent clicks, only one gets count 1.
    const claimed = await this.prisma.emailVerificationToken.updateMany({
      where: { id: token.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) return alreadyVerified();

    await this.prisma.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: new Date() } });
    await logAudit({ action: 'email_verified', targetType: 'User', targetId: token.userId, userId: token.userId });
    return { status: 'verified', userId: token.userId };
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
   * Frees an address held by an unverified signup so someone else can register it.
   * Only when mail works and the last verification mail is over TAKEOVER_GRACE_MS old (or never sent),
   * so a pending signup cannot be wiped by a stranger.
   */
  async releaseUnverifiedAddress(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !isGated(user)) return false;
    if (!(await this.mailer.isConfigured())) return false;
    const sentAt = user.verificationSentAt;
    if (sentAt && Date.now() - sentAt.getTime() <= TAKEOVER_GRACE_MS) return false;
    await this.prisma.user.delete({ where: { id: user.id } });
    await logAudit({ action: 'unverified_account_replaced', targetType: 'User', targetId: user.id, userId: user.id });
    return true;
  }

  /** Never reveals whether the address exists, is verified or is rate limited. */
  async resendFor(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !isGated(user)) return;
    if (!(await this.mailer.isConfigured())) return;
    if (user.verificationSentAt && Date.now() - user.verificationSentAt.getTime() < RESEND_COOLDOWN_MS) return;
    await this.sendVerification(user);
  }
}
