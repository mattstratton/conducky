import type { PrismaClient } from '../generated/prisma/client';
import { emailService } from '../utils/email';
import { logAudit } from '../utils/audit';
import logger from '../config/logger';
import { EmailVerificationService, UNVERIFIED_PURGE_MS } from './email-verification.service';

const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Deletes gated accounts that never verified within UNVERIFIED_PURGE_MS of their
 * verification mail going out. The where clause is the safety guarantee: ungated,
 * verified, OAuth-created and never-mailed (null verificationSentAt) accounts are
 * never selected. Does nothing while mail cannot be delivered.
 */
export async function purgeUnverifiedAccounts(
  prisma: PrismaClient,
  now: Date = new Date(),
  service: EmailVerificationService = new EmailVerificationService(prisma)
): Promise<number> {
  if (!(await emailService.isConfigured())) return 0;

  const cutoff = new Date(now.getTime() - UNVERIFIED_PURGE_MS);
  const candidates = await prisma.user.findMany({
    where: {
      emailVerificationRequired: true,
      emailVerifiedAt: null,
      verificationSentAt: { lt: cutoff },
    },
    select: { id: true },
  });

  let deleted = 0;
  for (const { id } of candidates) {
    try {
      if (!(await service.deleteGatedUnverifiedAccount(id, { lastMailBefore: cutoff }))) {
        // Usually a foreign key blocking the delete: say so, or it is skipped silently every day.
        logger().warn('Unverified account purge skipped a candidate', { userId: id });
        continue;
      }
      deleted++;
    } catch (error) {
      logger().error('Failed to purge unverified account', { userId: id, error: msg(error) });
      continue;
    }
    // userId null: AuditLog.userId FKs to the user we just deleted.
    try {
      await logAudit({
        userId: null,
        action: 'unverified_account_purged',
        targetType: 'User',
        targetId: id,
      });
    } catch (error) {
      logger().error('Failed to audit unverified account purge', { userId: id, error: msg(error) });
    }
  }
  return deleted;
}

export function startUnverifiedPurge(prisma: PrismaClient): NodeJS.Timeout | null {
  if (process.env.NODE_ENV === 'test') return null;

  const run = () =>
    purgeUnverifiedAccounts(prisma).catch((error) =>
      logger().error('Unverified account purge failed', { error: msg(error) })
    );
  void run();
  return setInterval(run, PURGE_INTERVAL_MS).unref();
}
