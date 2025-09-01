import jwt, { SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface OTPPayload {
  email: string;
  otp: string;
  iat?: number;
  exp?: number;
}

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;

export const generateToken = (
  payload: Omit<JWTPayload, "iat" | "exp">
): string => {
  const options: SignOptions = {
    expiresIn: "7d",
  };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    console.log("verify jwt", error);
    throw new Error("Invalid or expired token");
  }
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateOTPToken = (email: string, otp: string): string => {
  const payload: OTPPayload = { email, otp };
  const options: SignOptions = {
    expiresIn: "5m", // 5 minutes
  };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyOTPToken = (token: string): OTPPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as OTPPayload;
  } catch (error) {
    throw new Error("Invalid or expired OTP token");
  }
};
