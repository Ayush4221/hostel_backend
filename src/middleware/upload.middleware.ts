import type { Request, Response, NextFunction } from "express";
import formidable from "formidable";
import type { Fields, Files } from "formidable";
import path from "path";
import fs from "fs";
import { FAILED_TO_PARSE_UPLOAD } from "../utils/constants/messages.js";

export interface UploadedFile {
  /** Path on server (uploads folder). Must be deleted after S3 upload or on failure. */
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
}

declare global {
  namespace Express {
    interface Request {
      file?: UploadedFile;
      body?: Record<string, string | string[]>;
    }
  }
}

const uploadDir = path.join(process.cwd(), "uploads");
function ensureUploadDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

/**
 * Flow: file lands on server (uploads folder) → controller uploads to S3 → controller
 * deletes from uploads. On any failure, controller must delete from uploads (revert).
 * Response is sent after S3 upload and delete complete.
 */
export function parseMultipart(options?: { maxFileSize?: number; fieldName?: string }) {
  const maxFileSize = options?.maxFileSize ?? 10 * 1024 * 1024; // 10 MB
  const fieldName = options?.fieldName ?? "file";

  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return next();
    }
    ensureUploadDir();

    const form = formidable({
      uploadDir,
      maxFileSize,
      keepExtensions: true,
      multiples: false,
    });

    form.parse(req, (err: Error | null, fields: Fields, files: Files) => {
      if (err) {
        return res.status(400).json({ message: err.message || FAILED_TO_PARSE_UPLOAD });
      }
      req.body = Object.fromEntries(
        Object.entries(fields).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
      ) as Record<string, string>;
      const file = files[fieldName];
      if (file) {
        const f = Array.isArray(file) ? file[0] : file;
        if (f && f.filepath) {
          req.file = {
            path: f.filepath,
            originalname: f.originalFilename || "unknown",
            mimetype: f.mimetype || "application/octet-stream",
            size: f.size ?? 0,
          };
        }
      }
      next();
    });
  };
}

export function parseSingleImage(fieldName: string = "file") {
  return parseMultipart({ maxFileSize: 5 * 1024 * 1024, fieldName });
}

export function parseCsvUpload() {
  return parseMultipart({
    maxFileSize: 2 * 1024 * 1024,
    fieldName: "file",
  });
}

/** Delete file from uploads folder (revert). Safe to call if path is missing or already deleted. */
export function deleteFromUploads(filePath: string | undefined): void {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
}
