import { Request, Response } from "express";
import { StudentService } from "../services/StudentService.js";
import { uploadFromPath, buildProfilePicKey } from "../config/s3.js";
import { deleteFromUploads } from "../middleware/upload.middleware.js";
import {
  UNAUTHORIZED,
  STUDENT_NOT_FOUND,
  FAILED_FETCH_STUDENT_PROFILE,
  FAILED_FETCH_LEAVE_STATS,
  FAILED_FETCH_LEAVES,
  END_DATE_BEFORE_START,
  FAILED_SUBMIT_LEAVE,
  FAILED_UPDATE_PROFILE,
  FAILED_FETCH_DASHBOARD,
  PASSWORD_UPDATED_SUCCESS,
  STUDENT_OR_ROOM_NOT_FOUND,
  FAILED_FETCH_ROOMMATES,
  USER_ID_AND_FILE_REQUIRED,
  USER_MUST_BE_LINKED_TO_HOSTEL,
  USER_NOT_FOUND,
  PROFILE_PICTURE_UPDATED_SUCCESS,
  INTERNAL_SERVER_ERROR,
  UNKNOWN_ERROR,
  ERROR_UPLOADING_PROFILE_PICTURE,
} from "../utils/constants/messages.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("StudentController");
const studentService = new StudentService();

export const getStudentProfile = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const student = await studentService.getProfile(studentId);
    if (!student) {
      return res.status(404).json({ message: STUDENT_NOT_FOUND });
    }
    res.json(student);
  } catch (error) {
    log.error({ err: error }, FAILED_FETCH_STUDENT_PROFILE);
    res.status(500).json({ message: FAILED_FETCH_STUDENT_PROFILE });
  }
};

export const getStudentLeaveStats = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const stats = await studentService.getLeaveStats(studentId);
    res.json(stats);
  } catch (error) {
    log.error({ err: error }, FAILED_FETCH_LEAVE_STATS);
    res.status(500).json({ message: FAILED_FETCH_LEAVE_STATS });
  }
};

export const getStudentLeaves = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ success: false, message: UNAUTHORIZED });
    }
    const leaves = await studentService.getLeaves(studentId);
    res.status(200).json({ success: true, leaves });
  } catch (error) {
    log.error({ err: error }, FAILED_FETCH_LEAVES);
    res.status(500).json({
      success: false,
      message: FAILED_FETCH_LEAVES,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const submitLeave = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const {
      startDate,
      endDate,
      reason,
      leaveType,
      contactNumber,
      parentContact,
      address,
    } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return res.status(400).json({ message: END_DATE_BEFORE_START });
    }

    const leave = await studentService.submitLeave(studentId, {
      startDate: start,
      endDate: end,
      reason,
      leaveType,
      contactNumber,
      parentContact,
      address,
    });
    res.status(201).json(leave);
  } catch (error) {
    const message = error instanceof Error ? error.message : FAILED_SUBMIT_LEAVE;
    const status = message.includes("already have a leave") ? 400 : 500;
    res.status(status).json({ message });
  }
};

export const updateStudentProfile = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const { firstName, lastName, email, roomNumber } = req.body;
    const student = await studentService.updateProfile(studentId, {
      firstName,
      lastName,
      email,
      roomNumber,
    });
    if (!student) {
      return res.status(404).json({ message: STUDENT_NOT_FOUND });
    }
    res.json(student);
  } catch (error) {
    log.error({ err: error }, FAILED_UPDATE_PROFILE);
    res.status(500).json({ message: FAILED_UPDATE_PROFILE });
  }
};

export const getStudentDashboard = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const dashboard = await studentService.getDashboard(studentId);
    if (!dashboard) {
      return res.status(404).json({ message: STUDENT_NOT_FOUND });
    }
    res.json(dashboard);
  } catch (error) {
    log.error({ err: error }, FAILED_FETCH_DASHBOARD);
    res.status(500).json({ message: FAILED_FETCH_DASHBOARD });
  }
};

export const changeStudentPassword = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const { currentPassword, newPassword } = req.body;
    await studentService.changePassword(studentId, currentPassword, newPassword);
    res.json({ message: PASSWORD_UPDATED_SUCCESS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to change password";
    res.status(message.includes("incorrect") ? 400 : 500).json({ message });
  }
};

export const getStudentRoomates = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const result = await studentService.getRoommates(studentId);
    if (!result) {
      return res.status(404).json({ message: STUDENT_OR_ROOM_NOT_FOUND });
    }
    res.json(result);
  } catch (error) {
    log.error({ err: error }, FAILED_FETCH_ROOMMATES);
    res.status(500).json({ message: FAILED_FETCH_ROOMMATES });
  }
};

export const uploadProfilePicture = async (req: Request, res: Response) => {
  const userId = req.user?._id;
  if (!userId || !req.file) {
    return res.status(400).json({ error: USER_ID_AND_FILE_REQUIRED });
  }
  const context = await studentService.getProfilePicUploadContext(userId);
  if (!context) {
    return res.status(400).json({
      error: USER_MUST_BE_LINKED_TO_HOSTEL,
    });
  }
  const filePath = req.file.path;
  try {
    const key = buildProfilePicKey(
      context.orgId,
      context.hostelId,
      userId,
      req.file.originalname,
      `${Date.now()}`
    );
    const { url } = await uploadFromPath(filePath, key, req.file.mimetype);
    deleteFromUploads(filePath);
    const updatedUser = await studentService.uploadProfilePicture(userId, url);
    if (!updatedUser) {
      return res.status(404).json({ error: USER_NOT_FOUND });
    }
    res.status(200).json({
      message: PROFILE_PICTURE_UPDATED_SUCCESS,
      profilePicUrl: url,
    });
  } catch (error) {
    deleteFromUploads(filePath);
    log.error({ err: error }, ERROR_UPLOADING_PROFILE_PICTURE);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR });
  }
};
