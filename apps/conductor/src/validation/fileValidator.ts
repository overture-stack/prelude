import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { ComposerError, ErrorCodes } from "../utils/errors";

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
    // Verify file existence
    if (!fs.existsSync(filePath)) {
      throw new ComposerError(
        `File '${filePath}' does not exist`,
        ErrorCodes.FILE_NOT_FOUND
      );
    }

    // Verify parent directory existence
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      throw new ComposerError(
        `Directory does not exist: ${dirPath}`,
        ErrorCodes.FILE_NOT_FOUND
      );
    }

    // Check file permissions
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (error) {
      throw new ComposerError(
        `File '${filePath}' is not readable`,
        ErrorCodes.INVALID_FILE,
        error
      );
    }

    // Verify file has content
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new ComposerError(
        `File '${filePath}' is empty`,
        ErrorCodes.INVALID_FILE
      );
    }

    console.log(chalk.green(`✓ File '${filePath}' is valid and readable`));
    return true;
  } catch (error) {
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
 * Validates directory existence and creation
 * Creates directory if it doesn't exist and recursive is true
 *
 * @param dirPath - Path to directory to validate
 * @param recursive - Whether to create parent directories if they don't exist
 * @returns Promise resolving to true if directory is valid/created
 * @throws ComposerError if validation or creation fails
 */
export async function validateDirectory(
  dirPath: string,
  recursive = false
): Promise<boolean> {
  try {
    if (!fs.existsSync(dirPath)) {
      if (recursive) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(chalk.green(`✓ Created directory: ${dirPath}`));
      } else {
        throw new ComposerError(
          `Directory does not exist: ${dirPath}`,
          ErrorCodes.FILE_NOT_FOUND
        );
      }
    }

    // Verify directory is writable
    try {
      fs.accessSync(dirPath, fs.constants.W_OK);
    } catch (error) {
      throw new ComposerError(
        `Directory '${dirPath}' is not writable`,
        ErrorCodes.INVALID_FILE,
        error
      );
    }

    console.log(chalk.green(`✓ Directory '${dirPath}' is valid and writable`));
    return true;
  } catch (error) {
    if (error instanceof ComposerError) {
      throw error;
    }
    throw new ComposerError(
      "Error validating directory",
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
  if (!delimiter || delimiter.length !== 1) {
    throw new ComposerError(
      "Delimiter must be a single character",
      ErrorCodes.INVALID_ARGS
    );
  }
  return true;
}
