import { initializeApp, cert, type App, type ServiceAccount } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createLogger } from "../utils/logger.js";

const log = createLogger("PushService");
const FCM_BATCH_SIZE = 500;

let app: App | null = null;

function getFirebaseApp(): App | null {
  if (app) return app;
  const pathEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (pathEnv) {
    const resolvedPath = resolve(process.cwd(), pathEnv);
    try {
      const key = JSON.parse(readFileSync(resolvedPath, "utf8")) as ServiceAccount;
      app = initializeApp({ credential: cert(key) });
      log.info({ path: resolvedPath }, "Firebase Admin initialized from file");
      return app;
    } catch (err) {
      log.warn(
        { path: resolvedPath, error: err instanceof Error ? err.message : String(err) },
        "Firebase Admin init failed (FIREBASE_SERVICE_ACCOUNT_PATH)"
      );
      return null;
    }
  }
  if (json) {
    try {
      const key = JSON.parse(json) as ServiceAccount;
      app = initializeApp({ credential: cert(key) });
      log.info("Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_JSON");
      return app;
    } catch (err) {
      log.warn(
        { error: err instanceof Error ? err.message : String(err) },
        "Firebase Admin init failed (FIREBASE_SERVICE_ACCOUNT_JSON)"
      );
      return null;
    }
  }
  log.warn("FCM not configured: set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON in .env");
  return null;
}

export interface SendToTokensResult {
  success: number;
  failedTokens: string[];
}

/**
 * Send a single notification to multiple FCM tokens in batches.
 * Returns count of successful sends and list of failed (invalid/expired) tokens.
 */
export async function sendToTokens(
  tokens: string[],
  title: string,
  body: string,
  data?: { announcementId?: string }
): Promise<SendToTokensResult> {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return { success: 0, failedTokens: [...tokens] };
  }
  const messaging = getMessaging(firebaseApp);
  const failedTokens: string[] = [];
  let success = 0;
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
    chunks.push(tokens.slice(i, i + FCM_BATCH_SIZE));
  }
  for (const chunk of chunks) {
    if (chunk.length === 0) continue;
    const message = {
      tokens: chunk,
      notification: { title, body },
      data: data
        ? {
            ...(data.announcementId && { announcementId: String(data.announcementId) }),
          }
        : undefined,
    };
    try {
      const res = await messaging.sendEachForMulticast(message);
      success += res.successCount;
      res.responses.forEach((r, idx) => {
        if (!r.success && r.error?.code === "messaging/invalid-registration-token") {
          failedTokens.push(chunk[idx]);
        } else if (!r.success && r.error?.code === "messaging/registration-token-not-registered") {
          failedTokens.push(chunk[idx]);
        }
      });
    } catch (err) {
      failedTokens.push(...chunk);
    }
  }
  return { success, failedTokens };
}

export function isPushConfigured(): boolean {
  return getFirebaseApp() !== null;
}
