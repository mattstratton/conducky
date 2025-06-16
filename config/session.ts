import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { Express } from "express";
import { prisma } from "./database";

// Session middleware configuration
export function configureSession(app: Express): void {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "changeme",
      resave: false,
      saveUninitialized: false,
    }),
  );
}

// Passport.js setup
export function configurePassport(app: Express): void {
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email: string, password: string, done) => {
        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.passwordHash) {
            return done(null, false, { message: "Incorrect email or password." });
          }
          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) {
            return done(null, false, { message: "Incorrect email or password." });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
} 