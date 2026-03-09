import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
import {
  NO_TOKEN_PROVIDED,
  INVALID_TOKEN,
  UNAUTHORIZED,
  FORBIDDEN,
} from "../utils/constants/messages.js";

interface TokenPayload {
  userId: string;
  role: string;
  organizationId?: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        role: string;
        organizationId?: string;
      };
    }
  }
}

/**
 * Validates the access token (JWT) using the user's per-user jwt_secret (DLP-style).
 * Decodes payload to get userId, loads user, then verifies signature with user.jwtSecret.
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: NO_TOKEN_PROVIDED });
    return;
  }

  try {
    const decoded = jwt.decode(token) as TokenPayload | null;
    if (!decoded?.userId) {
      res.status(401).json({ message: INVALID_TOKEN });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user?.jwtSecret) {
      res.status(401).json({ message: INVALID_TOKEN });
      return;
    }

    const payload = jwt.verify(token, user.jwtSecret) as TokenPayload;
    req.user = {
      _id: payload.userId,
      role: payload.role,
      ...(payload.organizationId && { organizationId: payload.organizationId }),
    };
    next();
  } catch {
    res.status(403).json({ message: INVALID_TOKEN });
  }
};

export const authorizeRoles = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: UNAUTHORIZED });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: FORBIDDEN });
      return;
    }

    next();
  };
};
