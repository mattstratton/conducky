const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const { prisma } = require("./database");

// Session middleware configuration
function configureSession(app) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "changeme",
      resave: false,
      saveUninitialized: false,
    }),
  );
}

// Passport.js setup
function configurePassport(app) {
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
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

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}

module.exports = { configureSession, configurePassport }; 