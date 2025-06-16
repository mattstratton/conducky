const { inMemoryStore } = require("../../__mocks__/@prisma/client");
const request = require("supertest");
const app = require("../../index");

// Mock the email service
jest.mock("../../utils/email", () => ({
  emailService: {
    sendPasswordReset: jest.fn().mockResolvedValue({ success: true, messageId: "test-123" }),
  },
}));

const { emailService } = require("../../utils/email");

describe("Password Reset Integration Tests", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Reset in-memory store
    inMemoryStore.users = [
      { 
        id: "1", 
        email: "test@example.com", 
        name: "Test User",
        passwordHash: "$2b$10$hashedpassword" 
      }
    ];
    inMemoryStore.passwordResetTokens = [];
  });

  describe("POST /auth/forgot-password", () => {
    it("should return success message for existing user", async () => {
      const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "test@example.com" });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("If an account with that email exists, we've sent a password reset link.");
      expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
        "test@example.com",
        "Test User",
        expect.any(String)
      );
    });

    it("should return same success message for non-existing user", async () => {
      const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "nonexistent@example.com" });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("If an account with that email exists, we've sent a password reset link.");
      expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it("should fail with missing email", async () => {
      const res = await request(app)
        .post("/auth/forgot-password")
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Email is required.");
    });

    it("should fail with invalid email format", async () => {
      const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "invalid-email" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Please enter a valid email address.");
    });

    it("should handle email service errors gracefully", async () => {
      emailService.sendPasswordReset.mockRejectedValueOnce(new Error("Email service down"));

      const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "test@example.com" });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("If an account with that email exists, we've sent a password reset link.");
    });
  });

  describe("POST /auth/reset-password", () => {
    let validToken;

    beforeEach(() => {
      validToken = "valid-reset-token-123";
      inMemoryStore.passwordResetTokens = [
        {
          id: "token1",
          userId: "1",
          token: validToken,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
          used: false,
          createdAt: new Date(),
          user: { id: "1", email: "test@example.com", name: "Test User" }
        }
      ];
    });

    it("should reset password with valid token and strong password", async () => {
      const res = await request(app)
        .post("/auth/reset-password")
        .send({ 
          token: validToken,
          password: "NewStrongPass123!"
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Password has been reset successfully. You can now login with your new password.");
    });

    it("should fail with weak password", async () => {
      const res = await request(app)
        .post("/auth/reset-password")
        .send({ 
          token: validToken,
          password: "weak"
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Password must meet all security requirements");
    });

    it("should fail with missing token", async () => {
      const res = await request(app)
        .post("/auth/reset-password")
        .send({ password: "NewStrongPass123!" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Token and password are required.");
    });

    it("should fail with missing password", async () => {
      const res = await request(app)
        .post("/auth/reset-password")
        .send({ token: validToken });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Token and password are required.");
    });

    it("should fail with invalid token", async () => {
      const res = await request(app)
        .post("/auth/reset-password")
        .send({ 
          token: "invalid-token",
          password: "NewStrongPass123!"
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Invalid or expired reset token.");
    });

    it("should fail with expired token", async () => {
      const expiredToken = "expired-token-123";
      inMemoryStore.passwordResetTokens = [
        {
          id: "token2",
          userId: "1",
          token: expiredToken,
          expiresAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          used: false,
          createdAt: new Date(),
          user: { id: "1", email: "test@example.com", name: "Test User" }
        }
      ];

      const res = await request(app)
        .post("/auth/reset-password")
        .send({ 
          token: expiredToken,
          password: "NewStrongPass123!"
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Reset token has expired.");
    });

    it("should fail with used token", async () => {
      const usedToken = "used-token-123";
      inMemoryStore.passwordResetTokens = [
        {
          id: "token3",
          userId: "1",
          token: usedToken,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          used: true,
          createdAt: new Date(),
          user: { id: "1", email: "test@example.com", name: "Test User" }
        }
      ];

      const res = await request(app)
        .post("/auth/reset-password")
        .send({ 
          token: usedToken,
          password: "NewStrongPass123!"
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Reset token has already been used.");
    });
  });

  describe("Password Strength Validation", () => {
    it("should accept passwords with all requirements", async () => {
      const strongPasswords = [
        "Password123!",
        "MySecure@Pass456",
        "ComplexPass789#",
        "Str0ng&P@ssw0rd!"
      ];

      for (let i = 0; i < strongPasswords.length; i++) {
        const password = strongPasswords[i];
        const uniqueToken = `valid-token-${i}`;
        
        // Add a fresh token for each test
        inMemoryStore.passwordResetTokens.push({
          id: `token-${i}`,
          userId: "1",
          token: uniqueToken,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          used: false,
          createdAt: new Date(),
          user: { id: "1", email: "test@example.com", name: "Test User" }
        });
        
        const res = await request(app)
          .post("/auth/reset-password")
          .send({ 
            token: uniqueToken,
            password
          });

        expect(res.statusCode).toBe(200);
      }
    });

    it("should reject passwords missing requirements", async () => {
      const weakPasswords = [
        "password",        // no uppercase, no number, no special
        "PASSWORD",        // no lowercase, no number, no special
        "Password",        // no number, no special
        "Password123",     // no special character
        "Password!",       // no number
        "password123!",    // no uppercase
        "PASS123!",        // too short
        "Pass123"          // no special character
      ];

      for (let i = 0; i < weakPasswords.length; i++) {
        const password = weakPasswords[i];
        const uniqueToken = `weak-token-${i}`;
        
        // Add a fresh token for each test
        inMemoryStore.passwordResetTokens.push({
          id: `weak-token-${i}`,
          userId: "1",
          token: uniqueToken,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          used: false,
          createdAt: new Date(),
          user: { id: "1", email: "test@example.com", name: "Test User" }
        });
        
        const res = await request(app)
          .post("/auth/reset-password")
          .send({ 
            token: uniqueToken,
            password
          });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain("Password must meet all security requirements");
      }
    });
  });

  describe("GET /auth/validate-reset-token", () => {
    let validToken;

    beforeEach(() => {
      validToken = "valid-token-for-validation";
      inMemoryStore.passwordResetTokens = [
        {
          id: "validation-token",
          userId: "1",
          token: validToken,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
          used: false,
          createdAt: new Date(),
          user: { id: "1", email: "test@example.com", name: "Test User" }
        }
      ];
    });

    it("should validate a valid token", async () => {
      const res = await request(app)
        .get(`/auth/validate-reset-token?token=${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.email).toBe("test@example.com");
      expect(res.body.expiresAt).toBeDefined();
    });

    it("should reject invalid token", async () => {
      const res = await request(app)
        .get("/auth/validate-reset-token?token=invalid-token");

      expect(res.statusCode).toBe(400);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toBe("Invalid reset token.");
    });

    it("should reject used token", async () => {
      const usedToken = "used-validation-token";
      inMemoryStore.passwordResetTokens = [
        {
          id: "used-validation-token",
          userId: "1",
          token: usedToken,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          used: true,
          createdAt: new Date(),
          user: { id: "1", email: "test@example.com", name: "Test User" }
        }
      ];

      const res = await request(app)
        .get(`/auth/validate-reset-token?token=${usedToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toBe("Reset token has already been used.");
    });

    it("should reject expired token", async () => {
      const expiredToken = "expired-validation-token";
      inMemoryStore.passwordResetTokens = [
        {
          id: "expired-validation-token",
          userId: "1",
          token: expiredToken,
          expiresAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          used: false,
          createdAt: new Date(),
          user: { id: "1", email: "test@example.com", name: "Test User" }
        }
      ];

      const res = await request(app)
        .get(`/auth/validate-reset-token?token=${expiredToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toBe("Reset token has expired.");
    });

    it("should require token parameter", async () => {
      const res = await request(app)
        .get("/auth/validate-reset-token");

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Token is required.");
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(() => {
      // Clear rate limiting state between tests
      // Note: In a real implementation, you'd want to clear the rate limiting store
      inMemoryStore.users = [
        { id: "1", email: "ratelimit@example.com", name: "Rate Test", passwordHash: "hashedpassword" }
      ];
    });

    it("should allow first 3 attempts", async () => {
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post("/auth/forgot-password")
          .send({ email: "ratelimit@example.com" });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain("we've sent a password reset link");
      }
    });

    it("should block 4th attempt with rate limit error", async () => {
      // Make 3 successful attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post("/auth/forgot-password")
          .send({ email: "ratelimit@example.com" });
      }

      // 4th attempt should be blocked
      const res = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "ratelimit@example.com" });

      expect(res.statusCode).toBe(429);
      expect(res.body.error).toContain("Too many password reset attempts");
      expect(res.body.error).toContain("minutes");
    });
  });
}); 