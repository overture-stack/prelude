import * as fs from "fs";
import { Client } from "@elastic/elasticsearch";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { parseCSVLine } from "../csvProcessor/csvParser";
import { VALIDATION_CONSTANTS } from "./constants";
import { Logger } from "../utils/logger";

/**
 * Module for validating CSV files against structural and naming rules.
 * Includes validation for headers, content structure, and naming conventions.
 */

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
  Logger.debug`Validating CSV headers in ${filePath} with delimiter '${delimiter}'`;

  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const [headerLine] = fileContent.split("\n");

    if (!headerLine) {
      throw new ConductorError(
        "CSV file is empty or has no headers",
        ErrorCodes.INVALID_FILE
      );
    }

    const parseResult = parseCSVLine(headerLine, delimiter, true);
    if (!parseResult || !parseResult[0]) {
      throw new ConductorError(
        "Failed to parse CSV headers",
        ErrorCodes.INVALID_FILE
      );
    }

    const headers = parseResult[0];
    Logger.debug`Found ${headers.length} headers in CSV file`;

    return validateCSVStructure(headers);
  } catch (error) {
    if (error instanceof ConductorError) {
      Logger.error`CSV header validation failed: ${error.message}`;
      throw error;
    }
    Logger.error`Error validating CSV headers: ${
      error instanceof Error ? error.message : String(error)
    }`;
    throw new ConductorError(
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
 * @throws ConductorError with details if validation fails
 */
export async function validateCSVStructure(
  headers: string[]
): Promise<boolean> {
  Logger.debug`Validating CSV structure with ${headers.length} headers`;

  try {
    // Clean and filter headers
    const cleanedHeaders = headers
      .map((header) => header.trim())
      .filter((header) => header !== "");

    // Validate basic header presence
    if (cleanedHeaders.length === 0) {
      throw new ConductorError(
        "No valid headers found in CSV file",
        ErrorCodes.VALIDATION_FAILED
      );
    }

    if (cleanedHeaders.length !== headers.length) {
      Logger.warn`Empty or whitespace-only headers detected`;
      throw new ConductorError(
        "Empty or whitespace-only headers detected",
        ErrorCodes.VALIDATION_FAILED
      );
    }

    // Validate headers against all rules
    const invalidHeaders = cleanedHeaders.filter((header: string) => {
      const hasInvalidChars = VALIDATION_CONSTANTS.INVALID_CHARS.some((char) =>
        header.includes(char)
      );
      const isTooLong =
        Buffer.from(header).length > VALIDATION_CONSTANTS.MAX_HEADER_LENGTH;
      const isReserved = VALIDATION_CONSTANTS.RESERVED_WORDS.includes(
        header.toLowerCase()
      );
      const isValidGraphQLName =
        VALIDATION_CONSTANTS.GRAPHQL_NAME_PATTERN.test(header);

      return hasInvalidChars || isTooLong || isReserved || !isValidGraphQLName;
    });

    if (invalidHeaders.length > 0) {
      Logger.error`Invalid header names detected: ${invalidHeaders.join(", ")}`;
      throw new ConductorError(
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
      .map(([header]) => header);

    if (duplicates.length > 0) {
      Logger.error`Duplicate headers found in CSV file: ${duplicates.join(
        ", "
      )}`;
      throw new ConductorError(
        "Duplicate headers found in CSV file",
        ErrorCodes.VALIDATION_FAILED,
        { duplicates, counts: headerCounts }
      );
    }

    // Optional: Check for generic headers
    const genericHeaders = cleanedHeaders.filter((header) =>
      ["col1", "col2", "column1", "column2", "0", "1", "2"].includes(
        header.toLowerCase()
      )
    );

    if (genericHeaders.length > 0) {
      Logger.warn`Generic headers detected:`;
      genericHeaders.forEach((header) => {
        Logger.warn`Generic header: "${header}"`;
      });
      Logger.tip`Consider using more descriptive column names`;
    }

    Logger.debug`CSV header structure matches valid`;

    // Log all headers in debug mode
    Logger.debugObject("CSV Headers", cleanedHeaders);

    return true;
  } catch (error) {
    if (error instanceof ConductorError) {
      throw error;
    }
    Logger.error`Error validating CSV structure: ${
      error instanceof Error ? error.message : String(error)
    }`;
    throw new ConductorError(
      "Error validating CSV structure",
      ErrorCodes.VALIDATION_FAILED,
      error
    );
  }
}

/**
 * Validates CSV headers against Elasticsearch index mappings.
 * Ensures CSV structure matches expected index fields.
 *
 * @param client - Elasticsearch client instance
 * @param headers - Array of CSV headers to validate
 * @param indexName - Target Elasticsearch index name
 * @returns Promise resolving to true if headers match mappings
 * @throws ConductorError if validation fails
 */
export async function validateHeadersMatchMappings(
  client: Client,
  headers: string[],
  indexName: string
): Promise<boolean> {
  Logger.debug`Validating headers against index ${indexName} mappings`;

  try {
    // Explicitly type the response
    const { body } = await client.indices.getMapping({
      index: indexName,
    });

    // Type-safe navigation
    const mappings = body[indexName]?.mappings;
    if (!mappings) {
      Logger.error`No mappings found for index ${indexName}`;
      throw new ConductorError(
        "No mappings found for the specified index",
        ErrorCodes.VALIDATION_FAILED
      );
    }

    // Navigate to the nested properties
    const expectedFields = mappings.properties?.data?.properties
      ? Object.keys(mappings.properties.data.properties)
      : [];

    Logger.debug`Found ${expectedFields.length} fields in index mapping`;

    const cleanedHeaders = headers
      .map((header) => header.trim())
      .filter((header) => header !== "");

    if (cleanedHeaders.length === 0) {
      Logger.error`No valid headers found`;
      throw new ConductorError(
        "No valid headers found",
        ErrorCodes.VALIDATION_FAILED
      );
    }

    const extraHeaders = cleanedHeaders.filter(
      (header) => !expectedFields.includes(header)
    );

    const missingRequiredFields = expectedFields.filter(
      (field) =>
        field !== "submission_metadata" && !cleanedHeaders.includes(field)
    );

    if (extraHeaders.length > 0) {
      Logger.warn`Extra headers not in index mapping: ${extraHeaders.join(
        ", "
      )}`;
    }

    if (missingRequiredFields.length > 0) {
      Logger.warn`Missing fields from index mapping: ${missingRequiredFields.join(
        ", "
      )}`;
    }

    if (extraHeaders.length > 0 || missingRequiredFields.length > 0) {
      Logger.error`Header/Field mismatch detected`;
      throw new ConductorError(
        "Header/Field mismatch detected",
        ErrorCodes.VALIDATION_FAILED,
        {
          extraHeaders,
          missingRequiredFields,
          details: {
            expected: expectedFields,
            found: cleanedHeaders,
          },
        }
      );
    }

    Logger.debug`Headers validated against index mapping`;
    return true;
  } catch (error) {
    // Type-safe error handling
    if (error instanceof ConductorError) {
      throw error;
    }

    // Add more detailed error logging
    Logger.error`Error validating headers against index: ${
      error instanceof Error ? error.message : String(error)
    }`;
    Logger.debug`Error details: ${
      error instanceof Error ? error.stack : "No stack trace available"
    }`;

    throw new ConductorError(
      "Error validating headers against index",
      ErrorCodes.VALIDATION_FAILED,
      {
        originalError: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : "Unknown Error",
      }
    );
  }
}
