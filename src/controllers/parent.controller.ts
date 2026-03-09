import { Request, Response } from "express";
import { ParentService } from "../services/ParentService.js";
import {
  UNAUTHORIZED,
  PARENT_OR_CHILDREN_NOT_FOUND,
  PARENT_OR_CHILD_NOT_FOUND,
  PARENT_NOT_FOUND,
  INTERNAL_SERVER_ERROR,
  INVALID_ACTION,
  leaveActionedByParent,
  FAILED_REVIEW_LEAVE,
} from "../utils/constants/messages.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("ParentController");
const parentService = new ParentService();

export const getChildStats = async (req: Request, res: Response) => {
  try {
    const parentId = req.user?._id;
    if (!parentId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const result = await parentService.getChildStats(parentId);
    if (!result) {
      return res.status(404).json({ message: PARENT_OR_CHILDREN_NOT_FOUND });
    }
    res.status(200).json(result);
  } catch (error) {
    log.error({ err: error }, "getChildStats failed");
    res.status(500).json({ message: INTERNAL_SERVER_ERROR });
  }
};

export const getChildInfo = async (req: Request, res: Response) => {
  try {
    const parentId = req.user?._id;
    if (!parentId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const child = await parentService.getChildInfo(parentId);
    if (!child) {
      return res.status(404).json({ message: PARENT_OR_CHILD_NOT_FOUND });
    }
    res.status(200).json(child);
  } catch (error) {
    log.error({ err: error }, "getChildInfo failed");
    res.status(500).json({ message: INTERNAL_SERVER_ERROR });
  }
};

export const getChildLeaves = async (req: Request, res: Response) => {
  try {
    const parentId = req.user?._id;
    if (!parentId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const result = await parentService.getChildLeaves(parentId);
    if (!result) {
      return res.status(404).json({ message: PARENT_NOT_FOUND });
    }
    res.status(200).json(result);
  } catch (error) {
    log.error({ err: error }, "getChildLeaves failed");
    res.status(500).json({ message: INTERNAL_SERVER_ERROR });
  }
};

export const getParentProfile = async (req: Request, res: Response) => {
  try {
    const parentId = req.user?._id;
    if (!parentId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const parent = await parentService.getParentProfile(parentId);
    if (!parent) {
      return res.status(404).json({ message: PARENT_NOT_FOUND });
    }
    res.status(200).json(parent);
  } catch (error) {
    log.error({ err: error }, "getParentProfile failed");
    res.status(500).json({ message: INTERNAL_SERVER_ERROR });
  }
};

export const getDashboardInfo = async (req: Request, res: Response) => {
  try {
    const parentId = req.user?._id;
    if (!parentId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const dashboard = await parentService.getDashboardInfo(parentId);
    if (!dashboard) {
      return res.status(404).json({ message: PARENT_OR_CHILD_NOT_FOUND });
    }
    res.status(200).json(dashboard);
  } catch (error) {
    log.error({ err: error }, "getDashboardInfo failed");
    res.status(500).json({ message: INTERNAL_SERVER_ERROR });
  }
};

export const updateParentProfile = async (req: Request, res: Response) => {
  try {
    const parentId = req.user?._id;
    if (!parentId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const { password, children, role, ...rest } = req.body || {};
    const updated = await parentService.updateParentProfile(parentId, rest);
    if (!updated) {
      return res.status(404).json({ message: PARENT_NOT_FOUND });
    }
    res.status(200).json(updated);
  } catch (error) {
    log.error({ err: error }, "updateParentProfile failed");
    res.status(500).json({ message: INTERNAL_SERVER_ERROR });
  }
};

export const reviewLeave = async (req: Request, res: Response) => {
  try {
    const parentId = req.user?._id;
    if (!parentId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const { leaveId } = req.params;
    const { action, remarks } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: INVALID_ACTION });
    }
    const leave = await parentService.reviewLeave(parentId, leaveId, action, remarks);
    res.json({ message: leaveActionedByParent(action), leave });
  } catch (error) {
    const message = error instanceof Error ? error.message : FAILED_REVIEW_LEAVE;
    const status =
      message.includes("not found") || message.includes("unauthorized")
        ? 404
        : message.includes("already reviewed")
          ? 400
          : 500;
    res.status(status).json({ message });
  }
};
