import { prisma } from "../db/prisma.js";

export class HostelDAO {
  async findById(id: number) {
    return prisma.hostel.findUnique({
      where: { id },
    });
  }

  async findByIdWithStudentCount(id: number) {
    const hostel = await prisma.hostel.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        name: true,
        code: true,
        address: true,
        city: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userHostelRoleMappings: {
          where: { role: "student" },
          select: { id: true },
        },
      },
    });
    if (!hostel) return null;
    const memberships = (hostel as { userHostelRoleMappings: { id: number }[] }).userHostelRoleMappings;
    return {
      id: hostel.id,
      organizationId: hostel.organizationId,
      name: hostel.name,
      code: hostel.code,
      address: hostel.address ?? undefined,
      city: hostel.city ?? undefined,
      isActive: hostel.isActive,
      createdAt: hostel.createdAt,
      updatedAt: hostel.updatedAt,
      studentCount: memberships.length,
    };
  }

  async findFirst() {
    return prisma.hostel.findFirst();
  }

  async findByOrgAndCode(organizationId: string, code: string) {
    return prisma.hostel.findUnique({
      where: {
        organizationId_code: { organizationId, code },
      },
    });
  }

  async create(data: {
    organizationId: string;
    name: string;
    code: string;
    address?: string | null;
    city?: string | null;
    isActive?: boolean;
  }) {
    return prisma.hostel.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        code: data.code,
        address: data.address ?? null,
        city: data.city ?? null,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Find hostels optionally filtered by organization, with student membership count.
   */
  async findManyWithStudentCount(organizationId?: string) {
    const hostels = await prisma.hostel.findMany({
      where: organizationId ? { organizationId } : undefined,
      select: {
        id: true,
        name: true,
        userHostelRoleMappings: {
          where: { role: "student" },
          select: { id: true },
        },
      },
    });
    return hostels.map((h) => ({
      id: h.id,
      name: h.name,
      studentCount: h.userHostelRoleMappings.length,
    }));
  }

  /**
   * Paginated list with optional organization and search. searchText filters name/code (case-insensitive).
   */
  async findManyWithStudentCountPaginated(
    options: {
      organizationId?: string;
      pageNumber: number;
      pageSize: number;
      searchText?: string;
    }
  ) {
    const { organizationId, pageNumber, pageSize, searchText } = options;
    const skip = (Math.max(1, pageNumber) - 1) * Math.max(1, pageSize);
    const take = Math.min(100, Math.max(1, pageSize));

    type Where = {
      organizationId?: string;
      OR?: Array<{ name?: { contains: string; mode: "insensitive" }; code?: { contains: string; mode: "insensitive" } }>;
    };
    const where: Where = organizationId ? { organizationId } : {};
    if (searchText?.trim()) {
      const term = searchText.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { code: { contains: term, mode: "insensitive" } },
      ];
    }

    const [hostels, total] = await Promise.all([
      prisma.hostel.findMany({
        where,
        skip,
        take,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          userHostelRoleMappings: {
            where: { role: "student" },
            select: { id: true },
          },
        },
      }),
      prisma.hostel.count({ where }),
    ]);

    const data = hostels.map((h) => ({
      id: h.id,
      name: h.name,
      studentCount: h.userHostelRoleMappings.length,
    }));

    const totalPages = Math.ceil(total / take);
    return {
      data,
      total,
      pageNumber: Math.max(1, pageNumber),
      pageSize: take,
      totalPages,
    };
  }

  async update(
    id: number,
    data: {
      name?: string;
      code?: string;
      address?: string | null;
      city?: string | null;
      isActive?: boolean;
    }
  ) {
    return prisma.hostel.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async delete(id: number) {
    return prisma.hostel.delete({
      where: { id },
    });
  }
}
