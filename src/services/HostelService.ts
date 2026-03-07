import { HostelDAO } from "../dao/HostelDAO.js";
import { OrganizationDAO } from "../dao/OrganizationDAO.js";
import { UserDAO } from "../dao/UserDAO.js";
import { UserHostelRoleMappingDAO } from "../dao/UserHostelRoleMappingDAO.js";
import {
  ORG_MEMBERSHIP_ROLE_ORG_ADMIN,
  ORG_MEMBERSHIP_ROLE_ORG_OWNER,
} from "../utils/constants/index.js";
import { ROLE_CODE_ADMIN, ROLE_CODE_STAFF } from "../utils/constants/roles.js";

const hostelDAO = new HostelDAO();
const organizationDAO = new OrganizationDAO();
const userDAO = new UserDAO();
const userHostelRoleMappingDAO = new UserHostelRoleMappingDAO();

const ASSIGNABLE_ROLES = [ROLE_CODE_ADMIN, ROLE_CODE_STAFF] as const;

export class HostelService {
  async getAllHostelsPaginated(
    organizationId: string | undefined,
    options: { pageNumber: number; pageSize: number; searchText?: string }
  ) {
    const { pageNumber, pageSize, searchText } = options;
    const result = await hostelDAO.findManyWithStudentCountPaginated({
      organizationId,
      pageNumber,
      pageSize,
      searchText,
    });
    return { data: result, status: 200 };
  }

  async getHostelById(id: number) {
    const hostel = await hostelDAO.findByIdWithStudentCount(id);
    if (!hostel) return { error: "Hostel not found", status: 404 };
    return { data: hostel, status: 200 };
  }

  async createHostel(
    userId: string,
    body: { organizationId?: string; name: string; code: string; address?: string; city?: string },
    isSuperAdmin: boolean,
    organizationIdFromToken?: string
  ) {
    if (!body.name?.trim() || !body.code?.trim()) {
      return { error: "name and code are required", status: 400 };
    }
    const organizationId = isSuperAdmin ? body.organizationId : (organizationIdFromToken ?? body.organizationId);
    if (!organizationId) {
      return {
        error: isSuperAdmin
          ? "organizationId is required for super admin"
          : "Organization context required (use token with org or send organizationId)",
        status: 400,
      };
    }
    if (!isSuperAdmin) {
      const membership = await organizationDAO.findActiveMembership(
        organizationId,
        userId,
        [ORG_MEMBERSHIP_ROLE_ORG_ADMIN, ORG_MEMBERSHIP_ROLE_ORG_OWNER]
      );
      if (!membership) return { error: "You are not an admin for this organization", status: 403 };
    }
    const org = await organizationDAO.findById(organizationId);
    if (!org) return { error: "Organization not found", status: 404 };
    const existing = await hostelDAO.findByOrgAndCode(organizationId, body.code.trim());
    if (existing) return { error: "A hostel with this code already exists in this organization", status: 400 };
    const hostel = await hostelDAO.create({
      organizationId,
      name: body.name.trim(),
      code: body.code.trim(),
      address: body.address?.trim() ?? null,
      city: body.city?.trim() ?? null,
      isActive: true,
    });
    return {
      data: {
        id: hostel.id,
        organizationId: hostel.organizationId,
        name: hostel.name,
        code: hostel.code,
        address: hostel.address ?? undefined,
        city: hostel.city ?? undefined,
        isActive: hostel.isActive,
      },
      status: 201,
    };
  }

  async updateHostel(
    id: number,
    userId: string,
    body: { name?: string; code?: string; address?: string; city?: string; isActive?: boolean },
    isSuperAdmin: boolean,
    organizationIdFromToken?: string
  ) {
    const hostel = await hostelDAO.findById(id);
    if (!hostel) return { error: "Hostel not found", status: 404 };
    if (!isSuperAdmin) {
      const membership = await organizationDAO.findActiveMembership(
        hostel.organizationId,
        userId,
        [ORG_MEMBERSHIP_ROLE_ORG_ADMIN, ORG_MEMBERSHIP_ROLE_ORG_OWNER]
      );
      if (!membership) return { error: "You are not an admin for this hostel's organization", status: 403 };
    }
    if (body.code !== undefined && body.code.trim() !== hostel.code) {
      const existing = await hostelDAO.findByOrgAndCode(hostel.organizationId, body.code.trim());
      if (existing) return { error: "A hostel with this code already exists in this organization", status: 400 };
    }
    const updateData: { name?: string; code?: string; address?: string | null; city?: string | null; isActive?: boolean } = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.code !== undefined) updateData.code = body.code.trim();
    if (body.address !== undefined) updateData.address = body.address;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    const updated = await hostelDAO.update(id, updateData);
    return {
      data: {
        id: updated.id,
        organizationId: updated.organizationId,
        name: updated.name,
        code: updated.code,
        address: updated.address ?? undefined,
        city: updated.city ?? undefined,
        isActive: updated.isActive,
      },
      status: 200,
    };
  }

  async deleteHostel(
    id: number,
    userId: string,
    isSuperAdmin: boolean,
    organizationIdFromToken?: string
  ) {
    const hostel = await hostelDAO.findById(id);
    if (!hostel) return { error: "Hostel not found", status: 404 };
    if (!isSuperAdmin) {
      const membership = await organizationDAO.findActiveMembership(
        hostel.organizationId,
        userId,
        [ORG_MEMBERSHIP_ROLE_ORG_ADMIN, ORG_MEMBERSHIP_ROLE_ORG_OWNER]
      );
      if (!membership) return { error: "You are not an admin for this hostel's organization", status: 403 };
    }
    await hostelDAO.delete(id);
    return { status: 200 };
  }

  async assignUserToHostel(
    hostelId: number,
    body: { userId: string; role: string },
    callerUserId: string,
    isSuperAdmin: boolean,
    organizationIdFromToken?: string
  ) {
    const { userId, role } = body;
    if (!userId?.trim() || !role?.trim()) {
      return { error: "userId and role are required", status: 400 };
    }
    if (!ASSIGNABLE_ROLES.includes(role as (typeof ASSIGNABLE_ROLES)[number])) {
      return { error: "role must be admin or staff", status: 400 };
    }
    const hostel = await hostelDAO.findById(hostelId);
    if (!hostel) return { error: "Hostel not found", status: 404 };
    if (!isSuperAdmin) {
      const membership = await organizationDAO.findActiveMembership(
        hostel.organizationId,
        callerUserId,
        [ORG_MEMBERSHIP_ROLE_ORG_ADMIN, ORG_MEMBERSHIP_ROLE_ORG_OWNER]
      );
      if (!membership) return { error: "You are not an admin for this hostel's organization", status: 403 };
    }
    const user = await userDAO.findById(userId);
    if (!user) return { error: "User not found", status: 404 };
    if (!user.role || !ASSIGNABLE_ROLES.includes(user.role as (typeof ASSIGNABLE_ROLES)[number])) {
      return { error: "User must have role admin or staff to be assigned to a hostel", status: 400 };
    }
    const existing = await userHostelRoleMappingDAO.findByHostelAndUser(hostelId, userId);
    if (existing) return { error: "User is already assigned to this hostel", status: 400 };
    const mapping = await userHostelRoleMappingDAO.create({
      hostelId,
      organizationId: hostel.organizationId,
      userId,
      role,
    });
    return {
      data: {
        id: mapping.id,
        hostelId: mapping.hostelId,
        userId: mapping.userId,
        role: mapping.role,
        user: mapping.user,
      },
      status: 201,
    };
  }

  async getHostelUsers(hostelId: number, callerUserId: string, isSuperAdmin: boolean, organizationIdFromToken?: string) {
    const hostel = await hostelDAO.findById(hostelId);
    if (!hostel) return { error: "Hostel not found", status: 404 };
    if (!isSuperAdmin) {
      const membership = await organizationDAO.findActiveMembership(
        hostel.organizationId,
        callerUserId,
        [ORG_MEMBERSHIP_ROLE_ORG_ADMIN, ORG_MEMBERSHIP_ROLE_ORG_OWNER]
      );
      if (!membership) return { error: "You are not an admin for this hostel's organization", status: 403 };
    }
    const mappings = await userHostelRoleMappingDAO.findManyByHostelIdAndRoles(hostelId, [...ASSIGNABLE_ROLES]);
    const data = mappings.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      user: m.user,
    }));
    return { data, status: 200 };
  }

  async unassignUserFromHostel(
    hostelId: number,
    userId: string,
    callerUserId: string,
    isSuperAdmin: boolean,
    organizationIdFromToken?: string
  ) {
    const hostel = await hostelDAO.findById(hostelId);
    if (!hostel) return { error: "Hostel not found", status: 404 };
    if (!isSuperAdmin) {
      const membership = await organizationDAO.findActiveMembership(
        hostel.organizationId,
        callerUserId,
        [ORG_MEMBERSHIP_ROLE_ORG_ADMIN, ORG_MEMBERSHIP_ROLE_ORG_OWNER]
      );
      if (!membership) return { error: "You are not an admin for this hostel's organization", status: 403 };
    }
    await userHostelRoleMappingDAO.deleteByHostelAndUser(hostelId, userId);
    return { status: 200 };
  }
}
