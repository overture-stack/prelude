import * as fs from "fs";
import { ErrorFactory } from "../utils/errors"; // UPDATED: Import ErrorFactory
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
      Logger.debug`CSV file is empty or has no headers`;
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.file("CSV file is empty or has no headers", filePath, [
        "Ensure the CSV file contains at least one row of headers",
        "Check that the file is not corrupted",
        "Verify the file encoding is UTF-8",
      ]);
    }

    const headers = parseCSVLine(headerLine, delimiter, true)[0];
    if (!headers) {
      Logger.debug`Failed to parse CSV headers`;
      // UPDATED: Use ErrorFactory with helpful suggestions
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

    if (error instanceof Error && error.name === "ComposerError") {
      throw error;
    }
    // UPDATED: Use ErrorFactory
    throw ErrorFactory.validation("Error validating CSV headers", error, [
      "Check that the file exists and is readable",
      "Verify the CSV format is correct",
      "Ensure proper file permissions",
    ]);
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
    Logger.debug`Starting CSV structure validation`;

    // Clean and filter headers
    const cleanedHeaders = headers
      .map((header) => header.trim())
      .filter((header) => header !== "");

    // Validate basic header presence
    if (cleanedHeaders.length === 0) {
      Logger.debug`No valid headers found in CSV file`;
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.validation(
        "No valid headers found in CSV file",
        undefined,
        [
          "Ensure the first row contains column headers",
          "Check that headers are not empty or whitespace-only",
          "Verify the CSV format is correct",
        ]
      );
    }

    if (cleanedHeaders.length !== headers.length) {
      Logger.debug`Empty or whitespace-only headers detected`;
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.validation(
        "Empty or whitespace-only headers detected",
        { originalCount: headers.length, cleanedCount: cleanedHeaders.length },
        [
          "Remove empty header columns",
          "Ensure all headers have meaningful names",
          "Check for trailing commas in the header row",
        ]
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
      Logger.debug`Invalid headers detected`;
      Logger.fileList("The following header(s) are invalid", invalidHeaders);
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.validation(
        "Invalid header names detected",
        { invalidHeaders },
        [
          "Use only letters, numbers, and underscores in header names",
          "Headers must start with a letter or underscore",
          "Avoid reserved words like _id, _type, etc.",
          "Remove special characters and spaces from headers",
          `Keep header names under ${maxLength} characters`,
        ]
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
      Logger.debug`Duplicate headers found`;
      Logger.debugObject("Duplicate headers", {
        duplicates,
        counts: headerCounts,
      });
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.validation(
        "Duplicate headers found in CSV file",
        { duplicates, counts: headerCounts },
        [
          "Ensure all column headers are unique",
          "Remove or rename duplicate headers",
          "Check for accidentally repeated columns",
        ]
      );
    }

    Logger.debug`CSV header structure is valid`;
    return true;
  } catch (error) {
    Logger.debug`Error during CSV structure validation`;
    Logger.debugObject("Error details", error);

    if (error instanceof Error && error.name === "ComposerError") {
      throw error;
    }
    // UPDATED: Use ErrorFactory
    throw ErrorFactory.validation("Error validating CSV structure", error, [
      "Check the CSV file format",
      "Verify headers follow naming conventions",
      "Ensure no duplicate or invalid headers",
    ]);
  }
}
