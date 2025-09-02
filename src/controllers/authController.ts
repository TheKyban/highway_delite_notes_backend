import { Request, Response } from "express";
import User from "../models/User";
import {
  generateToken,
  generateOTP,
  generateOTPToken,
  verifyOTPToken,
} from "../utils/jwt";
import emailService from "../services/emailService";

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, dob } = req.body;

    if (!name || !email || !dob) {
      res.status(400).json({
        success: false,
        message: "Name, email and date of birth are required",
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
      return;
    }

    // Create new user
    if (!existingUser) {
      const user = new User({
        name,
        email,
        dob,
        isVerified: false,
      });

      await user.save();
    }

    // Generate OTP
    const otp = generateOTP();

    if (process.env.NODE_ENV === "development") {
      console.log("Generated OTP:", otp);
    }

    // Generate OTP token and set as httpOnly cookie
    const otpToken = generateOTPToken(email, otp);

    // Send OTP email
    await emailService.sendOTP(email, otp, name);

    res
      .cookie("otpToken", otpToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 5 * 60 * 1000, // 5 minutes
        path: "/",
      })
      .status(201)
      .json({
        success: true,
        message:
          "User created successfully. Please verify your email with the OTP sent.",
      });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    const otpToken = req.cookies.otpToken;

    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
      return;
    }

    if (!otpToken) {
      res.status(400).json({
        success: false,
        message: "No OTP token found. Please request a new OTP.",
      });
      return;
    }

    // Verify and decode OTP token
    let otpPayload;
    try {
      otpPayload = verifyOTPToken(otpToken);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
      return;
    }

    // Verify email matches
    if (otpPayload.email !== email) {
      res.status(400).json({
        success: false,
        message: "Invalid OTP request.",
      });
      return;
    }

    // Verify OTP matches
    if (otpPayload.otp !== otp) {
      res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Check if this is a signup verification (user not yet verified) or login verification (user already verified)
    const isSignupVerification = !user.isVerified;

    if (isSignupVerification) {
      // First-time verification for signup
      user.isVerified = true;
      await user.save();

      // Send welcome email for new users
      await emailService.sendWelcomeEmail(email, user.name);
    }

    // Generate JWT token for both signup and login verification
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
    });

    // Clear OTP cookie and set auth token in header
    res
      .clearCookie("otpToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
      })
      .cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
        domain: process.env.NODE_ENV === "production" ? undefined : undefined,
      })
      .header("Authorization", `Bearer ${token}`)
      .status(200)
      .json({
        success: true,
        message: isSignupVerification
          ? "Email verified successfully. Welcome!"
          : "Login successful",
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
          },
        },
      });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const resendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
      return;
    }

    // Generate new OTP
    const otp = generateOTP();

    if (process.env.NODE_ENV === "development") {
      console.log("Resent OTP:", otp);
    }

    // Generate new OTP token and set as httpOnly cookie
    const otpToken = generateOTPToken(email, otp);

    // Send OTP email
    await emailService.sendOTP(email, otp, user.name);

    res
      .cookie("otpToken", otpToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 5 * 60 * 1000, // 5 minutes
        path: "/",
      })
      .status(200)
      .json({
        success: true,
        message: "OTP sent successfully",
      });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "No account found with this email. Please sign up first.",
      });
      return;
    }

    // Check if user is verified
    if (!user.isVerified) {
      res.status(401).json({
        success: false,
        message: "Please verify your email before logging in",
      });
      return;
    }

    // Generate OTP for login
    const otp = generateOTP();

    if (process.env.NODE_ENV === "development") {
      console.log("Login OTP:", otp);
    }

    // Generate OTP token and set as httpOnly cookie
    const otpToken = generateOTPToken(email, otp);

    // Send OTP email
    await emailService.sendOTP(email, otp, user.name);

    res
      .cookie("otpToken", otpToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 5 * 60 * 1000, // 5 minutes
        path: "/",
      })
      .status(200)
      .json({
        success: true,
        message: "OTP sent to your email. Please verify to login.",
      });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear auth token cookie with proper options for cross-origin
    res
      .clearCookie("authToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
      })
      .clearCookie("otpToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
      })
      .status(200)
      .json({
        success: true,
        message: "Logged out successfully",
      });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = (req as any).user;

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
