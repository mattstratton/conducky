import type { PrismaClient, SocialProvider, User } from '../generated/prisma/client';
import { logAudit } from '../utils/audit';

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

// Thrown inside the transaction (rolling it back) when the account's email changed under us.
class AddressChanged extends Error {}

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
        // AuditLog has no metadata column, so a cleared password gets its own row.
        await logAudit({ action: 'oauth_linked_unverified_account', targetType: 'User', targetId: user.id, userId: user.id });
        if (cleared) {
          await logAudit({ action: 'oauth_password_cleared', targetType: 'User', targetId: user.id, userId: user.id });
        }
      }
      return user;
    } catch (err: any) {
      // AddressChanged: email moved under us. P2002: concurrent first sign-in created the row. Re-resolve once.
      if (attempt === 0 && (err instanceof AddressChanged || err?.code === 'P2002')) continue;
      if (err instanceof AddressChanged) throw new Error('Sign-in could not be completed, please try again.');
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
      user = await tx.user.create({
        data: { email, name: displayName, passwordHash: null, emailVerifiedAt: new Date() },
      });
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
      if (count !== 1) throw new AddressChanged();
      user = (await tx.user.findUnique({ where: { id: existing.id } })) as User;
    }

    const social = await tx.socialAccount.findFirst({ where: { userId: user.id, provider } });
    if (social) {
      await tx.socialAccount.update({
        where: { id: social.id },
        data: { providerName: displayName, profileData },
      });
    } else {
      await tx.socialAccount.create({
        data: { userId: user.id, provider, providerId, providerEmail: email, providerName: displayName, profileData },
      });
    }
    return { user, cleared, wasUnverified };
  });
}
