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
import { ErrorFactory } from "../utils/errors";
import { ALLOWED_EXTENSIONS } from "./constants";

/**
 * Validates that files exist, have proper extensions, and are accessible.
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
      missingExtensions.push(filePath);
      continue;
    }

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      invalidExtensions.push(`${filePath} (${extension})`);
      continue;
    }

    if (!fs.existsSync(filePath)) {
      notFoundFiles.push(filePath);
      continue;
    }
  }

  const errors: string[] = [];

  if (missingExtensions.length > 0) {
    errors.push(
      `Missing file extension for: ${missingExtensions.join(
        ", "
      )}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}`
    );
  }

  if (invalidExtensions.length > 0) {
    errors.push(
      `Invalid file extensions: ${invalidExtensions.join(
        ", "
      )}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}`
    );
  }

  if (notFoundFiles.length > 0) {
    errors.push(
      `the following files were not found: ${notFoundFiles.join(", ")}`
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a single file with comprehensive checks
 */
export async function validateFile(filePath: string): Promise<boolean> {
  try {
    Logger.debug`Validating file: ${filePath}`;

    // Check file exists
    if (!fs.existsSync(filePath)) {
      throw ErrorFactory.file(`File '${filePath}' does not exist`, filePath, [
        "Check the file path for typos",
        "Ensure the file hasn't been moved or deleted",
        "Use absolute paths if relative paths are problematic",
      ]);
    }

    // Check file permissions
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (error) {
      throw ErrorFactory.file(`File '${filePath}' is not readable`, filePath, [
        "Check file permissions",
        "Ensure the file is not locked by another application",
        "Try running with elevated permissions if necessary",
      ]);
    }

    // Check file has content
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw ErrorFactory.file(`File '${filePath}' is empty`, filePath, [
        "Ensure the file contains data",
        "Verify the file was saved properly",
      ]);
    }

    Logger.debug`File '${filePath}' is valid and readable`;
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    throw ErrorFactory.file("Error validating file", filePath, [
      "Check that the file exists and is accessible",
      "Verify file permissions and format",
    ]);
  }
}
