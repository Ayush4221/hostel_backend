import { prisma } from "../db/prisma.js";

export class AnnouncementReadDAO {
  /** Mark announcements as read for a user (idempotent). */
  async markAsRead(userId: string, announcementIds: number[]): Promise<void> {
    if (announcementIds.length === 0) return;
    await prisma.announcementRead.createMany({
      data: announcementIds.map((announcementId) => ({ userId, announcementId })),
      skipDuplicates: true,
    });
  }

  /** Count unread announcements for user in org with optional audience filter. */
  async countUnread(
    userId: string,
    organizationId: string,
    targetAudiences?: string[] | null
  ): Promise<number> {
    const where = {
      organizationId,
      ...(targetAudiences &&
        targetAudiences.length > 0 && { targetAudience: { in: targetAudiences } }),
      NOT: { announcementReads: { some: { userId } } },
    };
    return prisma.announcement.count({ where });
  }

  /** Count unread for student: org + student-visible audiences + hostel filter. */
  async countUnreadForStudent(
    userId: string,
    organizationId: string,
    hostelIds: number[],
    studentAudiences: string[]
  ): Promise<number> {
    const where = {
      organizationId,
      targetAudience: { in: studentAudiences },
      OR: [
        { hostelAnnouncementMappings: { none: {} } },
        ...(hostelIds.length > 0
          ? [{ hostelAnnouncementMappings: { some: { hostelId: { in: hostelIds } } } }]
          : []),
      ],
      NOT: { announcementReads: { some: { userId } } },
    };
    return prisma.announcement.count({ where });
  }
}
