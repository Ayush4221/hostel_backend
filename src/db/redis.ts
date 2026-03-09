import { Redis } from "ioredis";

let client: Redis | null = null;
let bullmqClient: Redis | null = null;

/**
 * Returns a Redis client when REDIS_URL is set; otherwise null.
 * Use for password reset tokens, refresh token store, etc.
 */
export function getRedis(): Redis | null {
  if (client !== null) return client;
  const url = process.env.REDIS_URL?.trim();
  if (!url || url === "") return null;
  client = new Redis(url, { maxRetriesPerRequest: 1 });
  return client;
}

/**
 * Returns a Redis client for BullMQ (maxRetriesPerRequest must be null).
 * BullMQ uses blocking commands (e.g. BRPOP); do not use this client for non-queue usage.
 */
export function getRedisForBullMQ(): Redis | null {
  if (bullmqClient !== null) return bullmqClient;
  const url = process.env.REDIS_URL?.trim();
  if (!url || url === "") return null;
  bullmqClient = new Redis(url, { maxRetriesPerRequest: null });
  return bullmqClient;
}

/**
 * Verifies Redis is reachable (e.g. on startup).
 * Call only when REDIS_URL is set; throws on connection/ping failure.
 */
export async function checkRedisConnection(): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("REDIS_URL is not set; cannot check Redis.");
  await redis.ping();
}
