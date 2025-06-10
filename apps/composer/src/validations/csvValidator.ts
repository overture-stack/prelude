import * as fs from "fs";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { parseCSVLine } from "../utils/csvParser";
import { Logger } from "../utils/logger";

/**
 * Validates the header structure of a CSV file.
 * Reads the first line of the file and validates the headers.
 *
 * @param filePath - Path to the CSV file
 * @param delimiter - Character used to separate values in the CSV
 * @returns Promise resolving to true if headers are valid
 * @throws ComposerError if headers are invalid or file can't be read
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
      Logger.debug("CSV file is empty or has no headers");
      throw new ComposerError(
        "CSV file is empty or has no headers",
        ErrorCodes.INVALID_FILE
      );
    }

    const headers = parseCSVLine(headerLine, delimiter, true)[0];
    if (!headers) {
      Logger.debug("Failed to parse CSV headers");
      throw new ComposerError(
        "Failed to parse CSV headers",
        ErrorCodes.INVALID_FILE
      );
    }

    Logger.debug`Parsed headers: ${headers.join(", ")}`;
    return validateCSVStructure(headers);
  } catch (error) {
    Logger.debug("Error during CSV header validation");
    Logger.debugObject("Error details", error);

    if (error instanceof ComposerError) {
      throw error;
    }
    throw new ComposerError(
      "Error validating CSV headers",
      ErrorCodes.VALIDATION_FAILED,
      error
    );
  }
}

/**
 * Validates CSV headers against naming conventions and rules.
 * Checks:
 * - Special character restrictions
 * - Maximum length limits
 * - Reserved word restrictions
 * - GraphQL naming conventions
 * - Duplicate prevention
 *
 * @param headers - Array of header strings to validate
 * @returns Promise resolving to true if all headers are valid
 * @throws ComposerError with details if validation fails
 */
async function validateCSVStructure(headers: string[]): Promise<boolean> {
  try {
    Logger.debug("Starting CSV structure validation");

    // Clean and filter headers
    const cleanedHeaders = headers
      .map((header) => header.trim())
      .filter((header) => header !== "");

    // Validate basic header presence
    if (cleanedHeaders.length === 0) {
      Logger.debug("No valid headers found in CSV file");
      throw new ComposerError(
        "No valid headers found in CSV file",
        ErrorCodes.VALIDATION_FAILED
      );
    }

    if (cleanedHeaders.length !== headers.length) {
      Logger.debug("Empty or whitespace-only headers detected");
      throw new ComposerError(
        "Empty or whitespace-only headers detected",
        ErrorCodes.VALIDATION_FAILED
      );
    }

    // Define validation rules
    const invalidChars = [
      ":",
      ">",
      "<",
      ".",
      " ",
      ",",
      "/",
      "\\",
      "?",
      "#",
      "[",
      "]",
      "{",
      "}",
      '"',
      "*",
      "|",
      "+",
      "@",
      "&",
      "(",
      ")",
      "!",
      "^",
    ];
    const maxLength = 255;
    const reservedWords = [
      "_type",
      "_id",
      "_source",
      "_all",
      "_parent",
      "_field_names",
      "_routing",
      "_index",
      "_size",
      "_timestamp",
      "_ttl",
      "_meta",
      "_doc",
      "__typename",
      "__schema",
      "__type",
    ];
    const graphqlNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

    // Validate headers against all rules
    const invalidHeaders = cleanedHeaders.filter((header: string) => {
      const hasInvalidChars = invalidChars.some((char) =>
        header.includes(char)
      );
      const isTooLong = Buffer.from(header).length > maxLength;
      const isReserved = reservedWords.includes(header.toLowerCase());
      const isValidGraphQLName = graphqlNamePattern.test(header);
      return hasInvalidChars || isTooLong || isReserved || !isValidGraphQLName;
    });

    if (invalidHeaders.length > 0) {
      Logger.debug("Invalid headers detected");
      Logger.fileList("The following header(s) are invalid", invalidHeaders);
      throw new ComposerError(
        "Invalid header names detected",
        ErrorCodes.VALIDATION_FAILED,
        { invalidHeaders }
      );
    }

    // Check for duplicate headers
    const headerCounts: Record<string, number> = cleanedHeaders.reduce(
      (acc: Record<string, number>, header: string) => {
        acc[header] = (acc[header] || 0) + 1;
        return acc;
      },
      {}
    );

    const duplicates = Object.entries(headerCounts)
      .filter(([_, count]) => count > 1)
      .map(([header, _]) => header);

    if (duplicates.length > 0) {
      Logger.debug("Duplicate headers found");
      Logger.debugObject("Duplicate headers", {
        duplicates,
        counts: headerCounts,
      });
      throw new ComposerError(
        "Duplicate headers found in CSV file",
        ErrorCodes.VALIDATION_FAILED,
        { duplicates, counts: headerCounts }
      );
    }

    Logger.debug("CSV header structure is valid");
    return true;
  } catch (error) {
    Logger.debug("Error during CSV structure validation");
    Logger.debugObject("Error details", error);

    if (error instanceof ComposerError) {
      throw error;
    }
    throw new ComposerError(
      "Error validating CSV structure",
      ErrorCodes.VALIDATION_FAILED,
      error
    );
  }
}
