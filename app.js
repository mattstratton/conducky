const express = require("express");
const cors = require("cors");
const path = require("path");

// Configuration modules
const { configureSession, configurePassport } = require("./config/session");

// Middleware
const { requestLogger, testAuth } = require("./middleware/auth");

// Routes
const authRoutes = require("./routes/authRoutes");

const app = express();

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Global request logger
app.use(requestLogger);

// Add test-only authentication middleware for tests
if (process.env.NODE_ENV === "test") {
  app.use(testAuth);
}

// CORS middleware (allow frontend dev server)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    credentials: true,
  }),
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
configureSession(app);

// Serve uploads directory as static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Passport.js setup
configurePassport(app);

// ============================================================================
// ROUTES
// ============================================================================

// Authentication routes
app.use("/auth", authRoutes);

// TODO: Add other route modules here as we extract them
// app.use("/events", eventRoutes);
// app.use("/reports", reportRoutes);
// app.use("/admin", adminRoutes);
// app.use("/api", apiRoutes);

module.exports = app; 