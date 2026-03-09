import { Request, Response } from "express";
import { AnnouncementService } from "../services/AnnouncementService.js";
import {
  ERROR_FETCHING_ANNOUNCEMENTS,
  ERROR_POSTING_STUDENT_ANNOUNCEMENT,
  ERROR_FETCHING_GENERAL_ANNOUNCEMENTS,
  ERROR_POSTING_GENERAL_ANNOUNCEMENT,
  ANNOUNCEMENT_DELETED_SUCCESS,
  ANNOUNCEMENT_NOT_FOUND,
  ERROR_CREATING_ANNOUNCEMENT,
  ERROR_UPDATING_ANNOUNCEMENT,
} from "../utils/constants/messages.js";

const announcementService = new AnnouncementService();

export const getStudentAnnouncements = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const result = await announcementService.getStudentAnnouncements(userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: ERROR_FETCHING_ANNOUNCEMENTS, error });
  }
};

export const postStudentAnnouncement = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id ?? req.body.userId;
    const { title, content } = req.body;
    const newAnnouncement = await announcementService.postStudentAnnouncement({
      title,
      content,
      userId,
    });
    res.status(201).json(newAnnouncement);
  } catch (error) {
    const message = error instanceof Error ? error.message : ERROR_POSTING_STUDENT_ANNOUNCEMENT;
    res.status(400).json({ message });
  }
};

export const getGeneralAnnouncements = async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string | undefined;
    const userId = req.user?._id;
    const announcements = await announcementService.getGeneralAnnouncements(
      organizationId,
      userId
    );
    res.status(200).json(announcements);
  } catch (error) {
    res.status(500).json({ message: ERROR_FETCHING_GENERAL_ANNOUNCEMENTS, error });
  }
};

export const postGeneralAnnouncement = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id ?? req.body.userId;
    const { title, content, targetAudience } = req.body;
    const newAnnouncement = await announcementService.postGeneralAnnouncement({
      title,
      content,
      userId,
      targetAudience,
    });
    res.status(201).json(newAnnouncement);
  } catch (error) {
    const message = error instanceof Error ? error.message : ERROR_POSTING_GENERAL_ANNOUNCEMENT;
    res.status(400).json({ message });
  }
};

export const getAllAnnouncements = async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string | undefined;
    const result = await announcementService.getAllAnnouncements(organizationId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: ERROR_FETCHING_ANNOUNCEMENTS, error });
  }
};

export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const { type, title, content, targetAudience, organizationId, hostelId, hostelIds } =
      req.body;
    const hostels = Array.isArray(hostelIds)
      ? hostelIds
      : hostelId != null
        ? [Number(hostelId)]
        : undefined;
    const created = await announcementService.createAnnouncement({
      type,
      title,
      content,
      targetAudience,
      organizationId: organizationId ?? req.user?.organizationId,
      hostelIds: hostels,
      userId: req.user?._id,
    });
    res.status(201).json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : ERROR_CREATING_ANNOUNCEMENT;
    res.status(400).json({ message });
  }
};

export const updateAnnouncement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, targetAudience } = req.body;
    const updated = await announcementService.updateAnnouncement(id, {
      title,
      content,
      targetAudience,
    });
    res.status(200).json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : ERROR_UPDATING_ANNOUNCEMENT;
    const status = message === ANNOUNCEMENT_NOT_FOUND ? 404 : 400;
    res.status(status).json({ message });
  }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await announcementService.deleteAnnouncement(id);
    res.status(200).json({ message: ANNOUNCEMENT_DELETED_SUCCESS });
  } catch (error) {
    const message = error instanceof Error ? error.message : ANNOUNCEMENT_NOT_FOUND;
    res.status(message === ANNOUNCEMENT_NOT_FOUND ? 404 : 400).json({ message });
  }
};

/** Student: paginated announcements (hostel-specific). */
export const getStudentAnnouncementsPaginated = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const pageNumber = Math.max(1, parseInt(String(req.query.pageNumber || 1), 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.pageSize || 10), 10) || 10)
    );
    const result = await announcementService.getStudentAnnouncementsPaginated(
      userId,
      pageNumber,
      pageSize
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: ERROR_FETCHING_ANNOUNCEMENTS, error });
  }
};

/** Staff: paginated announcements (org-scoped). */
export const getStaffAnnouncementsPaginated = async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string | undefined;
    const userId = req.user?._id;
    const pageNumber = Math.max(1, parseInt(String(req.query.pageNumber || 1), 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.pageSize || 10), 10) || 10)
    );
    const result = await announcementService.getGeneralAnnouncementsPaginated(
      organizationId,
      userId,
      pageNumber,
      pageSize
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: ERROR_FETCHING_GENERAL_ANNOUNCEMENTS, error });
  }
};

/** Parent: paginated announcements (org-scoped, parent-visible audiences). */
export const getParentAnnouncementsPaginated = async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string | undefined;
    const userId = req.user?._id;
    const pageNumber = Math.max(1, parseInt(String(req.query.pageNumber || 1), 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.pageSize || 10), 10) || 10)
    );
    const result = await announcementService.getParentAnnouncementsPaginated(
      organizationId,
      userId,
      pageNumber,
      pageSize
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: ERROR_FETCHING_GENERAL_ANNOUNCEMENTS, error });
  }
};

/** Admin: paginated list. */
export const getAdminAnnouncementsPaginated = async (req: Request, res: Response) => {
  try {
    const organizationId = (req.query.organizationId as string) ?? req.user?.organizationId;
    if (!organizationId) {
      res.status(400).json({ message: "organizationId required" });
      return;
    }
    const pageNumber = Math.max(1, parseInt(String(req.query.pageNumber || 1), 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.pageSize || 10), 10) || 10)
    );
    const targetAudience = req.query.targetAudience as string | undefined;
    const userId = req.user?._id;
    const result = await announcementService.getAllAnnouncementsPaginated(
      organizationId,
      userId,
      pageNumber,
      pageSize,
      targetAudience
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: ERROR_FETCHING_ANNOUNCEMENTS, error });
  }
};

/** Get single announcement by id. */
export const getAnnouncementById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || id < 1) {
      res.status(400).json({ message: "Invalid announcement ID" });
      return;
    }
    const announcement = await announcementService.getAnnouncementById(id);
    if (!announcement) {
      res.status(404).json({ message: ANNOUNCEMENT_NOT_FOUND });
      return;
    }
    res.status(200).json(announcement);
  } catch (error) {
    res.status(500).json({ message: ERROR_FETCHING_ANNOUNCEMENTS, error });
  }
};

/** Mark announcements as read for the current user (body: { announcementIds: number[] }). */
export const markAnnouncementsAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const raw = req.body?.announcementIds;
    const announcementIds = Array.isArray(raw)
      ? raw
          .map((id: unknown) => (typeof id === "number" ? id : typeof id === "string" ? parseInt(String(id), 10) : NaN))
          .filter((id: number) => Number.isInteger(id) && id >= 1)
      : [];
    await announcementService.markAnnouncementsAsRead(userId, announcementIds);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Failed to mark as read" });
  }
};
