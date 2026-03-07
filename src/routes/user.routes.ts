import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { registerPushToken, unregisterPushToken } from "../controllers/pushToken.controller.js";
import { markAnnouncementsAsRead } from "../controllers/Announcment.controller.js";

const router = express.Router();

router.use(authenticateToken);

router.post("/me/push-token", registerPushToken);
router.delete("/me/push-token", unregisterPushToken);
router.post("/me/announcements/read", markAnnouncementsAsRead);

export default router;
