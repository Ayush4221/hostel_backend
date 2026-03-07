import express from "express";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";
import hostelRoutes from "./hostel.routes.js";
import {
  // Parent-Student Management
  assignParentToStudent,
  removeParentFromStudent,
  getStudentParentInfo,
  getAllStudents,
  getAllParents,
  createParent,
  updateParent,
  deleteParent,
  createAdmin,
  getstaff,
  getAssignableUsers,
  getleaves,
  createStaff,
  deleteStaff,
  getleavesbyId,
  deleteleavebyid,
  editstudent,
  deleteStudent,
  getstudentbyid,
  updatePassword,
  getstaffbyid,
  updateStaff,
  getParentbyid,
  leaveAdminApprove,
} from "../controllers/admin.controller.js";
import {
  deleteComplaint,
  getComplaints,
} from "../controllers/Complaints.controller.js";
import { parseSingleImage, parseCsvUpload } from "../middleware/upload.middleware.js";
import {
  deleteMessPhoto,
  getMessPhoto,
  uploadMessPhoto,
} from "../controllers/mess.controller.js";
import {
  AssignOrUpdateRoom,
  getAllRoommates,
} from "../controllers/RoomManagment.controller.js";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAllAnnouncements,
  updateAnnouncement,
  getAdminAnnouncementsPaginated,
  getAnnouncementById,
} from "../controllers/Announcment.controller.js";
import { importOrUpdateUsersFromCSV } from "../controllers/CSV.controller.js";

const router = express.Router();

const messUpload = parseSingleImage("messPhoto");
const csvUpload = parseCsvUpload();

// Protect all admin routes (org_admin can access announcements and org-level admin APIs)
router.use(authenticateToken, authorizeRoles(["admin", "super_admin", "org_admin"]));

// Admin Management
router.post("/create", createAdmin);

// Hostel CRUD (separate controller)
router.use("/hostels", hostelRoutes);

// Parent-Student Management Routes
router.get("/parents", getAllParents);
router.get("/student-parent/:studentId", getStudentParentInfo);
router.get("/complaints", getComplaints);

// Parent Management
router.post("/parent", createParent);
router.put("/parent/:id", updateParent);
router.delete("/parent/:id", deleteParent);
router.get("/parent/:id", getParentbyid);
// Parent-Student Assignment
router.post("/assign-parent", assignParentToStudent);
router.delete("/remove-parent/:studentId", removeParentFromStudent);

router.delete("/deletecomplaint/:id", deleteComplaint);

// staff management
router.get("/getallstaffs", getstaff);
router.get("/users", getAssignableUsers);
router.post("/staff-create", createStaff);
router.delete("/delete-staff/:id", deleteStaff);
router.get("/staff/:id", getstaffbyid);
router.put("/staff/edit/:id", updateStaff);

//leave management

router.get("/getallleaves", getleaves);
router.get("/getstudentleaveid/:id", getleavesbyId)
router.delete("/delete-leave/:id", deleteleavebyid);
router.post(
  "/leaves/:leaveId/review",
  authenticateToken,
  leaveAdminApprove
);
//Mess-upload

router.post("/upload-mess-menu", messUpload, uploadMessPhoto);
router.get("/mess-menu", getMessPhoto);
router.delete("/delete-menu", deleteMessPhoto);

//room managment routes

router.get("/get-All-Roomamtes", getAllRoommates);
router.post("/assign-room", AssignOrUpdateRoom);
router.post("/update-room", AssignOrUpdateRoom);

// Announcements (new standardized routes)
router.get("/announcements", getAdminAnnouncementsPaginated);
router.get("/announcements/:id", getAnnouncementById);
router.post("/announcements", createAnnouncement);
router.put("/announcements/:id", updateAnnouncement);
router.delete("/announcements/:id", deleteAnnouncement);

// Legacy announcement routes (deprecated, prefer /announcements)
router.get("/getadminannouncment", getAllAnnouncements);
router.post("/createadminannouncment", createAnnouncement);
router.put("/update-announcment/:type/:id", updateAnnouncement);
router.delete("/delete-announcment/:type/:id", deleteAnnouncement);

// CSV import Routes

// Route to handle CSV upload and import
router.post("/import-csv", csvUpload, importOrUpdateUsersFromCSV);


//student admin routes 
router.get("/students", getAllStudents);
router.put("/student/:id", editstudent);
router.delete("/delete-student/:id", deleteStudent);
router.get("/student/:id", getstudentbyid);


//common 
router.put("/updatepasswords/:id", updatePassword);
export default router;