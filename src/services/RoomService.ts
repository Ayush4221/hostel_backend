import { prisma } from "../db/prisma.js";
import { RoomDAO } from "../dao/RoomDAO.js";
import { UserHostelRoleMappingDAO } from "../dao/UserHostelRoleMappingDAO.js";
import { ROLE_CODE_STUDENT } from "../utils/constants/index.js";

const roomDAO = new RoomDAO();
const userHostelRoleMappingDAO = new UserHostelRoleMappingDAO();

function parseHostelId(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isNaN(n) ? undefined : n;
}

export class RoomService {
  async getAllRoommates(hostelId?: string | number) {
    const n = parseHostelId(hostelId);
    const memberships = await prisma.userHostelRoleMapping.findMany({
      where: { role: ROLE_CODE_STUDENT, ...(n !== undefined ? { hostelId: n } : {}) },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        room: { select: { id: true, roomNumber: true } },
      },
    });
    const byRoom = new Map<string, { id: string; firstName: string; lastName: string; email: string }[]>();
    for (const m of memberships) {
      const roomNumber = m.room?.roomNumber ?? "Unassigned";
      if (!byRoom.has(roomNumber)) byRoom.set(roomNumber, []);
      byRoom.get(roomNumber)!.push(m.user);
    }
    const roomDetails = Array.from(byRoom.entries()).map(([roomNumber, occupants]) => ({
      roomNumber,
      occupants,
    }));
    return { data: roomDetails, status: 200 };
  }

  /** Get room number and roommates for a student (same room in same hostel). */
  async getRoommatesForUser(userId: string) {
    const membership = await prisma.userHostelRoleMapping.findFirst({
      where: { userId },
      include: { room: true },
    });
    if (!membership?.roomId) return { roomNumber: null, roommates: [] };
    const allInRoom = await prisma.userHostelRoleMapping.findMany({
      where: { hostelId: membership.hostelId, roomId: membership.roomId, userId: { not: userId } },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    const roomNumber = membership.room?.roomNumber ?? "Unassigned";
    return {
      roomNumber,
      roommates: allInRoom.map((m) => m.user),
    };
  }

  async assignOrUpdateRoom(studentId: string, roomNumber: string, hostelId?: string | number) {
    const hostelIdNum = parseHostelId(hostelId);
    let membership = hostelIdNum !== undefined
      ? await userHostelRoleMappingDAO.findByHostelAndUser(hostelIdNum, studentId)
      : await userHostelRoleMappingDAO.findFirstByUserId(studentId);
    if (!membership) {
      return { error: "Student not found or not in a hostel", status: 404 };
    }
    const room = await roomDAO.findOrCreate(membership.hostelId, roomNumber);
    await userHostelRoleMappingDAO.updateRoomId(membership.id, room.id);
    const user = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, firstName: true, lastName: true },
    });
    return {
      data: {
        message: `Room ${roomNumber} assigned successfully`,
        student: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, roomNumber } : null,
      },
      status: 200,
    };
  }
}
