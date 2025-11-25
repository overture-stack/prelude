import * as fs from "fs";
import { Client } from "@elastic/elasticsearch";
import { ErrorFactory } from "../utils/errors";
import { parseCSVLine } from "../services/csvProcessor/csvParser";
import { VALIDATION_CONSTANTS } from "./constants";
import { Logger } from "../utils/logger";

/**
 * Module for validating CSV files against structural and naming rules.
 * Includes validation for headers, content structure, and naming conventions.
 * Updated to throw errors for header mismatches and provide detailed logging.
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
 * ASSUMES index already exists and has been validated elsewhere.
 * Updated to throw errors for header mismatches with detailed logging.
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
    // Get mappings from the existing index (assume it exists)
    const { body } = await client.indices.getMapping({
      index: indexName,
    });

    // Type-safe navigation
    const mappings = body[indexName]?.mappings;
    if (!mappings) {
      throw ErrorFactory.validation(
        "No mappings found for the specified index",
        { indexName, availableIndices: Object.keys(body) },
        [
          "Index may not have proper mappings defined",
          "Check index configuration in Elasticsearch",
        ]
      );
    }

    // Navigate to the nested properties
    const expectedFields = mappings.properties?.data?.properties
      ? Object.keys(mappings.properties.data.properties)
      : [];

    Logger.debug`Found ${expectedFields.length} fields in existing index mapping`;
    Logger.debug`Expected fields: ${expectedFields.join(", ")}`;

    // Clean up headers for comparison
    const cleanedHeaders = headers
      .map((header: string) => header.trim())
      .filter((header: string) => header !== "");

    Logger.debug`Cleaned headers: ${cleanedHeaders.join(", ")}`;

    if (cleanedHeaders.length === 0) {
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

    // Filter out submission_metadata from expected fields as it's auto-added
    const requiredFields = expectedFields.filter(
      (field: string) => field !== "submission_metadata"
    );

    Logger.debug`Required fields (excluding submission_metadata): ${requiredFields.join(
      ", "
    )}`;

    // Check for extra headers not in the mapping
    const extraHeaders = cleanedHeaders.filter(
      (header: string) => !requiredFields.includes(header)
    );

    Logger.debug`Extra headers found: ${extraHeaders.join(", ")}`;

    // Check for fields in the mapping that aren't in the headers
    const missingRequiredFields = requiredFields.filter(
      (field: string) => !cleanedHeaders.includes(field)
    );

    Logger.debug`Missing required fields: ${missingRequiredFields.join(", ")}`;

    // If there are any mismatches, throw an error with concise information
    if (extraHeaders.length > 0 || missingRequiredFields.length > 0) {
      // Log concise header mismatch information
      Logger.errorString(
        "CSV headers do not match Elasticsearch index mapping"
      );

      // Show only the problematic headers in a combined format
      if (extraHeaders.length > 0 && missingRequiredFields.length > 0) {
        if (extraHeaders.length > 0) {
          Logger.suggestion("Extra headers (in CSV, not in mapping):");
          extraHeaders.forEach((header) => {
            Logger.generic(`   ▸ ${header}`);
          });
        }

        if (missingRequiredFields.length > 0) {
          Logger.suggestion(
            "Missing headers (required by mapping, missing from CSV):"
          );
          missingRequiredFields.forEach((field) => {
            Logger.generic(`   ▸ ${field}`);
          });
        }
      } else {
        // Show suggestions separately if only one type of issue
        if (extraHeaders.length > 0) {
          Logger.suggestion("Extra Headers in CSV (not in mapping)");
          extraHeaders.forEach((header) => {
            Logger.generic(`   ▸ ${header}`);
          });
        }

        if (missingRequiredFields.length > 0) {
          Logger.suggestion("Missing Headers from CSV (required by mapping)");
          missingRequiredFields.forEach((field) => {
            Logger.generic(`  ▸ ${field}`);
          });
        }
      }

      // Calculate variables for error details
      const totalRequiredFields = requiredFields.length;
      const totalProvidedHeaders = cleanedHeaders.length;
      const matchingHeaders = cleanedHeaders.filter((header) =>
        requiredFields.includes(header)
      ).length;

      const errorDetails = {
        indexName,
        headersProvided: cleanedHeaders,
        headersMissing: missingRequiredFields,
        headersExpected: requiredFields,
        extraHeaders,
        missingRequiredFields,
        totalProvidedHeaders,
        totalRequiredFields,
        matchingHeaders,
      };

      throw ErrorFactory.validation(
        "Header validation failed - upload stopped",
        errorDetails,
        [] // Empty suggestions to avoid duplicate logging since we already showed the fix above
      );
    }

    Logger.debug`Headers validated against index mapping - perfect match!`;
    return true;
  } catch (error: any) {
    // If it's already a ConductorError, just rethrow it
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
      "Error validating headers against index mapping",
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
