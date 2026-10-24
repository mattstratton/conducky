import type { PrismaClient, SocialProvider, User } from '../generated/prisma/client';
import { logAudit } from '../utils/audit';
import logger from '../config/logger';

type ProviderEmail = { value: string; verified?: boolean; primary?: boolean };

/**
 * The address the provider vouches for, or null. Entries without `verified === true` are never trusted.
 * Google: [{ value, verified }] (OpenID userinfo). GitHub (allRawEmails): every /user/emails entry.
 */
export function pickVerifiedEmail(emails?: ProviderEmail[]): string | null {
  const verified = (emails ?? []).filter((e) => e?.verified === true && typeof e.value === 'string' && e.value.trim());
  const chosen = verified.find((e) => e.primary) ?? verified[0];
  return chosen ? chosen.value.trim().toLowerCase() : null;
}

export interface OAuthInput {
  provider: SocialProvider;
  providerId: string;
  email: string; // already provider-verified, lowercased
  displayName?: string;
  profileData: string;
}

const FRIENDLY = 'Sign-in could not be completed, please try again.';

// Thrown inside the transaction (rolling it back) when re-resolving can succeed: the account's
// email changed under us, or a concurrent first sign-in created the user row.
class Retry extends Error {}
// Not retryable (e.g. this provider id is already linked to another user).
export class SignInFailed extends Error {
  constructor() {
    super(FRIENDLY);
  }
}

const codeOf = (err: unknown) => (err as { code?: string } | null)?.code;

/**
 * Finds or creates the user for a provider-verified email. An existing account that never proved
 * its address is verified by the provider, and when it is gated (new signup, possibly the
 * attacker's) its password is cleared so a squatter cannot keep a way in.
 * Old ungated accounts keep their password (accepted residual risk).
 */
export async function resolveOAuthUser(prisma: PrismaClient, input: OAuthInput): Promise<User> {
  for (let attempt = 0; ; attempt++) {
    try {
      const { user, cleared, wasUnverified } = await link(prisma, input);
      if (wasUnverified) {
        // Committed already: a failed audit write must not fail the sign-in.
        try {
          // AuditLog has no metadata column, so a cleared password gets its own row.
          await logAudit({ action: 'oauth_linked_unverified_account', targetType: 'User', targetId: user.id, userId: user.id });
          if (cleared) {
            await logAudit({ action: 'oauth_password_cleared', targetType: 'User', targetId: user.id, userId: user.id });
          }
        } catch (auditErr) {
          logger().error('Failed to write OAuth link audit:', auditErr instanceof Error ? auditErr.message : 'unknown error');
        }
      }
      return user;
    } catch (err: unknown) {
      if (err instanceof Retry) {
        if (attempt === 0) continue;
        throw new SignInFailed();
      }
      throw err;
    }
  }
}

async function link(prisma: PrismaClient, input: OAuthInput) {
  const { provider, providerId, email, displayName, profileData } = input;
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email } });
    let user: User;
    let cleared = false;
    const wasUnverified = !!existing && !existing.emailVerifiedAt;

    if (!existing) {
      try {
        user = await tx.user.create({
          data: { email, name: displayName, passwordHash: null, emailVerifiedAt: new Date() },
        });
      } catch (err) {
        if (codeOf(err) === 'P2002') throw new Retry(); // concurrent first sign-in; re-resolve into that row
        throw err;
      }
    } else if (existing.emailVerifiedAt) {
      user = existing;
    } else {
      cleared = !!existing.emailVerificationRequired;
      // Conditional on the address the provider vouched for (and the state we read): count must be 1.
      const { count } = await tx.user.updateMany({
        where: {
          id: existing.id,
          email,
          emailVerifiedAt: null,
          emailVerificationRequired: existing.emailVerificationRequired,
        },
        data: cleared ? { emailVerifiedAt: new Date(), passwordHash: null } : { emailVerifiedAt: new Date() },
      });
      if (count !== 1) throw new Retry();
      user = (await tx.user.findUnique({ where: { id: existing.id } })) as User;
    }

    const social = await tx.socialAccount.findFirst({ where: { userId: user.id, provider } });
    if (social) {
      await tx.socialAccount.update({
        where: { id: social.id },
        data: { providerName: displayName, profileData },
      });
    } else {
      try {
        await tx.socialAccount.create({
          data: { userId: user.id, provider, providerId, providerEmail: email, providerName: displayName, profileData },
        });
      } catch (err) {
        // (provider, providerId) already belongs to another user: retrying cannot help.
        if (codeOf(err) === 'P2002') throw new SignInFailed();
        throw err;
      }
    }
    return { user, cleared, wasUnverified };
  });
}

type VerifyDone = (error: unknown, user?: User | false, info?: { message: string }) => void;

/**
 * Passport verify callback shared by the Google and GitHub strategies. Anything the person can act
 * on (unverified provider email, SignInFailed) is done(null, false, ...) so failureRedirect sends
 * them to the login page; passport turns done(err) into a raw 500 on the API origin.
 */
export async function verifyOAuthProfile(
  prisma: PrismaClient,
  label: 'Google' | 'GitHub',
  profile: { emails?: ProviderEmail[] },
  build: (email: string) => OAuthInput,
  done: VerifyDone,
): Promise<void> {
  try {
    const email = pickVerifiedEmail(profile.emails);
    if (!email) {
      return done(null, false, {
        message: profile.emails?.length
          ? `Your ${label} email address is not verified by ${label}.`
          : `No email provided by ${label}`,
      });
    }
    return done(null, await resolveOAuthUser(prisma, build(email)));
  } catch (error) {
    if (error instanceof SignInFailed) {
      logger().warn(`${label} OAuth sign-in rejected: ${error.message}`);
      return done(null, false, { message: error.message });
    }
    logger().error(`${label} OAuth error:`, error);
    return done(error, false);
  }
}
