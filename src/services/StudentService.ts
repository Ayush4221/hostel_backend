import bcrypt from "bcryptjs";
import { UserDAO } from "../dao/UserDAO.js";
import { LeaveDAO } from "../dao/LeaveDAO.js";
import { UserHostelRoleMappingDAO } from "../dao/UserHostelRoleMappingDAO.js";
import { RoomDAO } from "../dao/RoomDAO.js";
import { updateProfilePic } from "./User.service.js";

const userDAO = new UserDAO();
const leaveDAO = new LeaveDAO();
const userHostelRoleMappingDAO = new UserHostelRoleMappingDAO();
const roomDAO = new RoomDAO();

function omitPassword<T extends { passwordHash?: string }>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

export class StudentService {
  async getProfile(studentId: string) {
    const user = await userDAO.findById(studentId);
    if (!user) return null;
    return omitPassword(user);
  }

  async getLeaveStats(studentId: string) {
    const leaves = await leaveDAO.findManyByStudentId(studentId);
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
          case "rejected":
            acc.rejected++;
            break;
        }
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0, total: 0 }
    );
  }

  async getLeaves(studentId: string) {
    return leaveDAO.findManyByStudentId(studentId);
  }

  async submitLeave(
    studentId: string,
    body: {
      startDate: Date;
      endDate: Date;
      reason: string;
      leaveType?: string;
      contactNumber?: string;
      parentContact?: string;
      address?: string;
    }
  ) {
    const membership = await userHostelRoleMappingDAO.findFirstByUserId(studentId);
    if (!membership?.hostel) {
      throw new Error("Student has no hostel membership");
    }
    const { organizationId, id: hostelId } = membership.hostel;

    const overlapping = await leaveDAO.findOverlapping(
      studentId,
      body.startDate,
      body.endDate,
      true
    );
    if (overlapping) {
      throw new Error("You already have a leave application for these dates");
    }

    return leaveDAO.create({
      organizationId,
      hostelId,
      studentUserId: studentId,
      startDate: body.startDate,
      endDate: body.endDate,
      reason: body.reason,
      leaveType: body.leaveType ?? null,
      contactNumber: body.contactNumber ?? null,
      parentContact: body.parentContact ?? null,
      address: body.address ?? null,
    });
  }

  async updateProfile(
    studentId: string,
    data: { firstName?: string; lastName?: string; email?: string; roomNumber?: string }
  ) {
    const user = await userDAO.findById(studentId);
    if (!user) return null;

    const { roomNumber, ...userData } = data;
    if (Object.keys(userData).length > 0) {
      await userDAO.update(studentId, userData);
    }

    if (roomNumber !== undefined) {
      const membership = await userHostelRoleMappingDAO.findFirstByUserId(studentId);
      if (membership?.hostel) {
        const room = await roomDAO.findOrCreate(membership.hostel.id, roomNumber);
        await userHostelRoleMappingDAO.updateRoomId(membership.id, room.id);
      }
    }

    const updated = await userDAO.findById(studentId);
    return updated ? omitPassword(updated) : null;
  }

  async getDashboard(studentId: string) {
    const student = await this.getProfile(studentId);
    if (!student) return null;
    const stats = await this.getLeaveStats(studentId);
    const leaves = await leaveDAO.findManyByStudentId(studentId);
    const recentLeaves = leaves.slice(0, 5);
    return { student, stats, recentLeaves };
  }

  async changePassword(studentId: string, currentPassword: string, newPassword: string) {
    const user = await userDAO.findById(studentId);
    if (!user) return false;
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new Error("Current password is incorrect");
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userDAO.updatePassword(studentId, passwordHash);
    return true;
  }

  async getRoommates(studentId: string) {
    const membership = await userHostelRoleMappingDAO.findFirstByUserId(studentId, true);
    if (!membership?.roomId || !membership.hostel) {
      return null;
    }
    const memberships = await userHostelRoleMappingDAO.findManyByHostelIdAndRoomId(
      membership.hostelId,
      membership.roomId
    );
    const roommates = memberships
      .filter((m) => m.userId !== studentId)
      .map((m) => ({
        ...m.user,
        roomNumber: m.room?.roomNumber,
      }));
    return {
      roomNumber: membership.room?.roomNumber ?? null,
      roommates,
    };
  }

  async uploadProfilePicture(userId: string, profilePicUrl: string) {
    return updateProfilePic(userId, profilePicUrl);
  }

  /**
   * Returns orgId and hostelId for the student's first hostel membership (for S3 profile pic path).
   * Null if user has no hostel membership.
   */
  async getProfilePicUploadContext(
    userId: string
  ): Promise<{ orgId: string; hostelId: number } | null> {
    const membership = await userHostelRoleMappingDAO.findFirstByUserId(userId);
    if (!membership?.hostel) return null;
    return {
      orgId: membership.hostel.organizationId,
      hostelId: membership.hostelId,
    };
  }
}
