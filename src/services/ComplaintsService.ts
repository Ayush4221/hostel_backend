import { UserDAO } from "../dao/UserDAO.js";
import { ComplaintDAO } from "../dao/ComplaintDAO.js";
import { UserHostelRoleMappingDAO } from "../dao/UserHostelRoleMappingDAO.js";
import { ParentStudentMappingDAO } from "../dao/ParentStudentMappingDAO.js";
import { ROLE_CODE_STUDENT, ROLE_CODE_PARENT } from "../utils/constants/index.js";

const userDAO = new UserDAO();
const complaintDAO = new ComplaintDAO();
const userHostelRoleMappingDAO = new UserHostelRoleMappingDAO();
const parentStudentMappingDAO = new ParentStudentMappingDAO();

const COMPLAINT_TYPES = ["Maintenance", "Disciplinary", "Other"] as const;

export class ComplaintsService {
  async createComplaint(studentUserId: string, body: { description: string; type: string }) {
    if (!body.description?.trim()) {
      return { error: "Description is required", status: 400 };
    }
    if (!body.type || !COMPLAINT_TYPES.includes(body.type as (typeof COMPLAINT_TYPES)[number])) {
      return { error: "Invalid complaint type", status: 400 };
    }
    const student = await userDAO.findByRole(studentUserId, ROLE_CODE_STUDENT);
    if (!student) {
      return { error: "Only students can create complaints", status: 403 };
    }
    const membership = await userHostelRoleMappingDAO.findFirstByUserId(studentUserId);
    if (!membership) {
      return { error: "Student must belong to a hostel to create a complaint", status: 400 };
    }
    const complaint = await complaintDAO.create({
      organizationId: membership.organizationId,
      hostelId: membership.hostelId,
      studentUserId,
      description: body.description.trim(),
      type: body.type,
      createdByUserId: studentUserId,
    });
    return {
      complaint: {
        id: complaint.id,
        description: complaint.description,
        type: complaint.type,
        status: complaint.status,
        createdAt: complaint.createdAt,
        updatedAt: complaint.updatedAt,
      },
      status: 201,
    };
  }

  async getComplaints(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [complaints, total] = await Promise.all([
      complaintDAO.findMany(skip, limit),
      complaintDAO.count(),
    ]);
    const totalPages = Math.ceil(total / Math.max(1, limit));
    return { complaints, total, page, limit, totalPages, status: 200 };
  }

  async updateComplaint(id: string, studentUserId: string, body: { description?: string; status?: string; type?: string }) {
    const numId = parseInt(id, 10);
    if (Number.isNaN(numId) || numId < 1) return { error: "Invalid complaint ID", status: 400 };
    const complaint = await complaintDAO.findByIdAndStudent(numId, studentUserId);
    if (!complaint) {
      return { error: "Complaint not found or unauthorized", status: 404 };
    }
    const data: { description?: string; status?: string; type?: string } = {};
    if (body.description !== undefined) {
      if (!body.description.trim()) return { error: "Description cannot be empty", status: 400 };
      data.description = body.description.trim();
    }
    if (body.status !== undefined) data.status = body.status;
    if (body.type !== undefined) {
      if (!COMPLAINT_TYPES.includes(body.type as (typeof COMPLAINT_TYPES)[number])) {
        return { error: "Invalid complaint type", status: 400 };
      }
      data.type = body.type;
    }
    const updated = await complaintDAO.update(numId, data);
    return { complaint: updated, status: 200 };
  }

  async deleteComplaint(id: string) {
    const numId = parseInt(id, 10);
    if (Number.isNaN(numId) || numId < 1) return { error: "Invalid complaint ID", status: 400 };
    const complaint = await complaintDAO.findById(numId);
    if (!complaint) {
      return { error: "Complaint not found", status: 404 };
    }
    await complaintDAO.delete(numId);
    return { status: 200 };
  }

  async getStudentComplaints(studentUserId: string) {
    const complaints = await complaintDAO.findManyByStudentUserId(studentUserId);
    return { complaints, status: 200 };
  }

  async deleteStudentComplaint(id: string, studentUserId: string) {
    const numId = parseInt(id, 10);
    if (Number.isNaN(numId) || numId < 1) return { error: "Invalid complaint ID", status: 400 };
    const complaint = await complaintDAO.findByIdAndStudent(numId, studentUserId);
    if (!complaint) {
      return { error: "Complaint not found or unauthorized", status: 404 };
    }
    await complaintDAO.delete(numId);
    return { deletedComplaint: complaint, status: 200 };
  }

  async getParentsComplaints(parentUserId: string) {
    const parent = await userDAO.findByRole(parentUserId, ROLE_CODE_PARENT);
    if (!parent) {
      return { error: "Parent not found", status: 404 };
    }
    const links = await parentStudentMappingDAO.findStudentsByParentId(parentUserId);
    if (!links.length) {
      return { error: "No children found", status: 404 };
    }
    const studentIds = links.map((l) => l.studentUserId);
    const studentMap = new Map(links.map((l) => [l.studentUserId, l.student]));
    const allComplaints: Awaited<ReturnType<ComplaintDAO["findManyByStudentUserId"]>> = [];
    for (const sid of studentIds) {
      const list = await complaintDAO.findManyByStudentUserId(sid);
      allComplaints.push(...list);
    }
    const complaints = allComplaints
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((c) => {
        const student = studentMap.get(c.studentUserId);
        return {
          id: c.id,
          type: c.type,
          description: c.description,
          status: c.status,
          studentDetails: student
            ? { firstName: student.firstName, lastName: student.lastName, roomNumber: "N/A" }
            : { firstName: "N/A", lastName: "N/A", roomNumber: "N/A" },
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      });
    return { complaints, status: 200 };
  }
}
