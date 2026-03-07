import { Request, Response, NextFunction } from "express";
import { LeaveService } from "../services/LeaveService.js";
import {
  INVALID_ACTION_APPROVE_OR_REJECT,
  REMARKS_MUST_BE_STRING,
} from "../utils/constants/messages.js";

const leaveService = new LeaveService();

export const validateLeaveReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { leaveId } = req.params;
    const { action, remarks } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: INVALID_ACTION_APPROVE_OR_REJECT,
      });
    }
    if (typeof remarks !== "string" && remarks !== undefined) {
      return res.status(400).json({
        success: false,
        message: REMARKS_MUST_BE_STRING,
      });
    }

    await leaveService.validateForReview(leaveId);
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation failed";
    const status =
      message === "Leave not found"
        ? 404
        : message === "Invalid leave ID" || message.includes("already been reviewed")
          ? 400
          : 500;
    res.status(status).json({
      success: false,
      message,
    });
  }
};
