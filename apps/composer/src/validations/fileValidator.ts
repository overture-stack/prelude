import * as fs from "fs";
import * as path from "path";
import { ErrorFactory } from "../utils/errors"; // UPDATED: Import ErrorFactory
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
    Logger.debug`Validating file: ${filePath}`;

    // Verify file existence
    if (!fs.existsSync(filePath)) {
      Logger.debug`File does not exist: ${filePath}`;
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.file(`File '${filePath}' does not exist`, filePath, [
        "Check the file path for typos",
        "Ensure the file hasn't been moved or deleted",
        "Verify you're in the correct directory",
        "Use absolute paths if relative paths are problematic",
      ]);
    }

    // Verify parent directory existence
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      Logger.error`Directory does not exist: ${dirPath}`;
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.file(`Directory does not exist: ${dirPath}`, dirPath, [
        "Check that the parent directory exists",
        "Ensure the full path is correct",
        "Create the directory if it's missing",
      ]);
    }

    // Check file permissions
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (error) {
      Logger.error`File is not readable: ${filePath}`;
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.file(`File '${filePath}' is not readable`, filePath, [
        "Check file permissions (chmod +r on Unix/Linux/Mac)",
        "Ensure the file is not locked by another application",
        "Verify you have read access to the file",
        "Try running with elevated permissions if necessary",
      ]);
    }

    // Verify file has content
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      Logger.error`File is empty: ${filePath}`;
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.file(`File '${filePath}' is empty`, filePath, [
        "Ensure the file contains data",
        "Check if the file was corrupted during transfer",
        "Verify the file was saved properly",
        "Use a non-empty file for processing",
      ]);
    }
    Logger.debug`File '${filePath}' is valid and readable`;
    return true;
  } catch (error) {
    Logger.debug`Error during file validation`;
    Logger.debugObject("Error details", error);

    if (error instanceof Error && error.name === "ComposerError") {
      throw error;
    }
    // UPDATED: Use ErrorFactory
    throw ErrorFactory.file("Error validating file", filePath, [
      "Check that the file exists and is accessible",
      "Verify file permissions and format",
      "Ensure the path is correct",
    ]);
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
  Logger.info`Validating delimiter: '${delimiter}'`;

  if (!delimiter || delimiter.length !== 1) {
    Logger.debug`Invalid delimiter: must be a single character`;
    // UPDATED: Use ErrorFactory with helpful suggestions
    throw ErrorFactory.args("Delimiter must be a single character", [
      "Use a single character for the delimiter",
      "Common delimiters: ',' (comma), ';' (semicolon), '\\t' (tab)",
      "Example: --delimiter ','",
      "For tab delimiter use: --delimiter $'\\t'",
    ]);
  }

  Logger.debug`Delimiter validation successful`;
  return true;
}
