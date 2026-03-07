import { Request, Response } from "express";
import { ComplaintsService } from "../services/ComplaintsService.js";
import {
  AUTHENTICATION_REQUIRED,
  FAILED_CREATE_COMPLAINT,
  COMPLAINT_DELETED_SUCCESS,
  UNAUTHORIZED,
  UNKNOWN_ERROR,
} from "../utils/constants/messages.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("ComplaintsController");
const complaintsService = new ComplaintsService();

export const createComplaint = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ success: false, message: AUTHENTICATION_REQUIRED });
    }
    const result = await complaintsService.createComplaint(studentId, req.body);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(201).json({ success: true, complaint: result.complaint });
  } catch (error) {
    log.error({ err: error }, FAILED_CREATE_COMPLAINT);
    return res.status(500).json({
      success: false,
      message: FAILED_CREATE_COMPLAINT,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const getComplaints = async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "10");
    const result = await complaintsService.getComplaints(page, limit);
    return res.status(200).json({
      success: true,
      data: result.complaints,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const updateComplaint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ success: false, message: AUTHENTICATION_REQUIRED });
    }
    const result = await complaintsService.updateComplaint(id, studentId, req.body);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({ success: true, complaint: result.complaint });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const deleteComplaint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await complaintsService.deleteComplaint(id);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({ success: true, message: COMPLAINT_DELETED_SUCCESS });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const getStudentComplaints = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ success: false, message: UNAUTHORIZED });
    }
    const result = await complaintsService.getStudentComplaints(studentId);
    return res.status(200).json({ success: true, complaints: result.complaints });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const deleteStudentComplaint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ success: false, message: AUTHENTICATION_REQUIRED });
    }
    const result = await complaintsService.deleteStudentComplaint(id, studentId);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({
      success: true,
      message: COMPLAINT_DELETED_SUCCESS,
      deletedComplaint: result.deletedComplaint,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const getParentsComplaints = async (req: Request, res: Response) => {
  try {
    const parentId = req.user?._id;
    if (!parentId) {
      return res.status(401).json({ success: false, message: UNAUTHORIZED });
    }
    const result = await complaintsService.getParentsComplaints(parentId);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({ success: true, complaints: result.complaints });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};
