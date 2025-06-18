import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import bcrypt from 'bcrypt';
import { PrismaClient, User, SocialProvider } from '@prisma/client';

const prisma = new PrismaClient();

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

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.FRONTEND_BASE_URL || 'http://localhost:4000'}/api/auth/google/callback`,
      scope: ['profile', 'email']
    },
    async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: User | false) => void) => {
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
                accessToken,
                refreshToken,
                profileData: JSON.stringify(profile._json)
              }
            });
          } else {
            // Update existing social account
            await prisma.socialAccount.update({
              where: { id: existingSocialAccount.id },
              data: {
                accessToken,
                refreshToken,
                providerName: profile.displayName,
                profileData: JSON.stringify(profile._json)
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
                  accessToken,
                  refreshToken,
                  profileData: JSON.stringify(profile._json)
                }
              }
            },
            include: { socialAccounts: true }
          });
        }

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, false);
      }
    }
  ));
}

// GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.FRONTEND_BASE_URL || 'http://localhost:4000'}/api/auth/github/callback`,
      scope: ['user:email']
    },
    async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: User | false) => void) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) {
          return done(new Error('No email provided by GitHub'), null);
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
                accessToken,
                refreshToken,
                profileData: JSON.stringify(profile._json)
              }
            });
          } else {
            // Update existing social account
            await prisma.socialAccount.update({
              where: { id: existingSocialAccount.id },
              data: {
                accessToken,
                refreshToken,
                providerName: profile.displayName || profile.username,
                profileData: JSON.stringify(profile._json)
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
                  accessToken,
                  refreshToken,
                  profileData: JSON.stringify(profile._json)
                }
              }
            },
            include: { socialAccounts: true }
          });
        }

        return done(null, user);
      } catch (error) {
        console.error('GitHub OAuth error:', error);
        return done(error, null);
      }
    }
  ));
}

export default passport; 