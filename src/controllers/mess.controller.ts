import { Request, Response } from "express";
import { MessService } from "../services/MessService.js";
import { uploadFromPath, buildMessPicKey } from "../config/s3.js";
import { deleteFromUploads } from "../middleware/upload.middleware.js";
import { ROLE_CODE_ADMIN, ROLE_CODE_STAFF, ROLE_CODE_SUPER_ADMIN } from "../utils/constants/roles.js";
import {
  PERMISSION_DENIED,
  NO_FILE_UPLOADED,
  NO_HOSTEL_FOUND,
  HOSTEL_NOT_FOUND,
  PHOTO_UPLOADED_SUCCESS,
  ERROR_UPLOADING_PHOTO,
  NO_MESS_PHOTO_FOUND,
  ERROR_FETCHING_MESS_PHOTO,
  MESS_PHOTO_DELETED_SUCCESS,
  ERROR_DELETING_PHOTO,
  UNKNOWN_ERROR,
} from "../utils/constants/messages.js";

const messService = new MessService();

const UPLOAD_ROLES = [ROLE_CODE_ADMIN, ROLE_CODE_STAFF, ROLE_CODE_SUPER_ADMIN];
const DELETE_ROLES = [ROLE_CODE_ADMIN, ROLE_CODE_SUPER_ADMIN];

export const uploadMessPhoto = async (req: Request, res: Response) => {
  const role = req.user?.role;
  if (!role || !UPLOAD_ROLES.includes(role)) {
    return res.status(403).json({ message: PERMISSION_DENIED });
  }
  if (!req.file) {
    return res.status(400).json({ message: NO_FILE_UPLOADED });
  }

  const hostelId = (req.body.hostelId ?? req.query.hostelId) as string | undefined;
  const resolvedHostelId = await messService.resolveHostelId(hostelId);
  if (!resolvedHostelId) {
    return res.status(400).json({
      message: NO_HOSTEL_FOUND,
    });
  }

  const context = await messService.getHostelOrgContext(resolvedHostelId);
  if (!context) {
    return res.status(400).json({ message: HOSTEL_NOT_FOUND });
  }
  const { orgId } = context;

  const filePath = req.file.path;
  try {
    const key = buildMessPicKey(context.orgId, context.hostelId, req.file.originalname, String(Date.now()));
    const { url } = await uploadFromPath(filePath, key, req.file.mimetype);
    deleteFromUploads(filePath);

    const messPhoto = await messService.uploadPhoto(resolvedHostelId, url);
    res.status(200).json({ message: PHOTO_UPLOADED_SUCCESS, messPhoto });
  } catch (err) {
    deleteFromUploads(filePath);
    res.status(500).json({
      message: ERROR_UPLOADING_PHOTO,
      error: err instanceof Error ? err.message : UNKNOWN_ERROR,
    });
  }
};

export const getMessPhoto = async (req: Request, res: Response) => {
  try {
    const hostelId = req.query.hostelId as string | undefined;
    const result = await messService.getMessPhoto(hostelId);
    if (!result) {
      return res.status(404).json({ message: NO_MESS_PHOTO_FOUND });
    }
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      message: ERROR_FETCHING_MESS_PHOTO,
      error: err instanceof Error ? err.message : UNKNOWN_ERROR,
    });
  }
};

export const deleteMessPhoto = async (req: Request, res: Response) => {
  const role = req.user?.role;
  if (!role || !DELETE_ROLES.includes(role)) {
    return res.status(403).json({ message: PERMISSION_DENIED });
  }
  try {
    const hostelId = (req.body.hostelId ?? req.query.hostelId) as string | undefined;
    const current = await messService.getMessPhoto(hostelId);
    if (!current) {
      return res.status(404).json({ message: NO_MESS_PHOTO_FOUND });
    }
    await messService.clearPhoto(current.id);
    res.status(200).json({ message: MESS_PHOTO_DELETED_SUCCESS });
  } catch (err) {
    res.status(500).json({
      message: ERROR_DELETING_PHOTO,
      error: err instanceof Error ? err.message : UNKNOWN_ERROR,
    });
  }
};
