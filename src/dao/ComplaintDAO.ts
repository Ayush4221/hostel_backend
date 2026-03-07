import { prisma } from "../db/prisma.js";
import type { Complaint } from "@prisma/client";

export class ComplaintDAO {
  async findMany(skip = 0, take = 10) {
    return prisma.complaint.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        studentUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async count(): Promise<number> {
    return prisma.complaint.count();
  }

  async findById(id: number): Promise<Complaint | null> {
    return prisma.complaint.findUnique({
      where: { id },
    });
  }

  async findByIdAndStudent(id: number, studentUserId: string): Promise<Complaint | null> {
    return prisma.complaint.findFirst({
      where: { id, studentUserId },
    });
  }

  async findManyByStudentUserId(studentUserId: string): Promise<Complaint[]> {
    return prisma.complaint.findMany({
      where: { studentUserId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: {
    organizationId: string;
    hostelId: number;
    studentUserId: string;
    description: string;
    type: string;
    status?: string;
    attachmentUrl?: string | null;
    createdByUserId?: string | null;
  }): Promise<Complaint> {
    return prisma.complaint.create({
      data: {
        organizationId: data.organizationId,
        hostelId: data.hostelId,
        studentUserId: data.studentUserId,
        description: data.description,
        type: data.type,
        status: data.status ?? "Pending",
        attachmentUrl: data.attachmentUrl ?? undefined,
        createdByUserId: data.createdByUserId ?? undefined,
      },
    });
  }

  async update(id: number, data: { description?: string; status?: string; type?: string }): Promise<Complaint> {
    return prisma.complaint.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<Complaint> {
    return prisma.complaint.delete({
      where: { id },
    });
  }

  async deleteManyByStudentUserId(studentUserId: string): Promise<{ count: number }> {
    return prisma.complaint.deleteMany({
      where: { studentUserId },
    });
  }
}
