import { prisma } from "../db/prisma.js";
import type { ParentStudentMapping } from "@prisma/client";

export class ParentStudentMappingDAO {
  async create(parentUserId: string, studentUserId: string, relationshipType?: string | null): Promise<ParentStudentMapping> {
    return prisma.parentStudentMapping.create({
      data: {
        parentUserId,
        studentUserId,
        relationshipType: relationshipType ?? undefined,
      },
    });
  }

  async deleteByStudentAndParent(studentUserId: string, parentUserId: string): Promise<ParentStudentMapping> {
    return prisma.parentStudentMapping.delete({
      where: {
        parentUserId_studentUserId: { parentUserId, studentUserId },
      },
    });
  }

  async findParentByStudentId(studentUserId: string) {
    return prisma.parentStudentMapping.findFirst({
      where: { studentUserId },
      include: {
        parent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async findStudentsByParentId(parentUserId: string) {
    return prisma.parentStudentMapping.findMany({
      where: { parentUserId },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async exists(parentUserId: string, studentUserId: string): Promise<boolean> {
    const link = await prisma.parentStudentMapping.findUnique({
      where: {
        parentUserId_studentUserId: { parentUserId, studentUserId },
      },
    });
    return link != null;
  }
}
