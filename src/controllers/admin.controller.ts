import { Request, Response } from "express";
import { AdminService } from "../services/AdminService.js";
import {
  ADMIN_USER_CREATED_SUCCESS,
  FAILED_CREATE_ADMIN,
  UNAUTHORIZED,
  BOTH_STUDENT_AND_PARENT_ID_REQUIRED,
  STUDENT_ASSIGNED_TO_PARENT_SUCCESS,
  ERROR_ASSIGNING_STUDENT_TO_PARENT,
  PARENT_STUDENT_RELATIONSHIP_REMOVED_SUCCESS,
  ERROR_REMOVING_PARENT_STUDENT_RELATIONSHIP,
  ERROR_FETCHING_STUDENT_PARENT_INFO,
  ERROR_FETCHING_STUDENTS,
  ERROR_FETCHING_PARENTS,
  PARENT_CREATED_SUCCESS,
  ERROR_CREATING_PARENT,
  PARENT_UPDATED_SUCCESS,
  ERROR_UPDATING_PARENT,
  PARENT_DELETED_SUCCESS,
  ERROR_DELETING_PARENT,
  ERROR_FETCHING_STAFF,
  STAFF_CREATED_SUCCESS,
  ERROR_CREATING_STAFF,
  STAFF_DELETED_SUCCESS,
  ERROR_DELETING_STAFF,
  FAILED_FETCH_LEAVES,
  ID_PARAMETER_REQUIRED,
  FAILED_FETCH_LEAVE,
  LEAVE_DELETED_SUCCESS,
  ERROR_DELETING_LEAVE,
  STUDENT_UPDATED_SUCCESS,
  ERROR_UPDATING_STUDENT,
  STUDENT_DELETED_SUCCESS,
  ERROR_DELETING_STUDENT,
  ERROR_FINDING_STUDENT,
  ERROR_FINDING_STAFF,
  STAFF_UPDATED_SUCCESS,
  ERROR_UPDATING_STAFF,
  ERROR_FINDING_PARENT,
  INVALID_ACTION,
  FAILED_REVIEW_LEAVE,
  FAILED_CHANGE_PASSWORD,
  PASSWORD_UPDATED_SUCCESS,
  leaveActionedSuccess,
  UNKNOWN_ERROR,
} from "../utils/constants/messages.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("AdminController");
const adminService = new AdminService();

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const result = await adminService.createAdminUser(req.body);
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }
    return res.status(201).json({
      message: ADMIN_USER_CREATED_SUCCESS,
      admin: result.admin,
    });
  } catch {
    return res.status(500).json({ message: FAILED_CREATE_ADMIN });
  }
};

export const assignParentToStudent = async (req: Request, res: Response) => {
  try {
    const { studentId, parentId } = req.body;
    if (!studentId || !parentId) {
      return res.status(400).json({ success: false, message: BOTH_STUDENT_AND_PARENT_ID_REQUIRED });
    }
    const result = await adminService.assignParentToStudent(studentId, parentId);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({ success: true, message: STUDENT_ASSIGNED_TO_PARENT_SUCCESS, data: result.data });
  } catch (error) {
    log.error({ err: error }, ERROR_ASSIGNING_STUDENT_TO_PARENT);
    return res.status(500).json({
      success: false,
      message: ERROR_ASSIGNING_STUDENT_TO_PARENT,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const removeParentFromStudent = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const result = await adminService.removeParentFromStudent(studentId);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({ success: true, message: PARENT_STUDENT_RELATIONSHIP_REMOVED_SUCCESS });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: ERROR_REMOVING_PARENT_STUDENT_RELATIONSHIP,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const getStudentParentInfo = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const result = await adminService.getStudentParentInfo(studentId);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: ERROR_FETCHING_STUDENT_PARENT_INFO,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_PAGE_NUMBER = 1;

export const getAllStudents = async (req: Request, res: Response) => {
  try {
    const pageNumber = Math.max(1, parseInt(String(req.query.pageNumber), 10) || DEFAULT_PAGE_NUMBER);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || DEFAULT_PAGE_SIZE));
    const result = await adminService.getAllStudentsPaginated(pageNumber, pageSize);
    return res.status(200).json({
      data: result.data,
      total: result.total,
      pageNumber: result.pageNumber,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error) {
    return res.status(500).json({
      message: ERROR_FETCHING_STUDENTS,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const getAllParents = async (req: Request, res: Response) => {
  try {
    const pageNumber = Math.max(1, parseInt(String(req.query.pageNumber), 10) || DEFAULT_PAGE_NUMBER);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || DEFAULT_PAGE_SIZE));
    const result = await adminService.getAllParentsPaginated(pageNumber, pageSize);
    return res.status(200).json({
      data: result.data,
      total: result.total,
      pageNumber: result.pageNumber,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error) {
    return res.status(500).json({
      message: ERROR_FETCHING_PARENTS,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const createParent = async (req: Request, res: Response) => {
  try {
    const result = await adminService.createParent(req.body);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(201).json({ success: true, message: PARENT_CREATED_SUCCESS, data: result.data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: ERROR_CREATING_PARENT,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const updateParent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await adminService.updateParent(id, req.body);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({ success: true, message: PARENT_UPDATED_SUCCESS, data: result.data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: ERROR_UPDATING_PARENT,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const deleteParent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await adminService.deleteParent(id);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({ success: true, message: PARENT_DELETED_SUCCESS });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: ERROR_DELETING_PARENT,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const getstaff = async (req: Request, res: Response) => {
  try {
    const pageNumber = Math.max(1, parseInt(String(req.query.pageNumber), 10) || DEFAULT_PAGE_NUMBER);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || DEFAULT_PAGE_SIZE));
    const includeAssignedHostels = req.query.includeAssignedHostels === "true" || req.query.includeAssignedHostels === "1";
    const result = await adminService.getStaffPaginated(pageNumber, pageSize, includeAssignedHostels);
    return res.status(200).json({
      data: result.data,
      total: result.total,
      pageNumber: result.pageNumber,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error) {
    return res.status(500).json({
      message: ERROR_FETCHING_STAFF,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const getAssignableUsers = async (req: Request, res: Response) => {
  try {
    const pageNumber = req.query.pageNumber != null;
    const pageSize = req.query.pageSize != null;
    if (pageNumber && pageSize) {
      const pNum = Math.max(1, parseInt(String(req.query.pageNumber), 10) || DEFAULT_PAGE_NUMBER);
      const pSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || DEFAULT_PAGE_SIZE));
      const result = await adminService.getAssignableUsersPaginated(pNum, pSize);
      return res.status(200).json({
        data: result.data,
        total: result.total,
        pageNumber: result.pageNumber,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      });
    }
    const result = await adminService.getAssignableUsers();
    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      message: ERROR_FETCHING_STAFF,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const createStaff = async (req: Request, res: Response) => {
  try {
    const result = await adminService.createStaff(req.body);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(201).json({ success: true, message: STAFF_CREATED_SUCCESS, data: result.data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating staff",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await adminService.deleteStaff(id);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({ success: true, message: STAFF_DELETED_SUCCESS });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: ERROR_DELETING_STAFF,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const getleaves = async (req: Request, res: Response) => {
  try {
    const result = await adminService.getLeaves();
    return res.json(result.data);
  } catch (error) {
    log.error({ err: error }, FAILED_FETCH_LEAVES);
    return res.status(500).json({ message: FAILED_FETCH_LEAVES });
  }
};

export const getleavesbyId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: ID_PARAMETER_REQUIRED });
    }
    const result = await adminService.getLeaveById(id);
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }
    return res.json(result.data);
  } catch (error) {
    log.error({ err: error }, FAILED_FETCH_LEAVE);
    return res.status(500).json({ message: FAILED_FETCH_LEAVE });
  }
};

export const deleteleavebyid = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await adminService.deleteLeaveById(id);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({ success: true, message: LEAVE_DELETED_SUCCESS });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: ERROR_DELETING_LEAVE,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const editstudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await adminService.editStudent(id, req.body);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({
      success: true,
      message: STUDENT_UPDATED_SUCCESS,
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: ERROR_UPDATING_STUDENT,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await adminService.deleteStudent(id);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({ success: true, message: STUDENT_DELETED_SUCCESS });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: ERROR_DELETING_STUDENT,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const getstudentbyid = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await adminService.getStudentById(id);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({ student: result.data, success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: ERROR_FINDING_STUDENT,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const { password: newPassword } = req.body;
    const result = await adminService.updatePassword(id, newPassword);
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }
    return res.json({ message: PASSWORD_UPDATED_SUCCESS });
  } catch (error) {
    log.error({ err: error }, FAILED_CHANGE_PASSWORD);
    return res.status(500).json({ message: FAILED_CHANGE_PASSWORD });
  }
};

export const getstaffbyid = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await adminService.getStaffById(id);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({ staff: result.data, success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: ERROR_FINDING_STAFF,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const updateStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await adminService.updateStaff(id, req.body);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({
      success: true,
      message: STAFF_UPDATED_SUCCESS,
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: ERROR_UPDATING_STAFF,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const getParentbyid = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await adminService.getParentById(id);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({ Parent: result.data, success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: ERROR_FINDING_PARENT,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};

export const leaveAdminApprove = async (req: Request, res: Response) => {
  try {
    const { leaveId } = req.params;
    const { action } = req.body;
    const adminId = req.user?._id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: UNAUTHORIZED });
    }
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: INVALID_ACTION });
    }
    const result = await adminService.leaveAdminApprove(leaveId, action, adminId);
    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({
      success: true,
      message: leaveActionedSuccess(action),
      leave: result.data,
    });
  } catch (error) {
    log.error({ err: error }, FAILED_REVIEW_LEAVE);
    return res.status(500).json({
      success: false,
      message: FAILED_REVIEW_LEAVE,
      error: error instanceof Error ? error.message : UNKNOWN_ERROR,
    });
  }
};
