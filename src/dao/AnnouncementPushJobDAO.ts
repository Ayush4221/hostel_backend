import { prisma } from "../db/prisma.js";
import type { AnnouncementPushJobStatus } from "@prisma/client";

export class AnnouncementPushJobDAO {
  async create(data: {
    announcementId: number;
    bullJobId: string;
    status?: AnnouncementPushJobStatus;
  }) {
    return prisma.announcementPushJob.create({
      data: {
        announcementId: data.announcementId,
        bullJobId: data.bullJobId,
        status: data.status ?? "PENDING",
      },
    });
  }

  async findByBullJobId(bullJobId: string) {
    return prisma.announcementPushJob.findFirst({
      where: { bullJobId },
    });
  }

  async updateStatus(
    id: number,
    status: AnnouncementPushJobStatus,
    extra?: { startedAt?: Date; completedAt?: Date; lastError?: string }
  ) {
    return prisma.announcementPushJob.update({
      where: { id },
      data: {
        status,
        ...(extra?.startedAt != null && { startedAt: extra.startedAt }),
        ...(extra?.completedAt != null && { completedAt: extra.completedAt }),
        ...(extra?.lastError != null && { lastError: extra.lastError }),
      },
    });
  }

  async findLatestByAnnouncementId(announcementId: number) {
    return prisma.announcementPushJob.findFirst({
      where: { announcementId },
      orderBy: { createdAt: "desc" },
    });
  }
}
