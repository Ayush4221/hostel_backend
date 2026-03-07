import crypto from "crypto";
import { getRedis } from "../db/redis.js";
import { getRefreshTokenTTLSeconds } from "../config/jwt.js";

const KEY_PREFIX = "refresh_token:";

function redisKey(token: string): string {
  return KEY_PREFIX + token;
}

/**
 * Create a new refresh token for the user, store in Redis with TTL (e.g. 7 days).
 * Returns the opaque token string to send to the client.
 */
export async function createRefreshToken(userId: string): Promise<string> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis not configured; cannot create refresh token.");
  const token = crypto.randomBytes(32).toString("hex");
  const key = redisKey(token);
  const ttl = getRefreshTokenTTLSeconds();
  await redis.setex(key, ttl, userId);
  return token;
}

/**
 * Get userId for a refresh token. Returns null if token missing or expired.
 */
export async function getUserIdByRefreshToken(token: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const key = redisKey(token);
  const userId = await redis.get(key);
  return userId;
}

/**
 * Delete refresh token from Redis (used on refresh rotation and logout).
 */
export async function deleteRefreshToken(token: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(redisKey(token));
}

/**
 * Rotate: delete old token, create new one, return new token.
 */
export async function rotateRefreshToken(userId: string, oldToken: string): Promise<string> {
  await deleteRefreshToken(oldToken);
  return await createRefreshToken(userId);
}
