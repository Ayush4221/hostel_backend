import nodemailer from "nodemailer";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { UserDAO } from "../dao/UserDAO.js";
import { getRedis } from "../db/redis.js";

const userDAO = new UserDAO();
const RESET_TTL_SEC = 3600; // 1 hour

function redisKey(token: string): string {
  return `password_reset:${token}`;
}

/** Generate reset token, store in Redis, return token and user. */
export const generateResetToken = async (email: string) => {
  const user = await userDAO.findByEmail(email);
  if (!user) {
    throw new Error("User not found");
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const redis = getRedis();
  if (!redis) {
    throw new Error("Redis not configured; cannot store reset token.");
  }
  await redis.setex(redisKey(resetToken), RESET_TTL_SEC, user.id);

  return { resetToken, user };
};

/** Send reset password email (uses generateResetToken). */
export const sendResetPasswordEmail = async (email: string) => {
  const { resetToken, user } = await generateResetToken(email);
  const resetLink = `${process.env.FRONTEND_LINK}/reset-password?token=${resetToken}`;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.ETHEREAL_USER,
      pass: process.env.ETHEREAL_PASSWORD,
    },
  });

  const mailOptions = {
    to: email,
    from: "noreply@localhost",
    subject: "Password Reset Request",
    html: `<p>You requested a password reset. Click <a href="${resetLink}">here</a> to reset your password.</p>`,
  };

  await transporter.sendMail(mailOptions);
};

/** Reset user password using token from Redis; clears token after use. */
export const resetUserPassword = async (token: string, newPassword: string) => {
  const redis = getRedis();
  if (!redis) {
    throw new Error("Redis not configured; cannot validate reset token.");
  }

  const userId = await redis.get(redisKey(token));
  if (!userId) {
    throw new Error("Invalid or expired token");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await userDAO.updatePassword(userId, passwordHash);
  await redis.del(redisKey(token));
}
