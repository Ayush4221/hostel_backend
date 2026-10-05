import { AnnouncementDAO } from "../../dao/AnnouncementDAO.js";
import { HostelAnnouncementMappingDAO } from "../../dao/HostelAnnouncementMappingDAO.js";
import { AnnouncementPushJobDAO } from "../../dao/AnnouncementPushJobDAO.js";
import { AnnouncementTargetAudience } from "../../utils/constants/announcements.js";
import { createLogger } from "../../utils/logger.js";
import { getAnnouncementPushQueue, makeBullJobId } from "../../queue/announcementPushQueue.js";

const log = createLogger("AnnouncementCreationFacade");

export type CreateAnnouncementPayload = {
  organizationId: string;
  createdByUserId?: string;
  title: string;
  content: string;
  targetAudience: string;
  hostelIds?: number[];
};

export class AnnouncementCreationFacade {
  constructor(
    private readonly announcementDAO: AnnouncementDAO,
    private readonly hostelAnnouncementMappingDAO: HostelAnnouncementMappingDAO,
    private readonly announcementPushJobDAO: AnnouncementPushJobDAO,
    private readonly ensurePushWorker: () => unknown
  ) {}

  async create(payload: CreateAnnouncementPayload) {
    const targetAudience = payload.targetAudience || AnnouncementTargetAudience.ALL;
    const created = await this.announcementDAO.create({
      organizationId: payload.organizationId,
      createdByUserId: payload.createdByUserId,
      title: payload.title,
      content: payload.content,
      targetAudience,
    });

    if (payload.hostelIds && payload.hostelIds.length > 0) {
      await this.hostelAnnouncementMappingDAO.createMany(created.id, payload.hostelIds);
    }

    const bullJobId = makeBullJobId(created.id);
    await this.announcementPushJobDAO.create({
      announcementId: created.id,
      bullJobId,
      status: "PENDING",
    });

    const queue = getAnnouncementPushQueue();
    const pushEnqueued = !!queue;
    if (queue) {
      await queue.add("send", { announcementId: created.id }, { jobId: bullJobId });
    }

    this.ensurePushWorker();

    log.info(
      {
        announcementId: created.id,
        title: created.title,
        targetAudience: created.targetAudience,
        hostelIds: payload.hostelIds ?? [],
        pushEnqueued,
      },
      `Announcement published (audience: ${created.targetAudience})`
    );

    return created;
  }
}
