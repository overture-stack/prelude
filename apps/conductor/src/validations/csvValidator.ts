import * as fs from "fs";
import { Client } from "@elastic/elasticsearch";
import { ErrorFactory } from "../utils/errors";
import { parseCSVLine } from "../services/csvProcessor/csvParser";
import { VALIDATION_CONSTANTS } from "./constants";
import { Logger } from "../utils/logger";

/**
 * Module for validating CSV files against structural and naming rules.
 * Includes validation for headers, content structure, and naming conventions.
 * Updated to use error factory pattern for consistent error handling.
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
      throw ErrorFactory.validation(
        "No valid headers found in CSV file",
        { originalHeaders: headers },
        [
          "Ensure the CSV file has column headers",
          "Check that the first row contains header names",
          "Verify the file is not empty or corrupted",
        ]
      );
    }

    if (cleanedHeaders.length !== headers.length) {
      Logger.warnString("Empty or whitespace-only headers detected");
      throw ErrorFactory.validation(
        "Empty or whitespace-only headers detected",
        {
          originalHeaders: headers,
          cleanedHeaders,
          emptyCount: headers.length - cleanedHeaders.length,
        },
        [
          "Remove empty columns from your CSV file",
          "Ensure all columns have descriptive header names",
          "Check for trailing commas in the header row",
        ]
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
      Logger.errorString(
        `Invalid header names detected: ${invalidHeaders.join(", ")}`
      );
      throw ErrorFactory.validation(
        "Invalid header names detected",
        {
          invalidHeaders,
          invalidChars: VALIDATION_CONSTANTS.INVALID_CHARS,
          maxLength: VALIDATION_CONSTANTS.MAX_HEADER_LENGTH,
          reservedWords: VALIDATION_CONSTANTS.RESERVED_WORDS,
        },
        [
          `Remove invalid characters: ${VALIDATION_CONSTANTS.INVALID_CHARS.join(
            ", "
          )}`,
          `Keep header names under ${VALIDATION_CONSTANTS.MAX_HEADER_LENGTH} characters`,
          "Avoid reserved words like 'null', 'undefined', 'class'",
          "Use alphanumeric characters and underscores only",
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
      .map(([header]) => header);

    if (duplicates.length > 0) {
      Logger.errorString(
        `Duplicate headers found in CSV file: ${duplicates.join(", ")}`
      );
      throw ErrorFactory.validation(
        "Duplicate headers found in CSV file",
        { duplicates, headerCounts },
        [
          "Ensure all column headers are unique",
          "Remove or rename duplicate columns",
          "Check for copy-paste errors in header names",
        ]
      );
    }

    // Optional: Check for generic headers
    const genericHeaders = cleanedHeaders.filter((header) =>
      ["col1", "col2", "column1", "column2", "0", "1", "2"].includes(
        header.toLowerCase()
      )
    );

    if (genericHeaders.length > 0) {
      Logger.warnString("Generic headers detected:");
      genericHeaders.forEach((header) => {
        Logger.warnString(`Generic header: "${header}"`);
      });
      Logger.tipString("Consider using more descriptive column names");
    }

    Logger.debug`CSV header structure matches valid`;

    // Log all headers in debug mode
    Logger.debugObject("CSV Headers", cleanedHeaders);

    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }
    Logger.errorString(
      `Error validating CSV structure: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw ErrorFactory.validation(
      "Error validating CSV structure",
      { originalError: error },
      [
        "Check CSV file format and encoding",
        "Verify file is not corrupted",
        "Ensure proper CSV structure with valid headers",
      ]
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
      Logger.errorString(`No mappings found for index ${indexName}`);
      throw ErrorFactory.validation(
        "No mappings found for the specified index",
        { indexName, availableIndices: Object.keys(body) },
        [
          "Check that the index name is correct",
          "Verify the index exists in Elasticsearch",
          "Create the index with proper mappings first",
        ]
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
      Logger.errorString("No valid headers found");
      throw ErrorFactory.validation(
        "No valid headers found",
        { originalHeaders: headers },
        [
          "Ensure CSV file has column headers",
          "Check that headers are not empty or whitespace",
          "Verify CSV file format",
        ]
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
      Logger.warnString(
        `Extra headers not in index mapping: ${extraHeaders.join(", ")}`
      );
      Logger.tipString(
        "These fields will be added to documents but may not be properly indexed"
      );
    }

    if (missingRequiredFields.length > 0) {
      Logger.warnString(
        `Missing fields from index mapping: ${missingRequiredFields.join(", ")}`
      );
      Logger.tipString(
        "Data for these fields will be null in the indexed documents"
      );
    }

    // Raise error if there's a significant mismatch between the headers and mapping
    if (
      extraHeaders.length > expectedFields.length * 0.5 ||
      missingRequiredFields.length > expectedFields.length * 0.5
    ) {
      Logger.errorString("Significant header/field mismatch detected");
      throw ErrorFactory.validation(
        "Significant header/field mismatch detected - the CSV structure doesn't match the index mapping",
        {
          extraHeaders,
          missingRequiredFields,
          expectedFields,
          foundHeaders: cleanedHeaders,
          mismatchPercentage: Math.max(
            (extraHeaders.length / expectedFields.length) * 100,
            (missingRequiredFields.length / expectedFields.length) * 100
          ),
        },
        [
          "Update CSV headers to match the index mapping",
          "Create a new index with mapping that matches your CSV structure",
          `Expected fields: ${expectedFields.join(", ")}`,
          `Found headers: ${cleanedHeaders.join(", ")}`,
        ]
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
      Logger.errorString(`Index ${indexName} does not exist`);
      throw ErrorFactory.validation(
        `Index ${indexName} does not exist`,
        { indexName, errorType: "index_not_found_exception" },
        [
          "Create the index first using Elasticsearch",
          "Use a different existing index name",
          "Check index name spelling and case sensitivity",
        ]
      );
    }

    // Type-safe error handling for other errors
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    // Add more detailed error logging
    Logger.errorString(
      `Error validating headers against index: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    Logger.debugString(
      `Error details: ${
        error instanceof Error ? error.stack : "No stack trace available"
      }`
    );

    throw ErrorFactory.connection(
      "Error validating headers against index",
      {
        indexName,
        originalError: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : "Unknown Error",
      },
      [
        "Check Elasticsearch connection and availability",
        "Verify index permissions and access",
        "Ensure Elasticsearch service is running",
      ]
    );
  }
}
