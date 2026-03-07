import { MessDAO } from "../dao/MessDAO.js";
import { HostelDAO } from "../dao/HostelDAO.js";

const messDAO = new MessDAO();
const hostelDAO = new HostelDAO();

function parseHostelId(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isNaN(n) ? undefined : n;
}

export class MessService {
  async resolveHostelId(hostelId?: string | number): Promise<number | null> {
    const n = parseHostelId(hostelId);
    if (n !== undefined) {
      const h = await messDAO.getByHostelId(n);
      return h ? n : null;
    }
    const first = await hostelDAO.findFirst();
    return first?.id ?? null;
  }

  /**
   * Returns orgId and hostelId for a given hostel (for S3 path context). Null if hostel not found.
   */
  async getHostelOrgContext(hostelId: string | number): Promise<{ orgId: string; hostelId: number } | null> {
    const n = typeof hostelId === "number" ? hostelId : parseInt(String(hostelId), 10);
    if (Number.isNaN(n)) return null;
    const hostel = await hostelDAO.findById(n);
    if (!hostel) return null;
    return { orgId: hostel.organizationId, hostelId: hostel.id };
  }

  async getMessPhoto(hostelId?: string | number) {
    const n = parseHostelId(hostelId);
    const result = n !== undefined
      ? await messDAO.getByHostelId(n)
      : await messDAO.getFirstWithPhoto();
    return result && result.messPhotoUrl ? result : null;
  }

  async uploadPhoto(hostelId: string | number, messPhotoUrl: string) {
    const n = typeof hostelId === "number" ? hostelId : parseInt(String(hostelId), 10);
    if (Number.isNaN(n)) throw new Error("Invalid hostelId");
    await messDAO.updatePhoto(n, messPhotoUrl);
    return messDAO.getByHostelId(n);
  }

  async clearPhoto(hostelId: string | number) {
    const n = typeof hostelId === "number" ? hostelId : parseInt(String(hostelId), 10);
    if (Number.isNaN(n)) throw new Error("Invalid hostelId");
    return messDAO.clearPhoto(n);
  }
}
