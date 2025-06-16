// Global request logger
function requestLogger(req, res, next) {
  console.log("[GLOBAL] Incoming request:", req.method, req.url);
  next();
}

// Test-only authentication middleware for tests
function testAuth(req, res, next) {
  if (process.env.NODE_ENV !== "test") {
    return next();
  }

  // Allow disabling authentication for specific tests
  const disableAuth = req.headers["x-test-disable-auth"];
  if (disableAuth === "true") {
    req.isAuthenticated = () => false;
    req.user = null;
    next();
    return;
  }
  
  // Allow setting specific user via header
  const testUserId = req.headers["x-test-user-id"];
  if (testUserId) {
    req.isAuthenticated = () => true;
    req.user = {
      id: testUserId,
      email: `${testUserId}@example.com`,
      name: `User${testUserId}`,
    };
  } else {
    // Default authenticated user
    req.isAuthenticated = () => true;
    req.user = { id: "1", email: "admin@example.com", name: "Admin" };
  }
  next();
}

// Helper function to validate password strength
function validatePassword(password) {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
  
  const score = Object.values(requirements).filter(Boolean).length;
  const isValid = score === 5; // All requirements must be met
  
  return { isValid, requirements, score };
}

module.exports = { requestLogger, testAuth, validatePassword }; 