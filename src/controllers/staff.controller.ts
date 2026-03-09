import { Request, Response } from "express";
import { StaffService } from "../services/StaffService.js";
import {
  UNAUTHORIZED,
  STAFF_NOT_FOUND,
  FAILED_FETCH_STAFF_PROFILE,
  FAILED_FETCH_LEAVE_STATISTICS,
  FAILED_FETCH_LEAVES,
  FAILED_FETCH_PENDING_LEAVES,
  INVALID_ACTION,
  leaveActionedSuccess,
  FAILED_REVIEW_LEAVE,
  FAILED_FETCH_DASHBOARD_DATA,
  PASSWORD_UPDATED_SUCCESS,
  UNKNOWN_ERROR,
} from "../utils/constants/messages.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("StaffController");
const staffService = new StaffService();

export const getStaffProfile = async (req: Request, res: Response) => {
  try {
    const staffId = req.user?._id;
    if (!staffId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const staff = await staffService.getProfile(staffId);
    if (!staff) {
      return res.status(404).json({ message: STAFF_NOT_FOUND });
    }
    res.json(staff);
  } catch (error) {
    log.error({ err: error }, FAILED_FETCH_STAFF_PROFILE);
    res.status(500).json({ message: FAILED_FETCH_STAFF_PROFILE });
  }
};

export const getStaffLeaveStats = async (req: Request, res: Response) => {
  try {
    const stats = await staffService.getLeaveStats();
    res.json(stats);
  } catch (error) {
    log.error({ err: error }, FAILED_FETCH_LEAVE_STATISTICS);
    res.status(500).json({ message: FAILED_FETCH_LEAVE_STATISTICS });
  }
};

export const getAllLeaves = async (req: Request, res: Response) => {
  try {
    const leaves = await staffService.getAllLeaves();
    res.json(leaves);
  } catch (error) {
    log.error({ err: error }, FAILED_FETCH_LEAVES);
    res.status(500).json({ message: FAILED_FETCH_LEAVES });
  }
};

export const getPendingLeaves = async (req: Request, res: Response) => {
  try {
    const leaves = await staffService.getPendingLeaves();
    res.json(leaves);
  } catch (error) {
    log.error({ err: error }, FAILED_FETCH_PENDING_LEAVES);
    res.status(500).json({ message: FAILED_FETCH_PENDING_LEAVES });
  }
};

export const reviewLeave = async (req: Request, res: Response) => {
  try {
    const { leaveId } = req.params;
    const { action, remarks } = req.body;
    const staffId = req.user?._id;

    if (!staffId) {
      return res.status(401).json({ success: false, message: UNAUTHORIZED });
    }
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: INVALID_ACTION });
    }

    const leave = await staffService.reviewLeave(leaveId, staffId, action, remarks);
    return res.status(200).json({
      success: true,
      message: leaveActionedSuccess(action),
      leave,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : FAILED_REVIEW_LEAVE;
    const status =
      message === "Leave not found"
        ? 404
        : message === "Invalid leave ID" || message.includes("already reviewed")
          ? 400
          : 500;
    return res.status(status).json({
      success: false,
      message,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const getStaffDashboard = async (req: Request, res: Response) => {
  try {
    const staffId = req.user?._id;
    if (!staffId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const dashboard = await staffService.getDashboard(staffId);
    if (!dashboard) {
      return res.status(404).json({ message: STAFF_NOT_FOUND });
    }
    res.json(dashboard);
  } catch (error) {
    log.error({ err: error }, FAILED_FETCH_DASHBOARD_DATA);
    res.status(500).json({ message: FAILED_FETCH_DASHBOARD_DATA });
  }
};

export const changestaffPassword = async (req: Request, res: Response) => {
  try {
    const staffId = req.user?._id;
    if (!staffId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const { currentPassword, newPassword } = req.body;
    const ok = await staffService.changePassword(staffId, currentPassword, newPassword);
    if (!ok) {
      return res.status(404).json({ message: STAFF_NOT_FOUND });
    }
    res.json({ message: PASSWORD_UPDATED_SUCCESS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to change staff password";
    res.status(message.includes("incorrect") ? 400 : 500).json({ message });
  }
};
