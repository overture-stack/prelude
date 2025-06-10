import * as fs from "fs";
import { Client } from "@elastic/elasticsearch";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { parseCSVLine } from "../services/csvProcessor/csvParser";
import { VALIDATION_CONSTANTS } from "./constants";
import { Logger } from "../utils/logger";

/**
 * Module for validating CSV files against structural and naming rules.
 * Includes validation for headers, content structure, and naming conventions.
 */

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
    // Try to get mappings from the existing index
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

    Logger.debug`Found ${expectedFields.length} fields in existing index mapping`;

    // Clean up headers for comparison
    const cleanedHeaders = headers
      .map((header: string) => header.trim())
      .filter((header: string) => header !== "");

    if (cleanedHeaders.length === 0) {
      Logger.error`No valid headers found`;
      throw new ConductorError(
        "No valid headers found",
        ErrorCodes.VALIDATION_FAILED
      );
    }

    // Check for extra headers not in the mapping
    const extraHeaders = cleanedHeaders.filter(
      (header: string) => !expectedFields.includes(header)
    );

    // Check for fields in the mapping that aren't in the headers
    const missingRequiredFields = expectedFields.filter(
      (field: string) =>
        field !== "submission_metadata" && !cleanedHeaders.includes(field)
    );

    // Log appropriate warnings
    if (extraHeaders.length > 0) {
      Logger.warn`Extra headers not in index mapping: ${extraHeaders.join(
        ", "
      )}`;
      Logger.tip`These fields will be added to documents but may not be properly indexed`;
    }

    if (missingRequiredFields.length > 0) {
      Logger.warn`Missing fields from index mapping: ${missingRequiredFields.join(
        ", "
      )}`;
      Logger.tip`Data for these fields will be null in the indexed documents`;
    }

    // Raise error if there's a significant mismatch between the headers and mapping
    if (
      extraHeaders.length > expectedFields.length * 0.5 ||
      missingRequiredFields.length > expectedFields.length * 0.5
    ) {
      Logger.error`Significant header/field mismatch detected`;
      throw new ConductorError(
        "Significant header/field mismatch detected - the CSV structure doesn't match the index mapping",
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
  } catch (error: any) {
    // If the index doesn't exist, provide a clear error
    if (
      error.meta &&
      error.meta.body &&
      error.meta.body.error.type === "index_not_found_exception"
    ) {
      Logger.error`Index ${indexName} does not exist`;
      throw new ConductorError(
        `Index ${indexName} does not exist - create it first or use a different index name`,
        ErrorCodes.INDEX_NOT_FOUND
      );
    }

    // Type-safe error handling for other errors
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
