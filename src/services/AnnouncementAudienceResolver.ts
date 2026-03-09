import { prisma } from "../db/prisma.js";
import { AnnouncementTargetAudience } from "../utils/constants/announcements.js";
import {
  ROLE_CODE_STUDENT,
  ROLE_CODE_STAFF,
  ROLE_CODE_ADMIN,
  ROLE_CODE_PARENT,
} from "../utils/constants/roles.js";

/**
 * Resolve user IDs that should receive push for an announcement.
 * @param targetAudience - enum value (all, students, staff, etc.)
 * @param organizationId - announcement's org
 * @param hostelIds - from hostel_announcement_mapping; empty = org-wide (all hostels in org)
 */
export async function resolveAnnouncementAudienceUserIds(
  targetAudience: string,
  organizationId: string,
  hostelIds: number[]
): Promise<string[]> {
  const roleSets = getRolesForAudience(targetAudience);
  let targetHostelIds: number[];

  if (hostelIds.length > 0) {
    targetHostelIds = hostelIds;
  } else {
    const hostelsInOrg = await prisma.hostel.findMany({
      where: { organizationId },
      select: { id: true },
    });
    targetHostelIds = hostelsInOrg.map((h) => h.id);
  }

  if (targetHostelIds.length === 0) return [];

  const mappings = await prisma.userHostelRoleMapping.findMany({
    where: {
      hostelId: { in: targetHostelIds },
      role: { in: roleSets },
      status: "active",
    },
    select: { userId: true },
  });
  const userIds = new Set(mappings.map((m) => m.userId));
  return Array.from(userIds);
}

function getRolesForAudience(audience: string): string[] {
  switch (audience) {
    case AnnouncementTargetAudience.ALL:
      return [ROLE_CODE_STUDENT, ROLE_CODE_STAFF, ROLE_CODE_ADMIN, ROLE_CODE_PARENT];
    case AnnouncementTargetAudience.STUDENTS:
      return [ROLE_CODE_STUDENT];
    case AnnouncementTargetAudience.STAFF:
      return [ROLE_CODE_STAFF, ROLE_CODE_ADMIN];
    case AnnouncementTargetAudience.PARENTS:
      return [ROLE_CODE_PARENT];
    case AnnouncementTargetAudience.STUDENTS_STAFF:
      return [ROLE_CODE_STUDENT, ROLE_CODE_STAFF, ROLE_CODE_ADMIN];
    case AnnouncementTargetAudience.STUDENTS_PARENTS:
      return [ROLE_CODE_STUDENT, ROLE_CODE_PARENT];
    case AnnouncementTargetAudience.STAFF_PARENTS:
      return [ROLE_CODE_STAFF, ROLE_CODE_ADMIN, ROLE_CODE_PARENT];
    default:
      return [ROLE_CODE_STUDENT, ROLE_CODE_STAFF, ROLE_CODE_ADMIN, ROLE_CODE_PARENT];
  }
}
