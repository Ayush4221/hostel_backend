import express from "express";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";
import {
  getChildStats,
  getChildInfo,
  getChildLeaves,
  getParentProfile,
  getDashboardInfo,
  updateParentProfile,
  reviewLeave,
} from "../controllers/parent.controller.js";
import { getParentAnnouncementsPaginated } from "../controllers/Announcment.controller.js";
import { getParentsComplaints } from "../controllers/Complaints.controller.js";
import { validateLeaveReview } from "../middleware/leave.middleware.js";

const router = express.Router();

// Profile routes
router.get(
  "/profile",
  authenticateToken,
  authorizeRoles(["parent"]),
  getParentProfile
);

router.put(
  "/profile",
  authenticateToken,
  authorizeRoles(["parent"]),
  updateParentProfile
);

// Child information routes
router.get(
  "/child-stats",
  authenticateToken,
  authorizeRoles(["parent"]),
  getChildStats
);

router.get(
  "/child-info",
  authenticateToken,
  authorizeRoles(["parent"]),
  getChildInfo
);

// Leave management routes
router.get(
  "/child-leaves",
  authenticateToken,
  authorizeRoles(["parent"]),
  getChildLeaves
);

// Update the review endpoint to match staff pattern
router.post(
  "/leaves/:leaveId/review",
  authenticateToken,
  authorizeRoles(["parent"]),
  validateLeaveReview,
  reviewLeave
);

// Dashboard route
router.get(
  "/dashboard",
  authenticateToken,
  authorizeRoles(["parent"]),
  getDashboardInfo
);

// Announcements route
router.get(
  "/announcements",
  authenticateToken,
  authorizeRoles(["parent"]),
  getParentAnnouncementsPaginated
);

// Complaints route
router.get(
  "/complaints",
  authenticateToken,
  authorizeRoles(["parent"]),
  getParentsComplaints
);

export default router;
