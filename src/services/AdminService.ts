import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ROLE_ID_ADMIN, ROLE_ID_PARENT, ROLE_ID_STAFF, ROLE_ID_STUDENT } from "../config/roles.js";
import {
  ORG_MEMBERSHIP_ROLE_ORG_ADMIN,
  ORG_MEMBERSHIP_ROLE_ORG_OWNER,
  ROLE_CODE_ADMIN,
  ROLE_CODE_PARENT,
  ROLE_CODE_STAFF,
  ROLE_CODE_STUDENT,
} from "../utils/constants/index.js";
import { UserDAO } from "../dao/UserDAO.js";
import { UserHostelRoleMappingDAO } from "../dao/UserHostelRoleMappingDAO.js";
import { LeaveDAO } from "../dao/LeaveDAO.js";
import { ComplaintDAO } from "../dao/ComplaintDAO.js";
import { ParentStudentMappingDAO } from "../dao/ParentStudentMappingDAO.js";
import { HostelDAO } from "../dao/HostelDAO.js";
import { OrganizationDAO } from "../dao/OrganizationDAO.js";

const userDAO = new UserDAO();
const userHostelRoleMappingDAO = new UserHostelRoleMappingDAO();
const leaveDAO = new LeaveDAO();
const complaintDAO = new ComplaintDAO();
const parentStudentMappingDAO = new ParentStudentMappingDAO();
const hostelDAO = new HostelDAO();
const organizationDAO = new OrganizationDAO();

function sanitizeUser(user: { id: string; email: string; firstName: string; lastName: string; role?: string | null }) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role ?? undefined,
  };
}

export class AdminService {
  async createAdminUser(body: { email: string; password: string; firstName: string; lastName: string }) {
    const email = String(body.email).trim().toLowerCase();
    const existing = await userDAO.findByEmail(email);
    if (existing) return { error: "User already exists", status: 400 };
    const passwordHash = await bcrypt.hash(body.password, 10);
    const jwtSecret = crypto.randomBytes(32).toString("hex");
    const admin = await userDAO.create({
      email,
      passwordHash,
      firstName: String(body.firstName),
      lastName: String(body.lastName),
      role: ROLE_CODE_ADMIN,
      roleId: ROLE_ID_ADMIN,
      jwtSecret,
    });
    return { admin: sanitizeUser(admin), status: 201 };
  }

  async addHostel(
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
        error: isSuperAdmin ? "organizationId is required for super admin" : "Organization context required (use token with org or send organizationId)",
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
      hostel: {
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

  /**
   * Get all hostels for admin. Super admin sees all; org admin sees only hostels in their organization.
   * Returns id, name, and current student count per hostel.
   */
  async getAllHostels(organizationId?: string) {
    const hostels = await hostelDAO.findManyWithStudentCount(organizationId);
    return { data: hostels, status: 200 };
  }

  async assignParentToStudent(studentId: string, parentId: string) {
    const student = await userDAO.findByRole(studentId, ROLE_CODE_STUDENT);
    const parent = await userDAO.findByRole(parentId, ROLE_CODE_PARENT);
    if (!student || !parent) return { error: "Student or parent not found or invalid roles", status: 404 };
    const exists = await parentStudentMappingDAO.exists(parentId, studentId);
    if (exists) return { error: "Student already has a parent assigned", status: 400 };
    await parentStudentMappingDAO.create(parentId, studentId);
    return {
      data: {
        student: { id: student.id, firstName: student.firstName, lastName: student.lastName, email: student.email },
        parent: { id: parent.id, firstName: parent.firstName, lastName: parent.lastName, email: parent.email },
      },
      status: 200,
    };
  }

  async removeParentFromStudent(studentId: string) {
    const student = await userDAO.findByRole(studentId, ROLE_CODE_STUDENT);
    if (!student) return { error: "Student not found", status: 404 };
    const link = await parentStudentMappingDAO.findParentByStudentId(studentId);
    if (!link) return { error: "Student doesn't have a parent assigned", status: 400 };
    await parentStudentMappingDAO.deleteByStudentAndParent(studentId, link.parentUserId);
    return { status: 200 };
  }

  async getStudentParentInfo(studentId: string) {
    const student = await userDAO.findByRole(studentId, ROLE_CODE_STUDENT);
    if (!student) return { error: "Student not found", status: 404 };
    const link = await parentStudentMappingDAO.findParentByStudentId(studentId);
    const parent = link?.parent ?? null;
    return {
      data: {
        student: { id: student.id, name: `${student.firstName} ${student.lastName}`, email: student.email },
        parent: parent ? { id: parent.id, firstName: parent.firstName, lastName: parent.lastName, email: parent.email } : null,
      },
      status: 200,
    };
  }

  async getAllStudents() {
    const users = await userDAO.findManyByRole(ROLE_CODE_STUDENT);
    const withParent = await Promise.all(
      users.map(async (u) => {
        const link = await parentStudentMappingDAO.findParentByStudentId(u.id);
        return {
          ...u,
          parentId: link?.parent ?? null,
        };
      })
    );
    return { data: withParent, status: 200 };
  }

  async getAllParents() {
    const users = await userDAO.findManyByRole(ROLE_CODE_PARENT);
    const withChildren = await Promise.all(
      users.map(async (u) => {
        const links = await parentStudentMappingDAO.findStudentsByParentId(u.id);
        return {
          ...u,
          children: links.map((l) => l.student),
        };
      })
    );
    return { data: withChildren, status: 200 };
  }

  async createParent(body: { email: string; password: string; firstName: string; lastName: string }) {
    const email = String(body.email).trim().toLowerCase();
    const existing = await userDAO.findByEmail(email);
    if (existing) return { error: "Parent with this email already exists", status: 400 };
    const passwordHash = await bcrypt.hash(body.password, 10);
    const jwtSecret = crypto.randomBytes(32).toString("hex");
    const parent = await userDAO.create({
      email,
      passwordHash,
      firstName: body.firstName,
      lastName: body.lastName,
      role: ROLE_CODE_PARENT,
      roleId: ROLE_ID_PARENT,
      jwtSecret,
    });
    return {
      data: { id: parent.id, email: parent.email, firstName: parent.firstName, lastName: parent.lastName },
      status: 201,
    };
  }

  async updateParent(id: string, body: { email?: string; firstName?: string; lastName?: string }) {
    const parent = await userDAO.findByRole(id, ROLE_CODE_PARENT);
    if (!parent) return { error: "Parent not found", status: 404 };
    const updated = await userDAO.update(id, {
      email: body.email !== undefined ? String(body.email).trim().toLowerCase() : undefined,
      firstName: body.firstName,
      lastName: body.lastName,
    });
    return { data: sanitizeUser(updated), status: 200 };
  }

  async deleteParent(id: string) {
    const parent = await userDAO.findByRole(id, ROLE_CODE_PARENT);
    if (!parent) return { error: "Parent not found", status: 404 };
    const links = await parentStudentMappingDAO.findStudentsByParentId(id);
    for (const link of links) {
      await parentStudentMappingDAO.deleteByStudentAndParent(link.studentUserId, id);
    }
    await userDAO.delete(id);
    return { status: 200 };
  }

  async getStaff() {
    const staff = await userDAO.findManyByRole(ROLE_CODE_STAFF);
    return { data: staff, status: 200 };
  }

  async getStaffPaginated(pageNumber: number, pageSize: number, includeAssignedHostels = false) {
    const skip = (Math.max(1, pageNumber) - 1) * Math.max(1, pageSize);
    const take = Math.min(100, Math.max(1, pageSize));
    const [data, total] = await Promise.all([
      userDAO.findManyByRolePaginated(ROLE_CODE_STAFF, skip, take),
      userDAO.countByRole(ROLE_CODE_STAFF),
    ]);
    if (includeAssignedHostels && data.length > 0) {
      const userIds = data.map((u) => u.id);
      const mappings = await userHostelRoleMappingDAO.findManyByUserIds(userIds);
      const hostelsByUserId = new Map<string, { id: number; name: string }[]>();
      for (const m of mappings) {
        const list = hostelsByUserId.get(m.userId) ?? [];
        list.push({ id: (m.hostel as { id: number; name: string }).id, name: (m.hostel as { id: number; name: string }).name });
        hostelsByUserId.set(m.userId, list);
      }
      const dataWithHostels = data.map((u) => ({
        ...u,
        assignedHostels: hostelsByUserId.get(u.id) ?? [],
      }));
      const totalPages = Math.ceil(total / take);
      return { data: dataWithHostels, total, pageNumber: Math.max(1, pageNumber), pageSize: take, totalPages, status: 200 };
    }
    const totalPages = Math.ceil(total / take);
    return { data, total, pageNumber: Math.max(1, pageNumber), pageSize: take, totalPages, status: 200 };
  }

  async getAllStudentsPaginated(pageNumber: number, pageSize: number) {
    const skip = (Math.max(1, pageNumber) - 1) * Math.max(1, pageSize);
    const take = Math.min(100, Math.max(1, pageSize));
    const [users, total] = await Promise.all([
      userDAO.findManyByRolePaginated(ROLE_CODE_STUDENT, skip, take),
      userDAO.countByRole(ROLE_CODE_STUDENT),
    ]);
    const withParent = await Promise.all(
      users.map(async (u) => {
        const link = await parentStudentMappingDAO.findParentByStudentId(u.id);
        return {
          ...u,
          parentId: link?.parent ?? null,
        };
      })
    );
    const totalPages = Math.ceil(total / take);
    return {
      data: withParent,
      total,
      pageNumber: Math.max(1, pageNumber),
      pageSize: take,
      totalPages,
      status: 200,
    };
  }

  async getAllParentsPaginated(pageNumber: number, pageSize: number) {
    const skip = (Math.max(1, pageNumber) - 1) * Math.max(1, pageSize);
    const take = Math.min(100, Math.max(1, pageSize));
    const [users, total] = await Promise.all([
      userDAO.findManyByRolePaginated(ROLE_CODE_PARENT, skip, take),
      userDAO.countByRole(ROLE_CODE_PARENT),
    ]);
    const withChildren = await Promise.all(
      users.map(async (u) => {
        const links = await parentStudentMappingDAO.findStudentsByParentId(u.id);
        return {
          ...u,
          children: links.map((l) => l.student),
        };
      })
    );
    const totalPages = Math.ceil(total / take);
    return {
      data: withChildren,
      total,
      pageNumber: Math.max(1, pageNumber),
      pageSize: take,
      totalPages,
      status: 200,
    };
  }

  /** Users that can be assigned to hostels (admin and staff). Org-scoped for org-admin. */
  async getAssignableUsers() {
    const users = await userDAO.findManyByRoles([ROLE_CODE_ADMIN, ROLE_CODE_STAFF]);
    return { data: users, status: 200 };
  }

  /** Paginated assignable users (admin + staff) for hostel-admins list. */
  async getAssignableUsersPaginated(pageNumber: number, pageSize: number) {
    const skip = (Math.max(1, pageNumber) - 1) * Math.max(1, pageSize);
    const take = Math.min(100, Math.max(1, pageSize));
    const roles = [ROLE_CODE_ADMIN, ROLE_CODE_STAFF];
    const [data, total] = await Promise.all([
      userDAO.findManyByRolesPaginated(roles, skip, take),
      userDAO.countByRoles(roles),
    ]);
    const totalPages = Math.ceil(total / take);
    return {
      data,
      total,
      pageNumber: Math.max(1, pageNumber),
      pageSize: take,
      totalPages,
      status: 200,
    };
  }

  async createStaff(body: { email: string; password: string; firstName: string; lastName: string }) {
    const email = String(body.email).trim().toLowerCase();
    const existing = await userDAO.findByEmail(email);
    if (existing) return { error: "staff with this email already exists", status: 400 };
    const passwordHash = await bcrypt.hash(body.password, 10);
    const jwtSecret = crypto.randomBytes(32).toString("hex");
    const staff = await userDAO.create({
      email,
      passwordHash,
      firstName: body.firstName,
      lastName: body.lastName,
      role: ROLE_CODE_STAFF,
      roleId: ROLE_ID_STAFF,
      jwtSecret,
    });
    return {
      data: { id: staff.id, email: staff.email, firstName: staff.firstName, lastName: staff.lastName },
      status: 201,
    };
  }

  async deleteStaff(id: string) {
    const staff = await userDAO.findByRole(id, ROLE_CODE_STAFF);
    if (!staff) return { error: "staff not found", status: 404 };
    await userDAO.delete(id);
    return { status: 200 };
  }

  async getLeaves() {
    const leaves = await leaveDAO.findMany();
    return { data: leaves, status: 200 };
  }

  async getLeaveById(id: string) {
    const leaveId = parseInt(id, 10);
    if (Number.isNaN(leaveId) || leaveId < 1) return { error: "Invalid leave ID", status: 400 };
    const leave = await leaveDAO.findById(leaveId);
    if (!leave) return { error: "Leave not found", status: 404 };
    return { data: leave, status: 200 };
  }

  async deleteLeaveById(id: string) {
    const leaveId = parseInt(id, 10);
    if (Number.isNaN(leaveId) || leaveId < 1) return { error: "Invalid leave ID", status: 400 };
    const leave = await leaveDAO.findById(leaveId);
    if (!leave) return { error: "leave not found", status: 404 };
    await leaveDAO.delete(leaveId);
    return { status: 200 };
  }

  async editStudent(id: string, body: { email?: string; firstName?: string; lastName?: string; roomNumber?: string }) {
    const student = await userDAO.findByRole(id, ROLE_CODE_STUDENT);
    if (!student) return { error: "student not found", status: 404 };
    await userDAO.update(id, {
      email: body.email !== undefined ? String(body.email).trim().toLowerCase() : undefined,
      firstName: body.firstName,
      lastName: body.lastName,
    });
    const updated = await userDAO.findById(id);
    return { data: updated ? sanitizeUser(updated) : null, status: 200 };
  }

  async deleteStudent(id: string) {
    const student = await userDAO.findByRole(id, ROLE_CODE_STUDENT);
    if (!student) return { error: "student not found", status: 404 };
    await leaveDAO.deleteManyByStudentUserId(id);
    await complaintDAO.deleteManyByStudentUserId(id);
    const link = await parentStudentMappingDAO.findParentByStudentId(id);
    if (link) await parentStudentMappingDAO.deleteByStudentAndParent(id, link.parentUserId);
    await userDAO.delete(id);
    return { status: 200 };
  }

  async getStudentById(id: string) {
    const student = await userDAO.findById(id);
    if (!student) return { error: "student not found", status: 404 };
    return { data: student, status: 200 };
  }

  async updatePassword(id: string, newPassword: string) {
    const user = await userDAO.findById(id);
    if (!user) return { error: "User not found", status: 404 };
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userDAO.updatePassword(id, passwordHash);
    return { status: 200 };
  }

  async getStaffById(id: string) {
    const staff = await userDAO.findById(id);
    if (!staff) return { error: "staff not found", status: 404 };
    return { data: staff, status: 200 };
  }

  async updateStaff(id: string, body: { email?: string; firstName?: string; lastName?: string }) {
    const staff = await userDAO.findByRole(id, ROLE_CODE_STAFF);
    if (!staff) return { error: "staff not found", status: 404 };
    const updated = await userDAO.update(id, {
      email: body.email !== undefined ? String(body.email).trim().toLowerCase() : undefined,
      firstName: body.firstName,
      lastName: body.lastName,
    });
    return { data: sanitizeUser(updated), status: 200 };
  }

  async getParentById(id: string) {
    const parent = await userDAO.findById(id);
    if (!parent) return { error: "Parent not found", status: 404 };
    return { data: parent, status: 200 };
  }

  async leaveAdminApprove(leaveId: string, action: "approve" | "reject", adminId: string) {
    const id = parseInt(leaveId, 10);
    if (Number.isNaN(id) || id < 1) return { error: "Invalid leave ID", status: 400 };
    const leave = await leaveDAO.findById(id);
    if (!leave) return { error: "Leave not found", status: 404 };
    const status = action === "approve" ? "approved" : "rejected";
    const reviewStatus = action === "approve" ? "approved" : "rejected";
    const now = new Date();
    await leaveDAO.updateReview(id, {
      status,
      staffReviewStatus: reviewStatus,
      staffReviewRemarks: "Approved by admin",
      staffReviewedBy: adminId,
      staffReviewedAt: now,
      parentReviewStatus: reviewStatus,
      parentReviewRemarks: "Approved by admin",
      parentReviewedBy: adminId,
      parentReviewedAt: now,
    });
    const updated = await leaveDAO.findById(id);
    return { data: updated, status: 200 };
  }
}
