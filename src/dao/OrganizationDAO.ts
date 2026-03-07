import { prisma } from "../db/prisma.js";

export class OrganizationDAO {
  async findById(id: string) {
    return prisma.organization.findUnique({
      where: { id },
    });
  }

  async findActiveMembership(organizationId: string, userId: string, roles: string[]) {
    return prisma.userOrgRoleMapping.findFirst({
      where: {
        organizationId,
        userId,
        role: { in: roles },
        status: "active",
      },
    });
  }

  /** Get first user-org-role mapping for a user (e.g. to resolve organizationId). */
  async findFirstByUserId(userId: string) {
    return prisma.userOrgRoleMapping.findFirst({
      where: { userId, status: "active" },
      include: { organization: true },
    });
  }
}
