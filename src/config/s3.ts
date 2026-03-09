import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

/**
 * S3 key structure (folder hierarchy):
 *
 * - Profile pictures: orgId/hostelId/userId/profile/<filename>
 * - Mess pictures:   orgId/hostelId/mess/<filename>
 */

const region = process.env.AWS_REGION || "us-east-1";
const bucket = process.env.AWS_S3_BUCKET || "";
const publicUrlBase = process.env.AWS_S3_PUBLIC_URL_BASE || "";

export const s3Client =
  bucket && process.env.AWS_ACCESS_KEY_ID
    ? new S3Client({
        region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        },
      })
    : null;

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * Upload a file from a local path to S3. Returns key and public URL.
 */
export async function uploadFromPath(
  localPath: string,
  key: string,
  contentType?: string
): Promise<UploadResult> {
  if (!s3Client || !bucket) {
    throw new Error("AWS S3 is not configured (AWS_S3_BUCKET, AWS_ACCESS_KEY_ID)");
  }
  const fs = await import("fs");
  const body = fs.readFileSync(localPath);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
    })
  );
  const url = publicUrlBase
    ? `${publicUrlBase.replace(/\/$/, "")}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  return { key, url };
}

/**
 * Upload a buffer to S3 (e.g. from formidable in-memory).
 */
export async function uploadBuffer(
  buffer: Buffer,
  key: string,
  contentType?: string
): Promise<UploadResult> {
  if (!s3Client || !bucket) {
    throw new Error("AWS S3 is not configured (AWS_S3_BUCKET, AWS_ACCESS_KEY_ID)");
  }
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
    })
  );
  const url = publicUrlBase
    ? `${publicUrlBase.replace(/\/$/, "")}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  return { key, url };
}

/**
 * Delete an object from S3 by key.
 */
export async function deleteByKey(key: string): Promise<void> {
  if (!s3Client || !bucket) {
    throw new Error("AWS S3 is not configured");
  }
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

/**
 * Build a stable S3 key for a folder and filename (optional unique prefix).
 */
export function buildKey(folder: string, originalName: string, uniquePrefix?: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const prefix = uniquePrefix ? `${uniquePrefix}-` : "";
  return `${folder}/${prefix}${safe}`.replace(/\/+/g, "/");
}

/**
 * Build S3 key for profile picture: orgId/hostelId/userId/profile/<filename>
 */
export function buildProfilePicKey(
  orgId: string,
  hostelId: string | number,
  userId: string,
  originalName: string,
  uniquePrefix?: string
): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const prefix = uniquePrefix ? `${uniquePrefix}-` : "";
  return `${orgId}/${hostelId}/${userId}/profile/${prefix}${safe}`.replace(/\/+/g, "/");
}

/**
 * Build S3 key for mess picture: orgId/hostelId/mess/<filename>
 */
export function buildMessPicKey(
  orgId: string,
  hostelId: string | number,
  originalName: string,
  uniquePrefix?: string
): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const prefix = uniquePrefix ? `${uniquePrefix}-` : "";
  return `${orgId}/${hostelId}/mess/${prefix}${safe}`.replace(/\/+/g, "/");
}
