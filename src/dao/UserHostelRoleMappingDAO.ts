import { prisma } from "../db/prisma.js";

export class UserHostelRoleMappingDAO {
  async findFirstByUserId(userId: string, includeRoom = false) {
    return prisma.userHostelRoleMapping.findFirst({
      where: { userId },
      include: { hostel: true, ...(includeRoom && { room: true }) },
    });
  }

  /** Hostel IDs the user is assigned to (e.g. for student hostel-specific filtering). */
  async findHostelIdsByUserId(userId: string): Promise<number[]> {
    const mappings = await prisma.userHostelRoleMapping.findMany({
      where: { userId },
      select: { hostelId: true },
    });
    return mappings.map((m) => m.hostelId);
  }

  /** All hostel assignments for the given user IDs (e.g. staff). Returns hostel id and name. */
  async findManyByUserIds(userIds: string[]) {
    if (userIds.length === 0) return [];
    return prisma.userHostelRoleMapping.findMany({
      where: { userId: { in: userIds } },
      include: {
        hostel: { select: { id: true, name: true } },
      },
    });
  }

  async findManyByHostelId(hostelId: number) {
    return prisma.userHostelRoleMapping.findMany({
      where: { hostelId },
      include: { user: true, room: true },
    });
  }

  async updateRoomId(id: number, roomId: number | null) {
    return prisma.userHostelRoleMapping.update({
      where: { id },
      data: { roomId },
    });
  }

  async findByHostelAndUser(hostelId: number, userId: string) {
    return prisma.userHostelRoleMapping.findUnique({
      where: {
        hostelId_userId: { hostelId, userId },
      },
      include: { room: true },
    });
  }

  async findManyByHostelIdAndRoomId(hostelId: number, roomId: number) {
    return prisma.userHostelRoleMapping.findMany({
      where: { hostelId, roomId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        room: true,
      },
    });
  }

  async findManyByHostelIdAndRoles(hostelId: number, roles: string[]) {
    return prisma.userHostelRoleMapping.findMany({
      where: { hostelId, role: { in: roles } },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }

  async create(data: {
    hostelId: number;
    organizationId: string;
    userId: string;
    role: string;
  }) {
    return prisma.userHostelRoleMapping.create({
      data: {
        hostelId: data.hostelId,
        organizationId: data.organizationId,
        userId: data.userId,
        role: data.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }

  async deleteByHostelAndUser(hostelId: number, userId: string) {
    return prisma.userHostelRoleMapping.deleteMany({
      where: { hostelId, userId },
    });
  }
}
