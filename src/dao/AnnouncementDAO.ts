import { prisma } from "../db/prisma.js";
import type { Announcement } from "@prisma/client";
import { STUDENT_VISIBLE_AUDIENCES } from "../utils/constants/announcements.js";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

export interface AnnouncementWithCreator {
  id: number;
  organizationId: string;
  createdByUserId: string | null;
  title: string;
  content: string;
  targetAudience: string;
  createdAt: Date;
  updatedAt: Date;
  createdByUser: { id: string; firstName: string; lastName: string } | null;
}

export interface PaginatedAnnouncementsResult {
  data: AnnouncementWithCreator[];
  total: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export class AnnouncementDAO {
  async findMany(organizationId?: string, order: "asc" | "desc" = "desc") {
    return prisma.announcement.findMany({
      where: {
        ...(organizationId && { organizationId }),
      },
      orderBy: { createdAt: order },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async findManyPaginated(
    options: {
      organizationId?: string;
      targetAudience?: string;
      targetAudiences?: string[];
      pageNumber: number;
      pageSize: number;
    }
  ): Promise<PaginatedAnnouncementsResult> {
    const { organizationId, targetAudience, targetAudiences, pageNumber, pageSize } = options;
    const take = Math.min(Math.max(1, pageSize || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const skip = (Math.max(1, pageNumber) - 1) * take;

    const where = {
      ...(organizationId && { organizationId }),
      ...(targetAudience && { targetAudience }),
      ...(targetAudiences &&
        targetAudiences.length > 0 && { targetAudience: { in: targetAudiences } }),
    };

    const [data, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          createdByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }) as Promise<AnnouncementWithCreator[]>,
      prisma.announcement.count({ where }),
    ]);

    return {
      data,
      total,
      pageNumber: Math.max(1, pageNumber),
      pageSize: take,
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  /**
   * Announcements visible to a student: org-scoped, audience includes students.
   * Either no hostel mapping (org-wide) or mapping includes one of the student's hostel IDs.
   */
  async findManyForStudentPaginated(
    organizationId: string,
    hostelIds: number[],
    pageNumber: number,
    pageSize: number
  ): Promise<PaginatedAnnouncementsResult> {
    const take = Math.min(Math.max(1, pageSize || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const skip = (Math.max(1, pageNumber) - 1) * take;

    const where = {
      organizationId,
      targetAudience: { in: STUDENT_VISIBLE_AUDIENCES },
      OR: [
        { hostelAnnouncementMappings: { none: {} } },
        ...(hostelIds.length > 0
          ? [{ hostelAnnouncementMappings: { some: { hostelId: { in: hostelIds } } } }]
          : []),
      ],
    };

    const [data, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          createdByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    return {
      data: data as AnnouncementWithCreator[],
      total,
      pageNumber: Math.max(1, pageNumber),
      pageSize: take,
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  async findManyByTargetAudience(targetAudience: string | string[], organizationId?: string) {
    const audiences = Array.isArray(targetAudience) ? targetAudience : [targetAudience];
    return prisma.announcement.findMany({
      where: {
        targetAudience: { in: audiences },
        ...(organizationId && { organizationId }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async findById(id: number) {
    return prisma.announcement.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async create(data: {
    organizationId: string;
    createdByUserId?: string | null;
    title: string;
    content: string;
    targetAudience: string;
  }) {
    return prisma.announcement.create({
      data: {
        organizationId: data.organizationId,
        createdByUserId: data.createdByUserId ?? undefined,
        title: data.title,
        content: data.content,
        targetAudience: data.targetAudience,
      },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async update(
    id: number,
    data: { title?: string; content?: string; targetAudience?: string }
  ): Promise<Announcement> {
    return prisma.announcement.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<Announcement> {
    return prisma.announcement.delete({
      where: { id },
    });
  }
}
