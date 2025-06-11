/**
 * File Validator
 *
 * Validates file existence, permissions, and basic properties
 * before processing CSV files into Elasticsearch.
 * Enhanced with ErrorFactory patterns while maintaining original scope.
 */

import * as fs from "fs";
import * as path from "path";
import { ValidationResult } from "../types/validations";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import { ALLOWED_EXTENSIONS } from "./constants";

/**
 * Validates that files exist, have an extension, and that the extension is allowed.
 * Returns a structured result with a validity flag and error messages.
 * Enhanced with better error messages but maintains original return structure.
 */
export async function validateFiles(
  filePaths: string[]
): Promise<ValidationResult> {
  if (!filePaths || filePaths.length === 0) {
    return {
      valid: false,
      errors: [
        "No input files specified - use -f or --file to specify CSV files",
      ],
    };
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
      invalidExtensions.push(`${path.basename(filePath)} (${extension})`);
      continue;
    }

    // Check file existence.
    if (!fs.existsSync(filePath)) {
      notFoundFiles.push(path.basename(filePath));
      continue;
    }
  }

  const errors: string[] = [];

  // Log missing extension files as warnings (maintain original behavior)
  if (missingExtensions.length > 0) {
    const missingList = missingExtensions
      .map((f) => path.basename(f))
      .join(", ");
    const allowedList = ALLOWED_EXTENSIONS.join(", ");
    Logger.warn`Missing file extension for: ${missingList}. Allowed extensions: ${allowedList}`;
  }

  // Enhanced error messages but same structure
  if (invalidExtensions.length > 0) {
    errors.push(
      `Invalid file extensions: ${invalidExtensions.join(
        ", "
      )}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}`
    );
  }

  if (notFoundFiles.length > 0) {
    errors.push(
      `Files not found: ${notFoundFiles.join(
        ", "
      )}. Check file paths and permissions.`
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Enhanced single file validation helper (new utility, doesn't change existing API)
 */
export function validateSingleFile(filePath: string, fileType?: string): void {
  const fileName = path.basename(filePath);
  const typeDescription = fileType || "file";

  if (!filePath) {
    throw ErrorFactory.args(
      `${typeDescription} path not specified`,
      undefined,
      [
        `Provide a ${typeDescription} path`,
        "Check command line arguments",
        `Example: --${typeDescription.toLowerCase()}-file example.json`,
      ]
    );
  }

  if (!fs.existsSync(filePath)) {
    throw ErrorFactory.file(
      `${typeDescription} not found: ${fileName}`,
      filePath,
      [
        "Check that the file path is correct",
        "Ensure the file exists at the specified location",
        "Verify file permissions allow read access",
        `Current directory: ${process.cwd()}`,
      ]
    );
  }

  // Check file readability
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch (error) {
    throw ErrorFactory.file(
      `${typeDescription} is not readable: ${fileName}`,
      filePath,
      [
        "Check file permissions",
        "Ensure the file is not locked by another process",
        "Verify you have read access to the file",
      ]
    );
  }

  // Check file size
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    throw ErrorFactory.file(
      `${typeDescription} is empty: ${fileName}`,
      filePath,
      [
        `Ensure the ${typeDescription.toLowerCase()} contains data`,
        "Check if the file was properly created",
        "Verify the file is not corrupted",
      ]
    );
  }

  Logger.debug`${typeDescription} validated: ${fileName}`;
}
