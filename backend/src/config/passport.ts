import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import bcrypt from 'bcrypt';
import { User, SocialProvider } from '../generated/prisma/client';
import { createPrismaClient } from './prisma-client';
import logger from '../config/logger';
import { isGated } from '../services/email-verification.service';
import { emailService } from '../utils/email';

const prisma = createPrismaClient();

// Function to get OAuth settings from database
async function getOAuthSettings() {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['googleOAuth', 'githubOAuth']
        }
      }
    });

    const oauthSettings = {
      google: { clientId: '', clientSecret: '', enabled: false },
      github: { clientId: '', clientSecret: '', enabled: false }
    };

    settings.forEach(setting => {
      try {
        const parsed = JSON.parse(setting.value);
        if (setting.key === 'googleOAuth') {
          oauthSettings.google = parsed;
        } else if (setting.key === 'githubOAuth') {
          oauthSettings.github = parsed;
        }
      } catch (parseError) {
        logger().error(`Error parsing ${setting.key} settings:`, parseError);
      }
    });

    return oauthSettings;
  } catch (error) {
    logger().error('Error fetching OAuth settings from database:', error);
    return {
      google: { clientId: '', clientSecret: '', enabled: false },
      github: { clientId: '', clientSecret: '', enabled: false }
    };
  }
}

// Serialize user for session
passport.serializeUser((user: any, done: (err: any, id?: any) => void) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done: (err: any, user?: User | null) => void) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Local Strategy (existing email/password login)
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email: string, password: string, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return done(null, false, { message: 'Invalid email or password.' });
      }

      if (!user.passwordHash) {
        return done(null, false, { message: 'Please sign in with your social account.' });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return done(null, false, { message: 'Invalid email or password.' });
      }

      // Only after the password is proven correct, so this reveals nothing to a guesser.
      // isConfigured() is evaluated last so ordinary sign-ins never touch the email service.
      if (isGated(user) && await emailService.isConfigured()) {
        return done(null, false, {
          message: 'Please verify your email address to sign in.',
          code: 'EMAIL_NOT_VERIFIED'
        } as { message: string; code: string });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Function to initialize OAuth strategies based on database settings
async function initializeOAuthStrategies() {
  const oauthSettings = await getOAuthSettings();

  // Google OAuth Strategy
  if (oauthSettings.google.enabled && oauthSettings.google.clientId && oauthSettings.google.clientSecret) {
    passport.use(new GoogleStrategy(
      {
        clientID: oauthSettings.google.clientId,
        clientSecret: oauthSettings.google.clientSecret,
        callbackURL: `${process.env.BACKEND_BASE_URL || 'http://localhost:4000'}/api/auth/google/callback`,
        scope: ['profile', 'email'],
        passReqToCallback: true // Enable passing request to callback for state access
      },
      async (req: any, accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: User | false) => void) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error('No email provided by Google'), false);
          }

          // Check if user already exists with this email
          let user = await prisma.user.findUnique({
            where: { email },
            include: { socialAccounts: true }
          });

          if (user) {
            // User exists, check if they have this social account linked
            const existingSocialAccount = user.socialAccounts.find(
              account => account.provider === SocialProvider.google
            );

            if (!existingSocialAccount) {
              // Link this Google account to existing user
              await prisma.socialAccount.create({
                data: {
                  userId: user.id,
                  provider: SocialProvider.google,
                  providerId: profile.id,
                  providerEmail: email,
                  providerName: profile.displayName,
                  // Note: Not storing access/refresh tokens for security
                  profileData: JSON.stringify({
                    id: profile.id,
                    displayName: profile.displayName,
                    email: email
                  })
                }
              });
            } else {
              // Update existing social account
              await prisma.socialAccount.update({
                where: { id: existingSocialAccount.id },
                data: {
                  providerName: profile.displayName,
                  profileData: JSON.stringify({
                    id: profile.id,
                    displayName: profile.displayName,
                    email: email
                  })
                }
              });
            }
          } else {
            // Create new user with Google account
            user = await prisma.user.create({
              data: {
                email,
                name: profile.displayName,
                passwordHash: null, // No password for social login
                socialAccounts: {
                  create: {
                    provider: SocialProvider.google,
                    providerId: profile.id,
                    providerEmail: email,
                    providerName: profile.displayName,
                    // Note: Not storing access/refresh tokens for security
                    profileData: JSON.stringify({
                      id: profile.id,
                      displayName: profile.displayName,
                      email: email
                    })
                  }
                }
              },
              include: { socialAccounts: true }
            });
          }

          return done(null, user);
        } catch (error) {
          logger().error('Google OAuth error:', error);
          return done(error, false);
        }
      }
    ));
    logger().info('Google OAuth strategy initialized from database settings');
  } else {
    logger().info('Google OAuth disabled or not configured');
  }

  // GitHub OAuth Strategy
  if (oauthSettings.github.enabled && oauthSettings.github.clientId && oauthSettings.github.clientSecret) {
    passport.use(new GitHubStrategy(
      {
        clientID: oauthSettings.github.clientId,
        clientSecret: oauthSettings.github.clientSecret,
        callbackURL: `${process.env.BACKEND_BASE_URL || 'http://localhost:4000'}/api/auth/github/callback`,
        scope: ['user:email'],
        passReqToCallback: true // Enable passing request to callback for state access
      },
      async (req: any, accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: User | false) => void) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error('No email provided by GitHub'), false);
          }

          // Check if user already exists with this email
          let user = await prisma.user.findUnique({
            where: { email },
            include: { socialAccounts: true }
          });

          if (user) {
            // User exists, check if they have this social account linked
            const existingSocialAccount = user.socialAccounts.find(
              account => account.provider === SocialProvider.github
            );

            if (!existingSocialAccount) {
              // Link this GitHub account to existing user
              await prisma.socialAccount.create({
                data: {
                  userId: user.id,
                  provider: SocialProvider.github,
                  providerId: profile.id,
                  providerEmail: email,
                  providerName: profile.displayName || profile.username,
                  // Note: Not storing access/refresh tokens for security
                  profileData: JSON.stringify({
                    id: profile.id,
                    username: profile.username,
                    displayName: profile.displayName,
                    email: email
                  })
                }
              });
            } else {
              // Update existing social account
              await prisma.socialAccount.update({
                where: { id: existingSocialAccount.id },
                data: {
                  providerName: profile.displayName || profile.username,
                  profileData: JSON.stringify({
                    id: profile.id,
                    username: profile.username,
                    displayName: profile.displayName,
                    email: email
                  })
                }
              });
            }
          } else {
            // Create new user with GitHub account
            user = await prisma.user.create({
              data: {
                email,
                name: profile.displayName || profile.username,
                passwordHash: null, // No password for social login
                socialAccounts: {
                  create: {
                    provider: SocialProvider.github,
                    providerId: profile.id,
                    providerEmail: email,
                    providerName: profile.displayName || profile.username,
                    // Note: Not storing access/refresh tokens for security
                    profileData: JSON.stringify({
                      id: profile.id,
                      username: profile.username,
                      displayName: profile.displayName,
                      email: email
                    })
                  }
                }
              },
              include: { socialAccounts: true }
            });
          }

          return done(null, user);
        } catch (error) {
          logger().error('GitHub OAuth error:', error);
          return done(error, false);
        }
      }
    ));
    logger().info('GitHub OAuth strategy initialized from database settings');
  } else {
    logger().info('GitHub OAuth disabled or not configured');
  }
}

// Initialize OAuth strategies on startup
initializeOAuthStrategies().catch(error => {
  logger().error('Error initializing OAuth strategies:', error);
});

// Export a function to reinitialize strategies when settings change
export const reinitializeOAuthStrategies = initializeOAuthStrategies;

export default passport; 