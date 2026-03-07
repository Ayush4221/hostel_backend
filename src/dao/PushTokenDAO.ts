import { prisma } from "../db/prisma.js";

const VALID_PLATFORMS = ["android", "ios", "web"] as const;

export function isValidPlatform(p: string): p is (typeof VALID_PLATFORMS)[number] {
  return VALID_PLATFORMS.includes(p as (typeof VALID_PLATFORMS)[number]);
}

export class PushTokenDAO {
  /** Upsert: replace token for (userId, platform) or create. */
  async upsert(userId: string, token: string, platform: string, organizationId?: string | null) {
    const plat = isValidPlatform(platform) ? platform : "android";
    return prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform: plat, organizationId: organizationId ?? undefined },
      update: { userId, platform: plat, organizationId: organizationId ?? undefined },
    });
  }

  async deleteByToken(token: string) {
    return prisma.pushToken.deleteMany({ where: { token } });
  }

  /** Get all tokens for the given user IDs (for FCM send). */
  async findByUserIds(userIds: string[]): Promise<{ userId: string; token: string }[]> {
    if (userIds.length === 0) return [];
    const rows = await prisma.pushToken.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, token: true },
    });
    return rows;
  }

  /** Delete multiple tokens (e.g. invalid from FCM response). */
  async deleteByTokens(tokens: string[]) {
    if (tokens.length === 0) return { count: 0 };
    return prisma.pushToken.deleteMany({ where: { token: { in: tokens } } });
  }
}
