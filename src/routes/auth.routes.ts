import express from "express";
import { login, orgSignup, refreshToken, logout } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/login", login);
router.post("/org-signup", orgSignup);
router.post("/refreshtoken", refreshToken);
router.post("/signout", logout);

export default router;
