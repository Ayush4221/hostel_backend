import { Request, Response } from "express";
import { AuthService } from "../services/AuthService.js";
import {
  generateResetToken,
  sendResetPasswordEmail,
  resetUserPassword,
} from "../services/ForgetPassword.service.js";
import {
  LOGIN_FAILED,
  SIGNUP_FAILED,
  PASSWORD_RESET_EMAIL_SENT,
  PASSWORD_RESET_SUCCESS,
  REFRESH_TOKEN_REQUIRED,
  REFRESH_FAILED,
  LOGOUT_FAILED,
} from "../utils/constants/messages.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("AuthController");
const authService = new AuthService();

export const login = async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);
    res.status(result.status).json(result.json);
  } catch (error) {
    log.error({ err: error }, LOGIN_FAILED);
    res.status(500).json({ message: LOGIN_FAILED });
  }
};

export const orgSignup = async (req: Request, res: Response) => {
  try {
    const result = await authService.orgSignup(req.body);
    res.status(result.status).json(result.json);
  } catch (error) {
    log.error({ err: error }, SIGNUP_FAILED);
    res.status(500).json({ message: SIGNUP_FAILED });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const { resetToken, user } = await generateResetToken(email);
    const resetLink = `${process.env.FRONTEND_LINK}/reset-password?token=${resetToken}`;
    await sendResetPasswordEmail(user.email);
    res.status(200).json({ message: PASSWORD_RESET_EMAIL_SENT });
  } catch (error: unknown) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    await resetUserPassword(token, newPassword);
    res.status(200).json({ message: PASSWORD_RESET_SUCCESS });
  } catch (error: unknown) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ message: REFRESH_TOKEN_REQUIRED });
      return;
    }
    const result = await authService.refresh(refreshToken);
    res.status(result.status).json(result.json);
  } catch (error) {
    log.error({ err: error }, REFRESH_FAILED);
    res.status(500).json({ message: REFRESH_FAILED });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body?.refreshToken ?? req.headers["authorization"]?.replace(/^Bearer\s+/i, "");
    if (!refreshToken) {
      res.status(400).json({ message: REFRESH_TOKEN_REQUIRED });
      return;
    }
    const result = await authService.logout(refreshToken);
    res.status(result.status).send();
  } catch (error) {
    log.error({ err: error }, LOGOUT_FAILED);
    res.status(500).json({ message: LOGOUT_FAILED });
  }
};
