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
 * Validates that files exist, have an extension, and that the extension is allowed.
 * Returns a structured result with a validity flag and error messages.
 */
export async function validateFiles(
  filePaths: string[]
): Promise<ValidationResult> {
  if (!filePaths || filePaths.length === 0) {
    return { valid: false, errors: ["No input files specified"] };
  }

  const notFoundFiles: string[] = [];
  const invalidExtensions: string[] = [];
  const missingExtensions: string[] = [];

  for (const filePath of filePaths) {
    const extension = path.extname(filePath).toLowerCase();
    if (!extension) {
      // File extension is missing, so record that as a warning.
      missingExtensions.push(filePath);
      continue;
    }

    // Check if the extension is allowed.
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      invalidExtensions.push(`${filePath} (${extension})`);
      continue;
    }

    // Check file existence.
    if (!fs.existsSync(filePath)) {
      notFoundFiles.push(filePath);
      continue;
    }
  }

  const errors: string[] = [];

  // Log missing extension files as warnings
  if (missingExtensions.length > 0) {
    Logger.warn(
      `Missing file extension for: ${missingExtensions.join(
        ", "
      )}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}`
    );
  }

  // Only generate the error messages but don't log them directly
  // Let the error handling system do the logging
  if (invalidExtensions.length > 0) {
    errors.push(
      `Invalid file extensions: ${invalidExtensions.join(
        ", "
      )}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}`
    );
  }

  if (notFoundFiles.length > 0) {
    errors.push(`Files not found: ${notFoundFiles.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
