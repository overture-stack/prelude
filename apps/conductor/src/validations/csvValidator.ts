import * as fs from "fs";
import { ErrorFactory } from "../utils/errors";
import { parseCSVLine } from "../services/csvProcessor/csvParser"; // Updated import
import { Logger } from "../utils/logger";

/**
 * Validates the header structure of a CSV file.
 * Reads the first line of the file and validates the headers.
 *
 * @param filePath - Path to the CSV file
 * @param delimiter - Character used to separate values in the CSV
 * @returns Promise resolving to true if headers are valid
 * @throws ConductorError if headers are invalid or file can't be read
 */
export async function validateCSVHeaders(
  filePath: string,
  delimiter: string
): Promise<boolean> {
  try {
    Logger.debug`Validating CSV headers for file: ${filePath}`;
    Logger.debug`Using delimiter: '${delimiter}'`;

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const [headerLine] = fileContent.split("\n");

    if (!headerLine) {
      Logger.debug`CSV file is empty or has no headers`;
      throw ErrorFactory.file("CSV file is empty or has no headers", filePath, [
        "Ensure the CSV file contains at least one row of headers",
        "Check that the file is not corrupted",
        "Verify the file encoding is UTF-8",
      ]);
    }

    const headers = parseCSVLine(headerLine, delimiter, true)[0];
    if (!headers) {
      Logger.debug`Failed to parse CSV headers`;
      throw ErrorFactory.file("Failed to parse CSV headers", filePath, [
        "Check that the delimiter is correct",
        "Ensure headers don't contain unescaped quotes",
        "Verify the CSV format is valid",
      ]);
    }

    Logger.debug`Parsed headers: ${headers.join(", ")}`;
    return validateCSVStructure(headers);
  } catch (error) {
    Logger.debug`Error during CSV header validation`;
    Logger.debugObject("Error details", error);

    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }
    throw ErrorFactory.validation("Error validating CSV headers", error, [
      "Check that the file exists and is readable",
      "Verify the CSV format is correct",
      "Ensure proper file permissions",
    ]);
  }
}

/**
 * Validates CSV headers against naming conventions and rules.
 * Enhanced with ErrorFactory patterns for consistent error handling.
 *
 * @param headers - Array of header strings from CSV file
 * @returns boolean indicating if headers are valid
 * @throws ConductorError if headers fail validation
 */
export function validateCSVStructure(headers: string[]): boolean {
  try {
    Logger.debug`Validating CSV structure with ${headers.length} headers`;

    // Enhanced validation: Check for empty headers
    if (!headers || headers.length === 0) {
      throw ErrorFactory.csv("CSV file has no headers", undefined, 1, [
        "Ensure the CSV file contains column headers",
        "Check that the first row is not empty",
        "Verify the CSV format is correct",
      ]);
    }

    // Enhanced validation: Check for duplicate headers
    const duplicateHeaders = headers.filter(
      (header, index) => headers.indexOf(header) !== index
    );
    if (duplicateHeaders.length > 0) {
      throw ErrorFactory.csv(
        `Duplicate headers found: ${[...new Set(duplicateHeaders)].join(", ")}`,
        undefined,
        1,
        [
          "Ensure all column headers are unique",
          "Remove or rename duplicate headers",
          "Check for extra spaces in header names",
        ]
      );
    }

    // Enhanced validation: Check for empty/whitespace headers
    const emptyHeaders = headers.filter(
      (header, index) => !header || header.trim() === ""
    );
    if (emptyHeaders.length > 0) {
      throw ErrorFactory.csv(
        `Empty headers detected (${emptyHeaders.length} of ${headers.length})`,
        undefined,
        1,
        [
          "Ensure all columns have header names",
          "Remove empty columns from the CSV",
          "Check for extra delimiters in the header row",
        ]
      );
    }

    // Enhanced validation: Check for headers with special characters that might cause issues
    const problematicHeaders = headers.filter((header) => {
      const trimmed = header.trim();
      return (
        trimmed.includes(",") ||
        trimmed.includes(";") ||
        trimmed.includes("\t") ||
        trimmed.includes("\n") ||
        trimmed.includes("\r")
      );
    });

    if (problematicHeaders.length > 0) {
      Logger.warn`Headers contain special characters: ${problematicHeaders.join(
        ", "
      )}`;
      Logger.tipString(
        "Consider renaming headers to avoid commas, semicolons, tabs, or line breaks"
      );
    }

    // Enhanced validation: Check for very long headers
    const longHeaders = headers.filter((header) => header.length > 100);
    if (longHeaders.length > 0) {
      Logger.warn`Very long headers detected (>100 chars): ${longHeaders
        .map((h) => h.substring(0, 50) + "...")
        .join(", ")}`;
      Logger.tipString(
        "Consider shortening header names for better readability"
      );
    }

    Logger.debug`CSV structure validation passed: ${headers.length} valid headers`;
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    throw ErrorFactory.csv(
      `CSV structure validation failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      undefined,
      1,
      [
        "Check CSV header format and structure",
        "Ensure headers are properly formatted",
        "Verify no special characters in headers",
        "Review CSV file for formatting issues",
      ]
    );
  }
}
