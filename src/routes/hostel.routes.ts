import express from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware.js";
import {
  getAllHostels,
  getHostelById,
  createHostel,
  updateHostel,
  deleteHostel,
  getHostelUsers,
  assignUserToHostel,
  unassignUserFromHostel,
} from "../controllers/Hostel.controller.js";

const router = express.Router();

router.use(authenticateToken, authorizeRoles(["admin", "super_admin"]));

router.get("/", getAllHostels);
router.get("/:id/users", getHostelUsers);
router.get("/:id", getHostelById);
router.post("/", createHostel);
router.post("/:id/users", assignUserToHostel);
router.put("/:id", updateHostel);
router.delete("/:id/users/:userId", unassignUserFromHostel);
router.delete("/:id", deleteHostel);

export default router;
