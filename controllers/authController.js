const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { prisma } = require("../config/database");
const { validatePassword } = require("../middleware/auth");
const { emailService } = require("../utils/email");

// Rate limiting for password reset attempts
const resetAttempts = new Map(); // In production, use Redis or database
const RESET_RATE_LIMIT = 3; // Max attempts per window
const RESET_RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkResetRateLimit(email) {
  const now = Date.now();
  const attempts = resetAttempts.get(email) || { count: 0, firstAttempt: now };
  
  // Reset window if enough time has passed
  if (now - attempts.firstAttempt > RESET_RATE_WINDOW) {
    attempts.count = 0;
    attempts.firstAttempt = now;
  }
  
  if (attempts.count >= RESET_RATE_LIMIT) {
    return {
      allowed: false,
      timeRemaining: RESET_RATE_WINDOW - (now - attempts.firstAttempt)
    };
  }
  
  // Increment attempt count
  attempts.count++;
  resetAttempts.set(email, attempts);
  
  return { allowed: true };
}

// Check email availability
async function checkEmail(req, res) {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: "Email parameter is required." });
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    res.json({ available: !existing });
  } catch (err) {
    res.status(500).json({ error: "Failed to check email availability.", details: err.message });
  }
}

// Register route
async function register(req, res) {
  const { email, password, name } = req.body;
  
  // Enhanced validation
  if (!email || !password || !name) {
    return res.status(400).json({ 
      error: "Name, email, and password are required." 
    });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      error: "Please enter a valid email address." 
    });
  }
  
  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ 
      error: "Password must meet all security requirements: at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character." 
    });
  }
  
  // Validate name length
  if (name.trim().length < 1) {
    return res.status(400).json({ 
      error: "Name is required." 
    });
  }
  
  try {
    const existing = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    if (existing) {
      return res.status(409).json({ error: "Email already registered." });
    }
    
    const userCount = await prisma.user.count();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        email: email.toLowerCase(), 
        passwordHash, 
        name: name.trim() 
      },
    });
    
    // If this is the first user, assign SuperAdmin role globally (eventId: null)
    let madeSuperAdmin = false;
    if (userCount === 0) {
      let superAdminRole = await prisma.role.findUnique({
        where: { name: "SuperAdmin" },
      });
      if (!superAdminRole) {
        superAdminRole = await prisma.role.create({
          data: { name: "SuperAdmin" },
        });
      }
      await prisma.userEventRole.create({
        data: {
          userId: user.id,
          eventId: null, // Global role assignment
          roleId: superAdminRole.id,
        },
      });
      madeSuperAdmin = true;
    }
    
    // Respond with success
    return res.json({
      message: "Registration successful!",
      user: { id: user.id, email: user.email, name: user.name },
      madeSuperAdmin,
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res
      .status(500)
      .json({ error: "Registration failed.", details: err.message });
  }
}

// Login handler (used with passport)
function login(req, res) {
  res.json({
    message: "Logged in!",
    user: { id: req.user.id, email: req.user.email, name: req.user.name },
  });
}

// Logout route
function logout(req, res) {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "Logout failed." });
    res.json({ message: "Logged out!" });
  });
}

// Session check route
async function getSession(req, res) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    // Fetch user roles
    const userEventRoles = await prisma.userEventRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    // Flatten roles to a list of role names
    const roles = userEventRoles.map((uer) => uer.role.name);
    // Check for avatar
    const avatar = await prisma.userAvatar.findUnique({
      where: { userId: req.user.id },
    });
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        roles,
        avatarUrl: avatar ? `/users/${req.user.id}/avatar` : null,
      },
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
}

// Forgot password - send reset email
async function forgotPassword(req, res) {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  
  // Check rate limiting
  const rateCheck = checkResetRateLimit(email.toLowerCase());
  if (!rateCheck.allowed) {
    const minutesRemaining = Math.ceil(rateCheck.timeRemaining / (60 * 1000));
    return res.status(429).json({ 
      error: `Too many password reset attempts. Please try again in ${minutesRemaining} minutes.` 
    });
  }
  
  try {
    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    
    // Always return success to prevent email enumeration
    // but only send email if user exists
    if (user) {
      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      
      // Clean up old tokens for this user and expired tokens system-wide
      await prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { userId: user.id },
            { expiresAt: { lt: new Date() } }
          ]
        }
      });
      
      // Create new reset token
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt
        }
      });
      
      // Send password reset email
      try {
        await emailService.sendPasswordReset(user.email, user.name, resetToken);
        console.log(`[Auth] Password reset email sent to ${user.email}`);
      } catch (emailError) {
        console.error('[Auth] Failed to send reset email:', emailError);
        // Continue - don't expose email sending errors to user
      }
    }
    
    // Always return the same response to prevent email enumeration
    res.json({ 
      message: "If an account with that email exists, we've sent a password reset link." 
    });
  } catch (err) {
    console.error('[Auth] Forgot password error:', err);
    res.status(500).json({ error: "Failed to process password reset request." });
  }
}

// Reset password with token
async function resetPassword(req, res) {
  const { token, password } = req.body;
  
  if (!token || !password) {
    return res.status(400).json({ error: "Token and password are required." });
  }
  
  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ 
      error: "Password must meet all security requirements: at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character." 
    });
  }
  
  try {
    // Find valid token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });
    
    if (!resetToken) {
      return res.status(400).json({ error: "Invalid or expired reset token." });
    }
    
    if (resetToken.used) {
      return res.status(400).json({ error: "Reset token has already been used." });
    }
    
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({ error: "Reset token has expired." });
    }
    
    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Update user password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true }
      })
    ]);
    
    console.log(`[Auth] Password reset successful for user ${resetToken.user.email}`);
    
    res.json({ message: "Password has been reset successfully. You can now login with your new password." });
  } catch (err) {
    console.error('[Auth] Reset password error:', err);
    res.status(500).json({ error: "Failed to reset password." });
  }
}

// Validate reset token
async function validateResetToken(req, res) {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).json({ error: "Token is required." });
  }
  
  try {
    // Find the token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { email: true } } }
    });
    
    if (!resetToken) {
      return res.status(400).json({ 
        valid: false, 
        error: "Invalid reset token." 
      });
    }
    
    if (resetToken.used) {
      return res.status(400).json({ 
        valid: false, 
        error: "Reset token has already been used." 
      });
    }
    
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({ 
        valid: false, 
        error: "Reset token has expired." 
      });
    }
    
    // Token is valid
    res.json({ 
      valid: true, 
      email: resetToken.user.email,
      expiresAt: resetToken.expiresAt
    });
  } catch (err) {
    console.error('[Auth] Validate reset token error:', err);
    res.status(500).json({ error: "Failed to validate reset token." });
  }
}

module.exports = {
  checkEmail,
  register,
  login,
  logout,
  getSession,
  forgotPassword,
  resetPassword,
  validateResetToken
}; 