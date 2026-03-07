import { UserDAO } from "../dao/UserDAO.js";
import { LeaveDAO } from "../dao/LeaveDAO.js";
import { ParentStudentMappingDAO } from "../dao/ParentStudentMappingDAO.js";
import { UserHostelRoleMappingDAO } from "../dao/UserHostelRoleMappingDAO.js";
import { ROLE_CODE_PARENT } from "../utils/constants/roles.js";

const userDAO = new UserDAO();
const leaveDAO = new LeaveDAO();
const parentStudentMappingDAO = new ParentStudentMappingDAO();
const userHostelRoleMappingDAO = new UserHostelRoleMappingDAO();

function omitPassword<T extends Record<string, unknown>>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash: _, ...rest } = user;
  return rest as Omit<T, "passwordHash">;
}

export class ParentService {
  async getChildStats(parentId: string) {
    const parent = await userDAO.findByRole(parentId, ROLE_CODE_PARENT);
    if (!parent) return null;

    const links = await parentStudentMappingDAO.findStudentsByParentId(parentId);
    if (!links.length) return null;

    const childrenStats = await Promise.all(
      links.map(async (link) => {
        const student = link.student;
        const leaves = await leaveDAO.findManyByStudentId(student.id);
        const membership = await userHostelRoleMappingDAO.findFirstByUserId(student.id, true);
        return {
          childName: `${student.firstName} ${student.lastName}`,
          roomNumber: membership?.room?.roomNumber ?? null,
          totalLeaves: leaves.length,
          pendingLeaves: leaves.filter((l) => l.status === "pending").length,
          approvedLeaves: leaves.filter((l) => l.status === "approved").length,
        };
      })
    );
    return { children: childrenStats };
  }

  async getChildInfo(parentId: string) {
    const parent = await userDAO.findByRole(parentId, ROLE_CODE_PARENT);
    if (!parent) return null;
    const links = await parentStudentMappingDAO.findStudentsByParentId(parentId);
    const first = links[0]?.student;
    return first ? omitPassword(first) : null;
  }

  async getChildLeaves(parentId: string) {
    const parent = await userDAO.findByRole(parentId, ROLE_CODE_PARENT);
    if (!parent) return null;
    const links = await parentStudentMappingDAO.findStudentsByParentId(parentId);
    const studentIds = links.map((l) => l.studentUserId);
    if (!studentIds.length) return { leaves: [], count: 0 };
    const leaves = await leaveDAO.findManyByStudentUserIds(studentIds);
    return { leaves, count: leaves.length };
  }

  async getParentProfile(parentId: string) {
    const parent = await userDAO.findByRole(parentId, ROLE_CODE_PARENT);
    if (!parent) return null;
    const links = await parentStudentMappingDAO.findStudentsByParentId(parentId);
    const children = links.map((l) => omitPassword(l.student));
    return { ...omitPassword(parent), children };
  }

  async getDashboardInfo(parentId: string) {
    const parent = await userDAO.findByRole(parentId, ROLE_CODE_PARENT);
    if (!parent) return null;
    const links = await parentStudentMappingDAO.findStudentsByParentId(parentId);
    const firstChild = links[0]?.student;
    if (!firstChild) return null;
    const recentLeaves = (await leaveDAO.findManyByStudentId(firstChild.id)).slice(0, 5);
    return {
      parent: omitPassword(parent),
      child: omitPassword(firstChild),
      recentLeaves,
    };
  }

  async updateParentProfile(
    parentId: string,
    data: { firstName?: string; lastName?: string; email?: string; phone?: string }
  ) {
    const parent = await userDAO.findByRole(parentId, ROLE_CODE_PARENT);
    if (!parent) return null;
    const update: { firstName?: string; lastName?: string; email?: string; phone?: string } = {};
    if (data.firstName !== undefined) update.firstName = data.firstName;
    if (data.lastName !== undefined) update.lastName = data.lastName;
    if (data.email !== undefined) update.email = data.email;
    if (data.phone !== undefined) update.phone = data.phone;
    if (Object.keys(update).length > 0) {
      await userDAO.update(parentId, update);
    }
    const updated = await userDAO.findById(parentId);
    return updated ? omitPassword(updated) : null;
  }

  async reviewLeave(
    parentId: string,
    leaveId: string,
    action: "approve" | "reject",
    remarks?: string
  ) {
    const id = parseInt(leaveId, 10);
    if (Number.isNaN(id) || id < 1) throw new Error("Invalid leave ID");
    const parent = await userDAO.findByRole(parentId, ROLE_CODE_PARENT);
    if (!parent) {
      throw new Error("Parent not found");
    }
    const links = await parentStudentMappingDAO.findStudentsByParentId(parentId);
    const studentIds = new Set(links.map((l) => l.studentUserId));

    const leave = await leaveDAO.findById(id);
    if (!leave || !studentIds.has(leave.studentUserId)) {
      throw new Error("Leave not found or unauthorized");
    }
    if (leave.status !== "pending") {
      throw new Error("Leave already reviewed");
    }

    const parentReviewStatus = action === "approve" ? "approved" : "rejected";
    const status =
      leave.staffReviewStatus === "approved" && action === "approve"
        ? "approved"
        : action === "reject"
          ? "rejected"
          : "pending";

    await leaveDAO.updateReview(id, {
      status,
      staffReviewStatus: leave.staffReviewStatus ?? "",
      staffReviewRemarks: leave.staffReviewRemarks,
      staffReviewedBy: leave.staffReviewedBy,
      staffReviewedAt: leave.staffReviewedAt,
      parentReviewStatus,
      parentReviewRemarks: remarks ?? null,
      parentReviewedBy: parentId,
      parentReviewedAt: new Date(),
    });
    return leaveDAO.findById(id);
  }
}
