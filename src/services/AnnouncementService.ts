import { AnnouncementDAO } from "../dao/AnnouncementDAO.js";
import { UserDAO } from "../dao/UserDAO.js";
import { OrganizationDAO } from "../dao/OrganizationDAO.js";
import { UserHostelRoleMappingDAO } from "../dao/UserHostelRoleMappingDAO.js";
import { HostelAnnouncementMappingDAO } from "../dao/HostelAnnouncementMappingDAO.js";
import { AnnouncementPushJobDAO } from "../dao/AnnouncementPushJobDAO.js";
import { AnnouncementReadDAO } from "../dao/AnnouncementReadDAO.js";
import {
  getAnnouncementPushQueue,
  makeBullJobId,
  createAnnouncementPushWorker,
} from "../queue/announcementPushQueue.js";
import {
  ROLE_CODE_STUDENT,
  ROLE_CODE_STAFF,
  ROLE_CODE_ADMIN,
} from "../utils/constants/roles.js";
import {
  AnnouncementTargetAudience,
  normalizeTargetAudience,
  isValidTargetAudience,
  STUDENT_VISIBLE_AUDIENCES,
  STAFF_VISIBLE_AUDIENCES,
  PARENT_VISIBLE_AUDIENCES,
} from "../utils/constants/announcements.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("AnnouncementService");
const announcementDAO = new AnnouncementDAO();
const userDAO = new UserDAO();
const organizationDAO = new OrganizationDAO();
const userHostelRoleMappingDAO = new UserHostelRoleMappingDAO();
const hostelAnnouncementMappingDAO = new HostelAnnouncementMappingDAO();
const announcementPushJobDAO = new AnnouncementPushJobDAO();
const announcementReadDAO = new AnnouncementReadDAO();

let pushWorker: ReturnType<typeof createAnnouncementPushWorker> | null = null;
export function getOrCreatePushWorker() {
  if (!pushWorker) pushWorker = createAnnouncementPushWorker();
  return pushWorker;
}

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/** Resolve organizationId for a user (org mapping first, then hostel mapping). */
async function getOrganizationIdForUser(userId: string): Promise<string | null> {
  const orgMapping = await organizationDAO.findFirstByUserId(userId);
  if (orgMapping) return orgMapping.organizationId;
  const hostelMapping = await userHostelRoleMappingDAO.findFirstByUserId(userId);
  if (hostelMapping?.hostel) return hostelMapping.hostel.organizationId;
  return null;
}

export class AnnouncementService {
  /**
   * Student announcements: hostel-specific. Only announcements for the student's org and their hostel(s) (or org-wide).
   */
  async getStudentAnnouncementsPaginated(
    userId: string,
    pageNumber: number,
    pageSize: number
  ) {
    const organizationId = await getOrganizationIdForUser(userId);
    if (!organizationId) {
      return {
        data: [],
        total: 0,
        pageNumber: 1,
        pageSize: Math.min(pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
        totalPages: 0,
        unreadCount: 0,
      };
    }
    const hostelIds = await userHostelRoleMappingDAO.findHostelIdsByUserId(userId);
    const result = await announcementDAO.findManyForStudentPaginated(
      organizationId,
      hostelIds,
      pageNumber,
      pageSize
    );
    const unreadCount = await announcementReadDAO.countUnreadForStudent(
      userId,
      organizationId,
      hostelIds,
      STUDENT_VISIBLE_AUDIENCES
    );
    return { ...result, unreadCount };
  }

  /** Legacy: get all student announcements (no pagination). Pass userId from auth. */
  async getStudentAnnouncements(userId: string) {
    const r = await this.getStudentAnnouncementsPaginated(userId, 1, 500);
    return {
      studentAnnouncements: r.data,
      generalAnnouncements: [],
      metadata: {
        totalStudentAnnouncements: r.total,
        totalGeneralAnnouncements: 0,
        lastUpdated: new Date(),
      },
    };
  }

  async postStudentAnnouncement(body: { title: string; content: string; userId: string }) {
    const user = await userDAO.findById(body.userId);
    if (!user || user.role !== ROLE_CODE_STUDENT) {
      throw new Error("Only students can post announcements");
    }
    const organizationId = await getOrganizationIdForUser(body.userId);
    if (!organizationId) {
      throw new Error("User has no organization");
    }
    return announcementDAO.create({
      organizationId,
      createdByUserId: body.userId,
      title: body.title,
      content: body.content,
      targetAudience: AnnouncementTargetAudience.STUDENTS,
    });
  }

  /**
   * Staff/general announcements: org-scoped, paginated. Announcements visible to staff (audience includes staff).
   */
  async getGeneralAnnouncementsPaginated(
    organizationId: string | undefined,
    userId: string | undefined,
    pageNumber: number,
    pageSize: number
  ) {
    const orgId = organizationId || (userId ? await getOrganizationIdForUser(userId) : undefined);
    if (!orgId) {
      return {
        data: [],
        total: 0,
        pageNumber: 1,
        pageSize: Math.min(pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
        totalPages: 0,
        unreadCount: 0,
      };
    }
    const result = await announcementDAO.findManyPaginated({
      organizationId: orgId,
      targetAudiences: STAFF_VISIBLE_AUDIENCES,
      pageNumber,
      pageSize: Math.min(pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
    });
    const unreadCount = userId
      ? await announcementReadDAO.countUnread(userId, orgId, STAFF_VISIBLE_AUDIENCES)
      : 0;
    return { ...result, unreadCount };
  }

  /**
   * Parent announcements: org-scoped, paginated. Announcements visible to parents (audience includes parents).
   */
  async getParentAnnouncementsPaginated(
    organizationId: string | undefined,
    userId: string | undefined,
    pageNumber: number,
    pageSize: number
  ) {
    const orgId = organizationId || (userId ? await getOrganizationIdForUser(userId) : undefined);
    if (!orgId) {
      return {
        data: [],
        total: 0,
        pageNumber: 1,
        pageSize: Math.min(pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
        totalPages: 0,
        unreadCount: 0,
      };
    }
    const result = await announcementDAO.findManyPaginated({
      organizationId: orgId,
      targetAudiences: PARENT_VISIBLE_AUDIENCES,
      pageNumber,
      pageSize: Math.min(pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
    });
    const unreadCount = userId
      ? await announcementReadDAO.countUnread(userId, orgId, PARENT_VISIBLE_AUDIENCES)
      : 0;
    return { ...result, unreadCount };
  }

  /** Legacy: get general announcements (no pagination). */
  async getGeneralAnnouncements(organizationId?: string, userId?: string) {
    const orgId = organizationId || (userId ? await getOrganizationIdForUser(userId) : undefined);
    if (!orgId) return [];
    const result = await announcementDAO.findMany(orgId, "desc");
    return result.filter((a) => STAFF_VISIBLE_AUDIENCES.includes(a.targetAudience));
  }

  async postGeneralAnnouncement(body: {
    title: string;
    content: string;
    userId: string;
    targetAudience?: string;
  }) {
    const user = await userDAO.findById(body.userId);
    if (!user || (user.role !== ROLE_CODE_STAFF && user.role !== ROLE_CODE_ADMIN)) {
      throw new Error("Only staff/admin can post general announcements");
    }
    const organizationId = await getOrganizationIdForUser(body.userId);
    if (!organizationId) {
      throw new Error("User has no organization");
    }
    const targetAudience = body.targetAudience
      ? normalizeTargetAudience(body.targetAudience)
      : AnnouncementTargetAudience.ALL;
    return announcementDAO.create({
      organizationId,
      createdByUserId: body.userId,
      title: body.title,
      content: body.content,
      targetAudience,
    });
  }

  /** Admin: all announcements for org, paginated. */
  async getAllAnnouncementsPaginated(
    organizationId: string | undefined,
    userId: string | undefined,
    pageNumber: number,
    pageSize: number,
    targetAudience?: string
  ) {
    const take = Math.min(Math.max(1, pageSize || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    if (!organizationId) {
      return {
        data: [],
        total: 0,
        pageNumber: Math.max(1, pageNumber),
        pageSize: take,
        totalPages: 0,
        unreadCount: 0,
      };
    }
    const result = await announcementDAO.findManyPaginated({
      organizationId,
      pageNumber,
      pageSize: take,
      ...(targetAudience && isValidTargetAudience(targetAudience) && { targetAudience }),
    });
    const unreadCount = userId
      ? await announcementReadDAO.countUnread(userId, organizationId, null)
      : 0;
    return { ...result, unreadCount };
  }

  /** Legacy: getAllAnnouncements returns studentAnnouncements and generalAnnouncements. */
  async getAllAnnouncements(organizationId?: string) {
    if (!organizationId) return { studentAnnouncements: [], generalAnnouncements: [] };
    const all = await announcementDAO.findMany(organizationId, "desc");
    const studentAnnouncements = all.filter((a) =>
      STUDENT_VISIBLE_AUDIENCES.includes(a.targetAudience)
    );
    const generalAnnouncements = all.filter((a) =>
      STAFF_VISIBLE_AUDIENCES.includes(a.targetAudience)
    );
    return { studentAnnouncements, generalAnnouncements };
  }

  async createAnnouncement(params: {
    type?: string;
    title: string;
    content: string;
    targetAudience?: string;
    organizationId?: string;
    hostelIds?: number[];
    userId?: string;
  }) {
    let orgId = params.organizationId;
    if (!orgId && params.userId) {
      orgId = (await getOrganizationIdForUser(params.userId)) ?? undefined;
    }
    if (!orgId) {
      throw new Error("Organization context or organizationId required");
    }

    let targetAudience: string;
    if (params.targetAudience && isValidTargetAudience(params.targetAudience)) {
      targetAudience = params.targetAudience;
    } else if (params.type === "student") {
      targetAudience = AnnouncementTargetAudience.STUDENTS;
    } else if (params.type === "general" && params.targetAudience) {
      targetAudience = normalizeTargetAudience(params.targetAudience);
    } else {
      targetAudience = normalizeTargetAudience(params.targetAudience || AnnouncementTargetAudience.ALL);
    }

    const created = await announcementDAO.create({
      organizationId: orgId,
      createdByUserId: params.userId ?? undefined,
      title: params.title,
      content: params.content,
      targetAudience,
    });

    if (params.hostelIds && params.hostelIds.length > 0) {
      await hostelAnnouncementMappingDAO.createMany(created.id, params.hostelIds);
    }

    const bullJobId = makeBullJobId(created.id);
    await announcementPushJobDAO.create({
      announcementId: created.id,
      bullJobId,
      status: "PENDING",
    });
    const queue = getAnnouncementPushQueue();
    const pushEnqueued = !!queue;
    if (queue) {
      await queue.add("send", { announcementId: created.id }, { jobId: bullJobId });
    }
    getOrCreatePushWorker();

    log.info(
      {
        announcementId: created.id,
        title: created.title,
        targetAudience: created.targetAudience,
        hostelIds: params.hostelIds ?? [],
        pushEnqueued,
      },
      `Announcement published (audience: ${created.targetAudience})`
    );

    return created;
  }

  async updateAnnouncement(
    id: string,
    data: { title?: string; content?: string; targetAudience?: string }
  ) {
    const numId = parseInt(id, 10);
    if (Number.isNaN(numId) || numId < 1) throw new Error("Invalid announcement ID");
    const existing = await announcementDAO.findById(numId);
    if (!existing) {
      throw new Error("Announcement not found");
    }
    const payload: { title?: string; content?: string; targetAudience?: string } = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.content !== undefined) payload.content = data.content;
    if (data.targetAudience !== undefined)
      payload.targetAudience = isValidTargetAudience(data.targetAudience)
        ? data.targetAudience
        : existing.targetAudience;
    await announcementDAO.update(numId, payload);
    return announcementDAO.findById(numId);
  }

  /** Mark announcements as read for the current user (for bell/list "mark as read"). */
  async markAnnouncementsAsRead(userId: string, announcementIds: number[]): Promise<void> {
    if (announcementIds.length === 0) return;
    await announcementReadDAO.markAsRead(userId, announcementIds);
  }

  async deleteAnnouncement(id: string) {
    const numId = parseInt(id, 10);
    if (Number.isNaN(numId) || numId < 1) throw new Error("Invalid announcement ID");
    const existing = await announcementDAO.findById(numId);
    if (!existing) {
      throw new Error("Announcement not found");
    }
    return announcementDAO.delete(numId);
  }

  async getAnnouncementById(id: number) {
    return announcementDAO.findById(id);
  }
}
