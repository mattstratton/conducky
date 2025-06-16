const express = require("express");
const passport = require("passport");
const authController = require("../controllers/authController");

const router = express.Router();

// Check email availability
router.get("/check-email", authController.checkEmail);

// Register route
router.post("/register", authController.register);

// Login route
router.post("/login", passport.authenticate("local"), authController.login);

// Logout route
router.post("/logout", authController.logout);

// Session check route
router.get("/session", authController.getSession);

// Forgot password - send reset email
router.post("/forgot-password", authController.forgotPassword);

// Reset password with token
router.post("/reset-password", authController.resetPassword);

// Validate reset token
router.get("/validate-reset-token", authController.validateResetToken);

module.exports = router; 