/**
 * File Validator
 *
 * Validates file existence, permissions, and basic properties
 * before processing CSV files into Elasticsearch.
 */

import * as fs from "fs";
import * as path from "path";
import { ValidationResult } from "../types/validations";
import { Logger } from "../utils/logger";
import { ALLOWED_EXTENSIONS } from "./constants";

/**
 * Validates that files exist and have the correct extension
 */
export async function validateFiles(
  filePaths: string[]
): Promise<ValidationResult> {
  Logger.section("File Validation");

  if (!filePaths || filePaths.length === 0) {
    return {
      valid: false,
      errors: ["No input files specified"],
    };
  }

  const notFoundFiles: string[] = [];
  const invalidExtensions: string[] = [];

  for (const filePath of filePaths) {
    // Check file existence
    if (!fs.existsSync(filePath)) {
      notFoundFiles.push(filePath);
      continue;
    }

    // Check file extension
    const extension = path.extname(filePath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      invalidExtensions.push(`${filePath} (${extension})`);
    }
  }

  const errors: string[] = [];

  if (notFoundFiles.length > 0) {
    errors.push(`Files not found: ${notFoundFiles.join(", ")}`);
    Logger.error`Files not found: ${notFoundFiles.length} files`;
    Logger.fileList("Missing files", notFoundFiles);
  }

  if (invalidExtensions.length > 0) {
    errors.push(
      `Invalid file extensions. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`
    );
    Logger.error`Invalid file extensions: ${invalidExtensions.length} files`;
    Logger.fileList("Files with invalid extensions", invalidExtensions);
  }

  const valid = errors.length === 0;

  if (valid) {
    Logger.success`All files valid (${filePaths.length} files)`;
  }

  return { valid, errors };
}

/**
 * Checks if a file is readable by attempting to open and read a portion of it
 */
export async function validateFileReadable(
  filePath: string
): Promise<ValidationResult> {
  try {
    // Try to open the file and read a small chunk
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(1024);
    fs.readSync(fd, buffer, 0, 1024, 0);
    fs.closeSync(fd);

    return { valid: true, errors: [] };
  } catch (error) {
    return {
      valid: false,
      errors: [
        `File ${filePath} is not readable: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
    };
  }
}
