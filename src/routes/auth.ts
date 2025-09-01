import { Router } from "express";
import {
  signup,
  verifyOTP,
  resendOTP,
  login,
  logout,
  getProfile,
} from "../controllers/authController";
import {
  googleAuth,
  googleCallback,
} from "../controllers/googleAuthController";
import {
  validateSignup,
  validateLogin,
  validateOTP,
} from "../middleware/validation";
import { authenticate } from "../middleware/auth";

const router = Router();

// Email/Password Authentication
router.post("/signup", validateSignup, signup);
router.post("/verify-otp", validateOTP, verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", validateLogin, login);

// Google OAuth
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);

// Protected routes
router.get("/profile", authenticate, getProfile);
router.post("/logout", logout);

export default router;
