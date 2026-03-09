import { Request, Response } from "express";
import { ROLE_CODE_SUPER_ADMIN } from "../utils/constants/index.js";
import { HostelService } from "../services/HostelService.js";
import {
  UNAUTHORIZED,
  FAILED_FETCH_HOSTELS,
  FAILED_ADD_HOSTEL,
  FAILED_UPDATE_HOSTEL,
  FAILED_DELETE_HOSTEL,
  HOSTEL_DELETED_SUCCESS,
} from "../utils/constants/messages.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("HostelController");
const hostelService = new HostelService();

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PAGE_NUMBER = 1;

export const getAllHostels = async (req: Request, res: Response) => {
  try {
    const isSuperAdmin = req.user?.role === ROLE_CODE_SUPER_ADMIN;
    const organizationId = isSuperAdmin ? undefined : req.user?.organizationId;

    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize), 10) || DEFAULT_PAGE_SIZE));
    const pageNumber = Math.max(1, parseInt(String(req.query.pageNumber), 10) || DEFAULT_PAGE_NUMBER);
    const searchText = (req.query.searchText as string)?.trim() || undefined;

    const result = await hostelService.getAllHostelsPaginated(organizationId, {
      pageNumber,
      pageSize,
      searchText,
    });
    return res.status(200).json(result.data);
  } catch (error) {
    log.error({ err: error }, FAILED_FETCH_HOSTELS);
    return res.status(500).json({ message: FAILED_FETCH_HOSTELS });
  }
};

export const getHostelById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || id < 1) {
      return res.status(400).json({ message: "Invalid hostel ID" });
    }
    const result = await hostelService.getHostelById(id);
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }
    return res.status(200).json(result.data);
  } catch (error) {
    log.error({ err: error }, FAILED_FETCH_HOSTELS);
    return res.status(500).json({ message: FAILED_FETCH_HOSTELS });
  }
};

export const createHostel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const isSuperAdmin = req.user?.role === ROLE_CODE_SUPER_ADMIN;
    const result = await hostelService.createHostel(
      userId,
      req.body,
      isSuperAdmin,
      req.user?.organizationId
    );
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }
    return res.status(201).json(result.data);
  } catch (error) {
    log.error({ err: error }, FAILED_ADD_HOSTEL);
    return res.status(500).json({ message: FAILED_ADD_HOSTEL });
  }
};

export const updateHostel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || id < 1) {
      return res.status(400).json({ message: "Invalid hostel ID" });
    }
    const isSuperAdmin = req.user?.role === ROLE_CODE_SUPER_ADMIN;
    const result = await hostelService.updateHostel(
      id,
      userId,
      req.body,
      isSuperAdmin,
      req.user?.organizationId
    );
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }
    return res.status(200).json(result.data);
  } catch (error) {
    log.error({ err: error }, FAILED_UPDATE_HOSTEL);
    return res.status(500).json({ message: FAILED_UPDATE_HOSTEL });
  }
};

export const deleteHostel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || id < 1) {
      return res.status(400).json({ message: "Invalid hostel ID" });
    }
    const isSuperAdmin = req.user?.role === ROLE_CODE_SUPER_ADMIN;
    const result = await hostelService.deleteHostel(id, userId, isSuperAdmin, req.user?.organizationId);
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }
    return res.status(200).json({ message: HOSTEL_DELETED_SUCCESS });
  } catch (error) {
    log.error({ err: error }, FAILED_DELETE_HOSTEL);
    return res.status(500).json({ message: FAILED_DELETE_HOSTEL });
  }
};

export const getHostelUsers = async (req: Request, res: Response) => {
  try {
    const callerUserId = req.user?._id;
    if (!callerUserId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || id < 1) {
      return res.status(400).json({ message: "Invalid hostel ID" });
    }
    const isSuperAdmin = req.user?.role === ROLE_CODE_SUPER_ADMIN;
    const result = await hostelService.getHostelUsers(id, callerUserId, isSuperAdmin, req.user?.organizationId);
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }
    return res.status(200).json(result.data);
  } catch (error) {
    log.error({ err: error }, FAILED_FETCH_HOSTELS);
    return res.status(500).json({ message: FAILED_FETCH_HOSTELS });
  }
};

export const assignUserToHostel = async (req: Request, res: Response) => {
  try {
    const callerUserId = req.user?._id;
    if (!callerUserId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const hostelId = parseInt(req.params.id, 10);
    if (Number.isNaN(hostelId) || hostelId < 1) {
      return res.status(400).json({ message: "Invalid hostel ID" });
    }
    const isSuperAdmin = req.user?.role === ROLE_CODE_SUPER_ADMIN;
    const result = await hostelService.assignUserToHostel(
      hostelId,
      req.body,
      callerUserId,
      isSuperAdmin,
      req.user?.organizationId
    );
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }
    return res.status(201).json(result.data);
  } catch (error) {
    log.error({ err: error }, FAILED_ADD_HOSTEL);
    return res.status(500).json({ message: FAILED_ADD_HOSTEL });
  }
};

export const unassignUserFromHostel = async (req: Request, res: Response) => {
  try {
    const callerUserId = req.user?._id;
    if (!callerUserId) {
      return res.status(401).json({ message: UNAUTHORIZED });
    }
    const hostelId = parseInt(req.params.id, 10);
    const { userId } = req.params;
    if (Number.isNaN(hostelId) || hostelId < 1 || !userId) {
      return res.status(400).json({ message: "Invalid hostel ID or user ID" });
    }
    const isSuperAdmin = req.user?.role === ROLE_CODE_SUPER_ADMIN;
    const result = await hostelService.unassignUserFromHostel(
      hostelId,
      userId,
      callerUserId,
      isSuperAdmin,
      req.user?.organizationId
    );
    if (result.error) {
      return res.status(result.status).json({ message: result.error });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    log.error({ err: error }, FAILED_DELETE_HOSTEL);
    return res.status(500).json({ message: FAILED_DELETE_HOSTEL });
  }
};
