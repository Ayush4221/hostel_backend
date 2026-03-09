import { UserDAO } from "../dao/UserDAO.js";
import type { User } from "@prisma/client";

const userDAO = new UserDAO();

/**
 * Updates the profile picture URL for a user.
 * Returns null if user not found.
 */
export const updateProfilePic = async (
  userId: string,
  profilePicUrl: string
): Promise<User | null> => {
  try {
    return await userDAO.update(userId, { profilePicUrl });
  } catch {
    return null;
  }
};
