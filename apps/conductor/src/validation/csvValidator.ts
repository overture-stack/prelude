import * as fs from "fs";
import chalk from "chalk";
import { Client } from "@elastic/elasticsearch";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { parseCSVLine } from "../utils/csvParser";
import { VALIDATION_CONSTANTS } from "./constants";

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
 * @throws ComposerError if headers are invalid or file can't be read
 */
export async function validateCSVHeaders(
  filePath: string,
  delimiter: string
): Promise<boolean> {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const [headerLine] = fileContent.split("\n");

    if (!headerLine) {
      throw new ComposerError(
        "CSV file is empty or has no headers",
        ErrorCodes.INVALID_FILE
      );
    }

    const headers = parseCSVLine(headerLine, delimiter, true)[0];
    if (!headers) {
      throw new ComposerError(
        "Failed to parse CSV headers",
        ErrorCodes.INVALID_FILE
      );
    }

    return validateCSVStructure(headers);
  } catch (error) {
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
export async function validateCSVStructure(
  headers: string[]
): Promise<boolean> {
  try {
    // Clean and filter headers
    const cleanedHeaders = headers
      .map((header) => header.trim())
      .filter((header) => header !== "");

    // Validate basic header presence
    if (cleanedHeaders.length === 0) {
      throw new ComposerError(
        "No valid headers found in CSV file",
        ErrorCodes.VALIDATION_FAILED
      );
    }

    if (cleanedHeaders.length !== headers.length) {
      throw new ComposerError(
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
      .map(([header]) => header);

    if (duplicates.length > 0) {
      throw new ComposerError(
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
      console.log(chalk.yellow("\n⚠️  Warning: Generic headers detected"));
      genericHeaders.forEach((header) => {
        console.log(chalk.yellow(`├─ Generic header: "${header}"`));
      });
      console.log(chalk.cyan("Consider using more descriptive column names\n"));
    }

    console.log(chalk.green("✓ CSV header structure is valid"));
    return true;
  } catch (error) {
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

/**
 * Validates CSV headers against Elasticsearch index mappings.
 * Ensures CSV structure matches expected index fields.
 *
 * @param client - Elasticsearch client instance
 * @param headers - Array of CSV headers to validate
 * @param indexName - Target Elasticsearch index name
 * @returns Promise resolving to true if headers match mappings
 * @throws ComposerError if validation fails
 */
export async function validateHeadersMatchMappings(
  client: Client,
  headers: string[],
  indexName: string
): Promise<boolean> {
  try {
    const { body: mappingResponse } = await client.indices.getMapping({
      index: indexName,
    });

    const mappings = mappingResponse[indexName].mappings;
    const expectedFields = mappings.properties?.data?.properties
      ? Object.keys(mappings.properties.data.properties)
      : Object.keys(mappings.properties || {});

    const cleanedHeaders = headers
      .map((header) => header.trim())
      .filter((header) => header !== "");

    if (cleanedHeaders.length === 0) {
      throw new ComposerError(
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

    if (extraHeaders.length > 0 || missingRequiredFields.length > 0) {
      throw new ComposerError(
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

    console.log(chalk.green("✓ Headers validated against index mapping"));
    return true;
  } catch (error) {
    if (error instanceof ComposerError) {
      throw error;
    }
    throw new ComposerError(
      "Error validating headers against index",
      ErrorCodes.VALIDATION_FAILED,
      error
    );
  }
}
