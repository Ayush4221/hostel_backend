import { Request, Response } from "express";
import { PushTokenDAO, isValidPlatform } from "../dao/PushTokenDAO.js";
import { OrganizationDAO } from "../dao/OrganizationDAO.js";
import { UserHostelRoleMappingDAO } from "../dao/UserHostelRoleMappingDAO.js";

const pushTokenDAO = new PushTokenDAO();
const organizationDAO = new OrganizationDAO();
const userHostelRoleMappingDAO = new UserHostelRoleMappingDAO();

/** Resolve organizationId for a user (org mapping first, then hostel mapping). */
async function resolveOrganizationIdForUser(userId: string): Promise<string | null> {
  const orgMapping = await organizationDAO.findFirstByUserId(userId);
  if (orgMapping?.organizationId) return orgMapping.organizationId;
  const hostelMapping = await userHostelRoleMappingDAO.findFirstByUserId(userId);
  if (hostelMapping?.hostel?.organizationId) return hostelMapping.hostel.organizationId;
  return null;
}

export const registerPushToken = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { token, platform } = req.body as { token?: string; platform?: string };
    if (!token || typeof token !== "string" || token.trim() === "") {
      res.status(400).json({ message: "token is required" });
      return;
    }
    const plat = platform && isValidPlatform(platform) ? platform : "android";
    const organizationId =
      req.user?.organizationId ?? (await resolveOrganizationIdForUser(userId)) ?? null;
    await pushTokenDAO.upsert(userId, token.trim(), plat, organizationId);
    res.status(200).json({ message: "Token registered" });
  } catch (error) {
    res.status(500).json({ message: "Failed to register push token" });
  }
};

export const unregisterPushToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body as { token?: string };
    if (!token || typeof token !== "string" || token.trim() === "") {
      res.status(400).json({ message: "token is required" });
      return;
    }
    await pushTokenDAO.deleteByToken(token.trim());
    res.status(200).json({ message: "Token removed" });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove push token" });
  }
};
