import { Queue, Worker, Job } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { getRedisForBullMQ } from "../db/redis.js";
import { createLogger } from "../utils/logger.js";
import { AnnouncementDAO } from "../dao/AnnouncementDAO.js";

const log = createLogger("AnnouncementPushQueue");
import { HostelAnnouncementMappingDAO } from "../dao/HostelAnnouncementMappingDAO.js";
import { AnnouncementPushJobDAO } from "../dao/AnnouncementPushJobDAO.js";
import { PushTokenDAO } from "../dao/PushTokenDAO.js";
import { sendToTokens, isPushConfigured } from "../services/PushService.js";
import { resolveAnnouncementAudienceUserIds } from "../services/AnnouncementAudienceResolver.js";

const QUEUE_NAME = "announcement-push";
const connection = getRedisForBullMQ();

function getQueue(): Queue | null {
  if (!connection) return null;
  return new Queue(QUEUE_NAME, { connection: connection as ConnectionOptions });
}

export function getAnnouncementPushQueue(): Queue | null {
  return getQueue();
}

export interface AnnouncementPushJobData {
  announcementId: number;
}

export const BULL_JOB_ID_PREFIX = "announcement-push-";

export function makeBullJobId(announcementId: number): string {
  return `${BULL_JOB_ID_PREFIX}${announcementId}`;
}

const announcementDAO = new AnnouncementDAO();
const hostelMappingDAO = new HostelAnnouncementMappingDAO();
const pushJobDAO = new AnnouncementPushJobDAO();
const pushTokenDAO = new PushTokenDAO();

async function processAnnouncementPushJob(job: Job<AnnouncementPushJobData>) {
  const { announcementId } = job.data;
  const bullJobId = job.id ?? makeBullJobId(announcementId);

  const pushJobRow = await pushJobDAO.findByBullJobId(String(bullJobId));
  if (pushJobRow?.status === "SUCCESS") return;

  const announcement = await announcementDAO.findById(announcementId);
  if (!announcement) {
    log.info({ announcementId, bullJobId }, "Announcement not found, cancelling push job");
    if (pushJobRow) {
      await pushJobDAO.updateStatus(pushJobRow.id, "CANCELLED", {
        completedAt: new Date(),
      });
    }
    return;
  }

  log.info(
    { announcementId, title: announcement.title, bullJobId },
    "Push job started for announcement"
  );

  if (pushJobRow) {
    await pushJobDAO.updateStatus(pushJobRow.id, "IN_PROGRESS", {
      startedAt: new Date(),
    });
  }

  const hostelIds = await hostelMappingDAO.findHostelIdsByAnnouncementId(announcementId);
  const userIds = await resolveAnnouncementAudienceUserIds(
    announcement.targetAudience,
    announcement.organizationId,
    hostelIds
  );
  log.info(
    { announcementId, targetAudience: announcement.targetAudience, recipientCount: userIds.length },
    "Audience resolved for push"
  );

  if (userIds.length === 0) {
    log.info(
      { announcementId, targetAudience: announcement.targetAudience },
      `No recipients for audience ${announcement.targetAudience}, push job completed`
    );
    if (pushJobRow) {
      await pushJobDAO.updateStatus(pushJobRow.id, "SUCCESS", {
        completedAt: new Date(),
      });
    }
    return;
  }

  // Recipients have no registered FCM device tokens (mobile app or web push not registered).
  const tokenRows = await pushTokenDAO.findByUserIds(userIds);
  const tokens = tokenRows.map((r) => r.token);
  if (tokens.length === 0) {
    log.info(
      { announcementId, targetAudience: announcement.targetAudience, recipientCount: userIds.length },
      `No push tokens for ${userIds.length} recipients (audience: ${announcement.targetAudience}) – register devices in app to receive push; job completed`
    );
    if (pushJobRow) {
      await pushJobDAO.updateStatus(pushJobRow.id, "SUCCESS", {
        completedAt: new Date(),
      });
    }
    return;
  }

  if (!isPushConfigured()) {
    log.info({ announcementId }, "FCM not configured, push job failed");
    if (pushJobRow) {
      await pushJobDAO.updateStatus(pushJobRow.id, "FAILED", {
        completedAt: new Date(),
        lastError: "FCM not configured",
      });
    }
    return;
  }

  const body = announcement.content.slice(0, 200);
  const result = await sendToTokens(tokens, announcement.title, body, {
    announcementId: String(announcement.id),
  });

  if (result.failedTokens.length > 0) {
    await pushTokenDAO.deleteByTokens(result.failedTokens);
  }

  const tokensSent = tokens.length - result.failedTokens.length;
  log.info(
    {
      announcementId,
      title: announcement.title,
      targetAudience: announcement.targetAudience,
      tokensSent,
      failedTokens: result.failedTokens.length,
    },
    `FCM push sent to ${tokensSent} recipients (audience: ${announcement.targetAudience})`
  );

  if (pushJobRow) {
    await pushJobDAO.updateStatus(pushJobRow.id, "SUCCESS", {
      completedAt: new Date(),
    });
  }
}

export function createAnnouncementPushWorker(): Worker<AnnouncementPushJobData> | null {
  if (!connection) return null;
  const worker = new Worker<AnnouncementPushJobData>(
    QUEUE_NAME,
    async (job) => {
      await processAnnouncementPushJob(job);
    },
    { connection: connection as ConnectionOptions, concurrency: 1 }
  );
  worker.on("failed", async (job, err) => {
    if (job && job.id) {
      const row = await pushJobDAO.findByBullJobId(String(job.id));
      if (row) {
        const lastError = err?.message ?? String(err);
        log.info(
          { announcementId: job.data?.announcementId, bullJobId: job.id, error: lastError },
          "Announcement push job failed"
        );
        await pushJobDAO.updateStatus(row.id, "FAILED", {
          completedAt: new Date(),
          lastError,
        });
      }
    }
  });
  return worker;
}
