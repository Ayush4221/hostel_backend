import { prisma } from "../db/prisma.js";

export class HostelAnnouncementMappingDAO {
  /** Add one or more hostel mappings for an announcement. 0 rows = org-wide; 1+ = those hostels only. */
  async createMany(announcementId: number, hostelIds: number[]) {
    if (hostelIds.length === 0) return { count: 0 };
    return prisma.hostelAnnouncementMapping.createMany({
      data: hostelIds.map((hostelId) => ({ announcementId, hostelId })),
    });
  }

  /** Get hostel IDs for an announcement. Empty = org-wide. */
  async findHostelIdsByAnnouncementId(announcementId: number): Promise<number[]> {
    const rows = await prisma.hostelAnnouncementMapping.findMany({
      where: { announcementId },
      select: { hostelId: true },
    });
    return rows.map((r) => r.hostelId);
  }

  /** Delete all mappings for an announcement (e.g. on update of scope). */
  async deleteByAnnouncementId(announcementId: number) {
    return prisma.hostelAnnouncementMapping.deleteMany({
      where: { announcementId },
    });
  }

  /** Replace mappings: delete existing, then create new. */
  async replace(announcementId: number, hostelIds: number[]) {
    await this.deleteByAnnouncementId(announcementId);
    return this.createMany(announcementId, hostelIds);
  }
}
