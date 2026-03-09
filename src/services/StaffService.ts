import bcrypt from "bcryptjs";
import { UserDAO } from "../dao/UserDAO.js";
import { LeaveDAO } from "../dao/LeaveDAO.js";

const userDAO = new UserDAO();
const leaveDAO = new LeaveDAO();

function omitPassword<T extends { passwordHash?: string }>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

function parseLeaveId(leaveId: string): number {
  const id = parseInt(leaveId, 10);
  if (Number.isNaN(id) || id < 1) throw new Error("Invalid leave ID");
  return id;
}

export class StaffService {
  async getProfile(staffId: string) {
    const user = await userDAO.findById(staffId);
    if (!user) return null;
    return omitPassword(user);
  }

  async getLeaveStats() {
    const leaves = await leaveDAO.findMany();
    return leaves.reduce(
      (acc, leave) => {
        acc.total++;
        switch (leave.status.toLowerCase()) {
          case "pending":
            acc.pending++;
            break;
          case "approved":
            acc.approved++;
            break;
        }
        return acc;
      },
      { pending: 0, approved: 0, total: 0 }
    );
  }

  async getAllLeaves() {
    return leaveDAO.findMany();
  }

  async getPendingLeaves() {
    return leaveDAO.findMany("pending");
  }

  async reviewLeave(leaveId: string, staffId: string, action: "approve" | "reject", remarks?: string) {
    const id = parseLeaveId(leaveId);
    const leave = await leaveDAO.findById(id);
    if (!leave) {
      throw new Error("Leave not found");
    }
    if (leave.staffReviewStatus) {
      throw new Error("Leave already reviewed by staff");
    }

    const staffReviewStatus = action === "approve" ? "approved" : "rejected";
    const status =
      leave.parentReviewStatus === "approved" && action === "approve"
        ? "approved"
        : action === "reject" || leave.parentReviewStatus === "rejected"
          ? "rejected"
          : "pending";

    await leaveDAO.updateReview(id, {
      status,
      staffReviewStatus,
      staffReviewRemarks: remarks ?? null,
      staffReviewedBy: staffId,
      staffReviewedAt: new Date(),
      parentReviewStatus: leave.parentReviewStatus,
      parentReviewRemarks: leave.parentReviewRemarks,
      parentReviewedBy: leave.parentReviewedBy,
      parentReviewedAt: leave.parentReviewedAt,
    });
    return leaveDAO.findById(id);
  }

  async getDashboard(staffId: string) {
    const staff = await this.getProfile(staffId);
    if (!staff) return null;
    const stats = await this.getLeaveStats();
    const leaves = await leaveDAO.findMany();
    const recentLeaves = leaves.slice(0, 5);
    return { staff, stats, recentLeaves };
  }

  async changePassword(staffId: string, currentPassword: string, newPassword: string) {
    const user = await userDAO.findById(staffId);
    if (!user) return false;
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new Error("Current password is incorrect");
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userDAO.updatePassword(staffId, passwordHash);
    return true;
  }
}
