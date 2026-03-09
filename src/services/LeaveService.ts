import { LeaveDAO } from "../dao/LeaveDAO.js";

const leaveDAO = new LeaveDAO();

export class LeaveService {
  /** Validates leave exists and is pending; throws if invalid. Used by leave review middleware. */
  async validateForReview(leaveId: string) {
    const id = parseInt(leaveId, 10);
    if (Number.isNaN(id) || id < 1) {
      throw new Error("Invalid leave ID");
    }
    const leave = await leaveDAO.findById(id);
    if (!leave) {
      throw new Error("Leave not found");
    }
    if (leave.status !== "pending") {
      throw new Error("Leave has already been reviewed");
    }
    return leave;
  }
}
