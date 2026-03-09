import { prisma } from "../db/prisma.js";

/**
 * Mess photo is stored on Hostel (messPhotoUrl, messPhotoUpdatedAt).
 * One photo per hostel; replaceable.
 */
export class MessDAO {
  async getByHostelId(hostelId: number) {
    return prisma.hostel.findUnique({
      where: { id: hostelId },
      select: {
        id: true,
        messPhotoUrl: true,
        messPhotoUpdatedAt: true,
      },
    });
  }

  /**
   * Get first hostel that has a mess photo (for backward compat when no hostelId in API).
   */
  async getFirstWithPhoto() {
    return prisma.hostel.findFirst({
      where: { messPhotoUrl: { not: null } },
      select: {
        id: true,
        messPhotoUrl: true,
        messPhotoUpdatedAt: true,
      },
    });
  }

  async updatePhoto(hostelId: number, messPhotoUrl: string) {
    return prisma.hostel.update({
      where: { id: hostelId },
      data: {
        messPhotoUrl,
        messPhotoUpdatedAt: new Date(),
      },
    });
  }

  async clearPhoto(hostelId: number) {
    return prisma.hostel.update({
      where: { id: hostelId },
      data: {
        messPhotoUrl: null,
        messPhotoUpdatedAt: null,
      },
    });
  }
}
