const app = require("./app");
const { prisma } = require("./config/database");
const { logAudit } = require("./utils/audit");

const PORT = process.env.PORT || 4000;

// Startup check for required environment variables
const requiredEnv = ["DATABASE_URL", "SESSION_SECRET", "FRONTEND_BASE_URL"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(", ")}.\nPlease set them in your .env file.`
  );
}

// Basic health check and setup routes
app.get("/", async (req, res) => {
  // Check if any users exist
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    return res.json({ firstUserNeeded: true });
  }
  res.json({ message: "Backend API is running!" });
});

// Audit test route
app.get("/audit-test", async (req, res) => {
  // Example usage: log a test audit event
  try {
    await logAudit({
      eventId: "902288b2-388a-4292-83b6-4c30e566a413",
      userId: null, // or a real user ID if available
      action: "test_action",
      targetType: "Test",
      targetId: "123",
    });
    res.json({ message: "Audit event logged!" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to log audit event", details: err.message });
  }
});

// Export the app for testing
module.exports = app;

// Only start the server if this file is run directly (not during testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend server listening on port ${PORT}`);
  });
} 