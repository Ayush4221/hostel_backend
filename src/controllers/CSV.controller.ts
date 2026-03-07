import fs from "fs";
import csvParser from "csv-parser";
import { Request, Response } from "express";
import { CSVImportService } from "../services/CSVImportService.js";
import type { CSVUserRow } from "../services/CSVImportService.js";
import { deleteFromUploads } from "../middleware/upload.middleware.js";
import {
  CSV_FILE_REQUIRED,
  ONLY_CSV_ALLOWED,
  CSV_PROCESSED_SUCCESS,
  ERROR_DURING_CSV_IMPORT,
  CSV_PARSE_ERROR,
} from "../utils/constants/messages.js";

const csvImportService = new CSVImportService();

export const importOrUpdateUsersFromCSV = async (req: Request, res: Response) => {
  const filePath = req.file?.path;
  if (!filePath) {
    return res.status(400).json({ error: CSV_FILE_REQUIRED });
  }
  const allowedMime = ["text/csv", "application/csv", "application/vnd.ms-excel"];
  if (req.file?.mimetype && !allowedMime.includes(req.file.mimetype)) {
    deleteFromUploads(filePath);
    return res.status(400).json({ error: ONLY_CSV_ALLOWED });
  }

  const users: CSVUserRow[] = [];

  try {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row: Record<string, string>) => {
        users.push({
          email: row.email ?? "",
          password: row.password ?? "",
          firstName: row.firstName ?? "",
          lastName: row.lastName ?? "",
          role: row.role ?? "",
          roomNumber: row.roomNumber,
        });
      })
      .on("end", async () => {
        try {
          const result = await csvImportService.importUsers(users);
          res.status(200).json({
            message: CSV_PROCESSED_SUCCESS,
            insertedCount: result.insertedCount,
            updatedCount: result.updatedCount,
            errors: result.errors,
          });
        } finally {
          deleteFromUploads(filePath);
        }
      })
      .on("error", (err) => {
        deleteFromUploads(filePath);
        res.status(500).json({ error: err.message || "CSV parse error" });
      });
  } catch (error) {
    deleteFromUploads(filePath);
    res.status(500).json({ error: ERROR_DURING_CSV_IMPORT });
  }
};
