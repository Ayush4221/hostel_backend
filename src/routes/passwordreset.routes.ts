import express from "express";
import { requestPasswordReset, resetPassword } from "../controllers/auth.controller.js";

const router = express.Router();
router.post("/forgot-password",
    requestPasswordReset); // Request reset password
 router.post("/reset-password", resetPassword); 

 export default router;