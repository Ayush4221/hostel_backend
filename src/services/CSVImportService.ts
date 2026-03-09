import bcrypt from "bcryptjs";
import { UserDAO } from "../dao/UserDAO.js";
import { ROLE_CODE_TO_ID } from "../config/roles.js";

const userDAO = new UserDAO();

export interface CSVUserRow {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  roomNumber?: string;
}

export interface CSVImportResult {
  insertedCount: number;
  updatedCount: number;
  errors: string[];
}

export class CSVImportService {
  async importUsers(rows: CSVUserRow[]): Promise<CSVImportResult> {
    const errors: string[] = [];
    const updatedUsers: string[] = [];
    const insertedUsers: string[] = [];

    for (const row of rows) {
      try {
        const email = (row.email || "").trim().toLowerCase();
        if (!email) {
          errors.push(`Row missing email`);
          continue;
        }
        const passwordHash = row.password ? await bcrypt.hash(row.password, 10) : "";
        const roleId = row.role ? ROLE_CODE_TO_ID[row.role] ?? null : null;

        const existing = await userDAO.findByEmail(email);
        if (existing) {
          await userDAO.update(existing.id, {
            firstName: row.firstName ?? existing.firstName,
            lastName: row.lastName ?? existing.lastName,
            role: row.role ?? existing.role ?? undefined,
            ...(roleId !== null && { roleId }),
            ...(passwordHash && { passwordHash }),
          });
          updatedUsers.push(email);
        } else {
          if (!passwordHash) {
            errors.push(`User ${email}: password required for new user`);
            continue;
          }
          await userDAO.create({
            email,
            passwordHash,
            firstName: row.firstName || "First",
            lastName: row.lastName || "Last",
            role: row.role || undefined,
            roleId: roleId ?? undefined,
          });
          insertedUsers.push(email);
        }
      } catch (err) {
        errors.push(
          `Error processing email ${row.email}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return {
      insertedCount: insertedUsers.length,
      updatedCount: updatedUsers.length,
      errors,
    };
  }
}
