import * as fs from "fs";
import * as path from "path";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { Logger } from "../utils/logger";

/**
 * Performs comprehensive validation of a file:
 * - Checks if file exists
 * - Verifies parent directory exists
 * - Confirms file is readable
 * - Ensures file is not empty
 *
 * @param filePath - Path to the file to validate
 * @returns Promise resolving to true if file is valid
 * @throws ComposerError for any validation failures
 */
export async function validateFile(filePath: string): Promise<boolean> {
  try {
    Logger.debug(`Validating file: ${filePath}`);

    // Verify file existence
    if (!fs.existsSync(filePath)) {
      Logger.debug(`File does not exist: ${filePath}`);
      throw new ComposerError(
        `File '${filePath}' does not exist`,
        ErrorCodes.FILE_NOT_FOUND
      );
    }

    // Verify parent directory existence
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      Logger.error(`Directory does not exist: ${dirPath}`);
      throw new ComposerError(
        `Directory does not exist: ${dirPath}`,
        ErrorCodes.FILE_NOT_FOUND
      );
    }

    // Check file permissions
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (error) {
      Logger.error(`File is not readable: ${filePath}`);
      throw new ComposerError(
        `File '${filePath}' is not readable`,
        ErrorCodes.INVALID_FILE,
        error
      );
    }

    // Verify file has content
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      Logger.error(`File is empty: ${filePath}`);
      throw new ComposerError(
        `File '${filePath}' is empty`,
        ErrorCodes.INVALID_FILE
      );
    }
    Logger.debug(`File '${filePath}' is valid and readable`);
    return true;
  } catch (error) {
    Logger.debug("Error during file validation");
    Logger.debugObject("Error details", error);

    if (error instanceof ComposerError) {
      throw error;
    }
    throw new ComposerError(
      "Error validating file",
      ErrorCodes.INVALID_FILE,
      error
    );
  }
}

/**
 * Validates that the CSV delimiter is a single character.
 *
 * @param delimiter - Character to be used as CSV delimiter
 * @returns true if delimiter is valid
 * @throws ComposerError if delimiter is invalid
 */
export function validateDelimiter(delimiter: string): boolean {
  Logger.info(`Validating delimiter: '${delimiter}'`);

  if (!delimiter || delimiter.length !== 1) {
    Logger.debug("Invalid delimiter: must be a single character");
    throw new ComposerError(
      "Delimiter must be a single character",
      ErrorCodes.INVALID_ARGS
    );
  }

  Logger.debug("Delimiter validation successful");
  return true;
}
