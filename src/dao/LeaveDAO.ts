import { prisma } from "../db/prisma.js";
import type { Leave } from "@prisma/client";

const leaveInclude = {
  studentUser: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  parentReviewer: {
    select: { id: true, firstName: true, lastName: true },
  },
  staffReviewer: {
    select: { id: true, firstName: true, lastName: true },
  },
};

export class LeaveDAO {
  async findMany(status?: string) {
    return prisma.leave.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: leaveInclude,
    });
  }

  async findById(id: number) {
    return prisma.leave.findUnique({
      where: { id },
      include: leaveInclude,
    });
  }

  async findManyByStudentId(studentUserId: string) {
    return prisma.leave.findMany({
      where: { studentUserId },
      orderBy: { createdAt: "desc" },
      include: leaveInclude,
    });
  }

  async findByIdAndStudentUserId(id: number, studentUserId: string) {
    return prisma.leave.findFirst({
      where: { id, studentUserId },
      include: leaveInclude,
    });
  }

  async findManyByStudentUserIds(studentUserIds: string[]) {
    return prisma.leave.findMany({
      where: { studentUserId: { in: studentUserIds } },
      orderBy: { createdAt: "desc" },
      include: leaveInclude,
    });
  }

  async findOverlapping(
    studentUserId: string,
    startDate: Date,
    endDate: Date,
    excludeRejected: boolean
  ) {
    return prisma.leave.findFirst({
      where: {
        studentUserId,
        ...(excludeRejected && { status: { not: "rejected" } }),
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });
  }

  async create(data: {
    organizationId: string;
    hostelId: number;
    studentUserId: string;
    startDate: Date;
    endDate: Date;
    reason: string;
    leaveType?: string | null;
    contactNumber?: string | null;
    parentContact?: string | null;
    address?: string | null;
  }): Promise<Leave> {
    return prisma.leave.create({
      data: {
        organizationId: data.organizationId,
        hostelId: data.hostelId,
        studentUserId: data.studentUserId,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        leaveType: data.leaveType ?? "regular",
        contactNumber: data.contactNumber ?? undefined,
        parentContact: data.parentContact ?? undefined,
        address: data.address ?? undefined,
      },
    });
  }

  async delete(id: number): Promise<Leave> {
    return prisma.leave.delete({
      where: { id },
    });
  }

  async deleteManyByStudentUserId(studentUserId: string): Promise<{ count: number }> {
    return prisma.leave.deleteMany({
      where: { studentUserId },
    });
  }

  async updateReview(
    id: number,
    data: {
      status: string;
      staffReviewStatus: string;
      staffReviewRemarks: string | null;
      staffReviewedBy: string | null;
      staffReviewedAt: Date | null;
      parentReviewStatus: string | null;
      parentReviewRemarks: string | null;
      parentReviewedBy: string | null;
      parentReviewedAt: Date | null;
    }
  ): Promise<Leave> {
    return prisma.leave.update({
      where: { id },
      data: {
        status: data.status,
        staffReviewStatus: data.staffReviewStatus,
        staffReviewRemarks: data.staffReviewRemarks,
        staffReviewedBy: data.staffReviewedBy,
        staffReviewedAt: data.staffReviewedAt,
        parentReviewStatus: data.parentReviewStatus,
        parentReviewRemarks: data.parentReviewRemarks,
        parentReviewedBy: data.parentReviewedBy,
        parentReviewedAt: data.parentReviewedAt,
      },
    });
  }
}
