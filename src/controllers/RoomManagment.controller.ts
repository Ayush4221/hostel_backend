import { Request, Response } from "express";
import { RoomService } from "../services/RoomService.js";
import { ROLE_CODE_ADMIN, ROLE_CODE_SUPER_ADMIN } from "../utils/constants/index.js";
import {
  FORBIDDEN_ADMINS_ONLY,
  FAILED_FETCH_ROOMMATES,
  STUDENT_ID_AND_ROOM_REQUIRED,
  INVALID_STUDENT_ID_FORMAT,
  FAILED_ASSIGN_OR_UPDATE_ROOM,
} from "../utils/constants/messages.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("RoomManagementController");
const roomService = new RoomService();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getAllRoommates = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const isAdminOrSuperAdmin = role === ROLE_CODE_ADMIN || role === ROLE_CODE_SUPER_ADMIN;
    if (!isAdminOrSuperAdmin) {
      return res.status(403).json({ message: FORBIDDEN_ADMINS_ONLY });
    }
    const hostelId = req.query.hostelId as string | undefined;
    const result = await roomService.getAllRoommates(hostelId);
    return res.json(result.data);
  } catch (error) {
    log.error({ err: error }, FAILED_FETCH_ROOMMATES);
    return res.status(500).json({ message: FAILED_FETCH_ROOMMATES });
  }
};

export const AssignOrUpdateRoom = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const isAdminOrSuperAdmin = role === ROLE_CODE_ADMIN || role === ROLE_CODE_SUPER_ADMIN;
    if (!isAdminOrSuperAdmin) {
      return res.status(403).json({ message: FORBIDDEN_ADMINS_ONLY });
    }
    const { studentId, roomNumber, hostelId } = req.body;
    if (!studentId || !roomNumber) {
      return res.status(400).json({
        message: STUDENT_ID_AND_ROOM_REQUIRED,
      });
    }
    if (!UUID_REGEX.test(studentId)) {
      return res.status(400).json({
        message: INVALID_STUDENT_ID_FORMAT,
      });
    }
    const result = await roomService.assignOrUpdateRoom(studentId, roomNumber, hostelId);
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }
    return res.status(200).json(result.data);
  } catch (error) {
    log.error({ err: error }, FAILED_ASSIGN_OR_UPDATE_ROOM);
    return res.status(500).json({ message: FAILED_ASSIGN_OR_UPDATE_ROOM });
  }
};
