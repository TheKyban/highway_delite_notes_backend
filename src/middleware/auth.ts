import { Request, Response, NextFunction } from "express";
import { verifyToken, JWTPayload } from "../utils/jwt";
import User, { IUser } from "../models/User";

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // First try to get token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // If no token in header, try to get from cookies
    if (!token && req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access token is required",
      });
      return;
    }

    const decoded: JWTPayload = verifyToken(token);

    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    if (!user.isVerified) {
      res.status(401).json({
        success: false,
        message: "Email not verified",
      });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    // Clear the expired cookie
    res.clearCookie("authToken");
    
    let message = "Invalid or expired token";
    if (error.message && error.message.includes("expired")) {
      message = "Token has expired. Please login again.";
    }
    
    res.status(401).json({
      success: false,
      message,
    });
  }
};
