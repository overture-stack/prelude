/**
 * Validation Module
 *
 * A comprehensive set of validation utilities for ensuring data integrity,
 * system readiness, and configuration correctness.
 */

export * from "./csvValidator";
export * from "./elasticsearchValidator";
export * from "./fileValidator";
export * from "./environment";

// Add central file validation utility
import * as fs from "fs";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { Logger } from "../utils/logger";

/**
 * Validates that a file exists, is readable, and has content
 *
 * @param filePath - Path to the file to validate
 * @throws ConductorError if validation fails
 */
export function validateFile(filePath: string): void {
  if (!filePath) {
    throw new ConductorError("No file path provided", ErrorCodes.INVALID_ARGS);
  }

  Logger.debug(`Validating file: ${filePath}`);

  // Check existence
  if (!fs.existsSync(filePath)) {
    Logger.error(`File not found: ${filePath}`);
    throw new ConductorError(
      `File not found: ${filePath}`,
      ErrorCodes.FILE_NOT_FOUND
    );
  }

  // Check readability
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch (error) {
    Logger.error(`File is not readable: ${filePath}`);
    throw new ConductorError(
      `File '${filePath}' is not readable`,
      ErrorCodes.INVALID_FILE,
      error
    );
  }

  // Check if empty
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    Logger.error(`File is empty: ${filePath}`);
    throw new ConductorError(
      `File '${filePath}' is empty`,
      ErrorCodes.INVALID_FILE
    );
  }

  Logger.debug(`File validation passed: ${filePath}`);
}

/**
 * Validates that a delimiter is a single character
 */
export function validateDelimiter(delimiter: string): void {
  if (!delimiter || delimiter.length !== 1) {
    throw new ConductorError(
      "Delimiter must be a single character",
      ErrorCodes.INVALID_ARGS
    );
  }
  Logger.debug(`Delimiter validated: '${delimiter}'`);
}
