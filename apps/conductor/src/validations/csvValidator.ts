import { Client } from "@elastic/elasticsearch";
import { ErrorFactory } from "../utils/errors";
import { VALIDATION_CONSTANTS } from "./constants";
import { Logger } from "../utils/logger";
import * as path from "path";

/**
 * Module for validating CSV files against structural and naming rules.
 * Enhanced with ErrorFactory for better user feedback and actionable suggestions.
 */

/**
 * Validates CSV headers against naming conventions and rules.
 * Provides detailed, actionable feedback for common issues.
 *
 * @param headers - Array of header strings to validate
 * @param filePath - Optional file path for context in error messages
 * @returns Promise resolving to true if all headers are valid
 * @throws Enhanced ConductorError with specific suggestions if validation fails
 */
export async function validateCSVStructure(
  headers: string[],
  filePath?: string
): Promise<boolean> {
  const fileName = filePath ? path.basename(filePath) : "CSV file";
  Logger.debug`Validating CSV structure with ${headers.length} headers`;

  try {
    // Clean and filter headers
    const cleanedHeaders = headers
      .map((header) => header.trim())
      .filter((header) => header !== "");

    // Validate basic header presence
    if (cleanedHeaders.length === 0) {
      throw ErrorFactory.csv(
        `No valid headers found in ${fileName}`,
        filePath,
        1,
        [
          "Ensure the first row contains column headers",
          "Check that headers are not empty or whitespace-only",
          "Verify the file has proper CSV structure",
          "Inspect the file manually to check format",
        ]
      );
    }

    if (cleanedHeaders.length !== headers.length) {
      const emptyCount = headers.length - cleanedHeaders.length;

      throw ErrorFactory.csv(
        `${emptyCount} empty or whitespace-only headers detected in ${fileName}`,
        filePath,
        1,
        [
          `Remove ${emptyCount} empty column(s) from the header row`,
          "Ensure all columns have meaningful names",
          "Check for extra commas or delimiters in the header row",
          "Verify the CSV delimiter is correct",
        ]
      );
    }

    // Validate headers against all rules with detailed feedback
    const validationIssues = analyzeHeaderIssues(cleanedHeaders);

    if (validationIssues.invalidHeaders.length > 0) {
      const suggestions = generateHeaderSuggestions(validationIssues);

      throw ErrorFactory.csv(
        `Invalid header names detected in ${fileName}`,
        filePath,
        1,
        suggestions
      );
    }

    // Check for duplicate headers
    const duplicateIssues = findDuplicateHeaders(cleanedHeaders);
    if (duplicateIssues.duplicates.length > 0) {
      throw ErrorFactory.csv(
        `Duplicate headers found in ${fileName}`,
        filePath,
        1,
        [
          `Remove duplicate columns: ${duplicateIssues.duplicates.join(", ")}`,
          "Each column must have a unique name",
          "Consider adding suffixes to distinguish similar columns (e.g., name_1, name_2)",
          "Check for accidental copy-paste errors in headers",
        ]
      );
    }

    // Optional: Check for generic headers and provide suggestions
    const genericHeaders = findGenericHeaders(cleanedHeaders);
    if (genericHeaders.length > 0) {
      Logger.warn`Generic headers detected in ${fileName}: ${genericHeaders.join(
        ", "
      )}`;
      Logger.tipString(
        "Consider using more descriptive column names for better data organization"
      );
    }

    Logger.debug`CSV header structure validation passed for ${fileName}`;
    Logger.debugObject("Valid Headers", cleanedHeaders);

    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    throw ErrorFactory.csv(
      `Error validating CSV structure in ${fileName}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      filePath,
      1,
      [
        "Check file format and encoding (should be UTF-8)",
        "Verify CSV structure is valid",
        "Ensure headers follow naming conventions",
        "Try opening the file in a text editor to inspect manually",
      ]
    );
  }
}

/**
 * Validates CSV headers against Elasticsearch index mappings.
 * Provides specific guidance for mapping mismatches.
 *
 * @param client - Elasticsearch client instance
 * @param headers - Array of CSV headers to validate
 * @param indexName - Target Elasticsearch index name
 * @param filePath - Optional file path for context
 * @returns Promise resolving to true if headers are compatible
 * @throws Enhanced errors with mapping-specific guidance
 */
export async function validateHeadersMatchMappings(
  client: Client,
  headers: string[],
  indexName: string,
  filePath?: string
): Promise<boolean> {
  const fileName = filePath ? path.basename(filePath) : "CSV file";
  Logger.debug`Validating headers against index ${indexName} mappings`;

  try {
    // Try to get mappings from the existing index
    const { body } = await client.indices.getMapping({
      index: indexName,
    });

    // Type-safe navigation
    const mappings = body[indexName]?.mappings;
    if (!mappings) {
      throw ErrorFactory.index(
        `No mappings found for index '${indexName}'`,
        indexName,
        [
          `Create the index with proper mappings first`,
          `Check index name spelling: '${indexName}'`,
          "List available indices: GET /_cat/indices",
          "Use a different index name with --index parameter",
        ]
      );
    }

    // Navigate to the nested properties
    const expectedFields = mappings.properties?.data?.properties
      ? Object.keys(mappings.properties.data.properties)
      : [];

    Logger.debug`Found ${expectedFields.length} fields in index '${indexName}' mapping`;

    // Clean up headers for comparison
    const cleanedHeaders = headers
      .map((header: string) => header.trim())
      .filter((header: string) => header !== "");

    if (cleanedHeaders.length === 0) {
      throw ErrorFactory.csv(
        `No valid headers found in ${fileName}`,
        filePath,
        1,
        [
          "Ensure the CSV has proper column headers",
          "Check the first row of the file",
          "Verify CSV format and delimiter",
        ]
      );
    }

    // Analyze header/mapping compatibility
    const compatibility = analyzeHeaderMappingCompatibility(
      cleanedHeaders,
      expectedFields,
      fileName,
      indexName
    );

    // Handle significant mismatches
    if (compatibility.hasSignificantMismatch) {
      throw ErrorFactory.validation(
        `Significant header/field mismatch between ${fileName} and index '${indexName}'`,
        {
          extraHeaders: compatibility.extraHeaders,
          missingFields: compatibility.missingFields,
          expectedFields,
          foundHeaders: cleanedHeaders,
          file: filePath,
        },
        [
          `CSV has ${compatibility.extraHeaders.length} extra headers not in index mapping`,
          `Index expects ${compatibility.missingFields.length} fields not in CSV`,
          "Consider updating the index mapping or modifying the CSV structure",
          `Extra headers: ${compatibility.extraHeaders.slice(0, 5).join(", ")}${
            compatibility.extraHeaders.length > 5 ? "..." : ""
          }`,
          `Missing fields: ${compatibility.missingFields
            .slice(0, 5)
            .join(", ")}${compatibility.missingFields.length > 5 ? "..." : ""}`,
          "Use --force to proceed anyway (may result in indexing issues)",
        ]
      );
    }

    // Log warnings for minor mismatches
    if (compatibility.extraHeaders.length > 0) {
      Logger.warn`Extra headers in ${fileName} not in index mapping: ${compatibility.extraHeaders.join(
        ", "
      )}`;
      Logger.tipString(
        "These fields will be added to documents but may not be properly indexed"
      );
    }

    if (compatibility.missingFields.length > 0) {
      Logger.warn`Missing fields from index mapping in ${fileName}: ${compatibility.missingFields.join(
        ", "
      )}`;
      Logger.tipString(
        "Data for these fields will be null in the indexed documents"
      );
    }

    Logger.debug`Headers validated against index mapping for ${fileName}`;
    return true;
  } catch (error: any) {
    // Enhanced error handling for index-specific issues
    if (error.meta?.body?.error?.type === "index_not_found_exception") {
      throw ErrorFactory.index(
        `Index '${indexName}' does not exist`,
        indexName,
        [
          `Create the index first: PUT /${indexName}`,
          "Check index name spelling and case sensitivity",
          "List available indices: GET /_cat/indices",
          "Use a different index name with --index parameter",
          `Example: conductor upload -f ${fileName} --index my-data-index`,
        ]
      );
    }

    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    throw ErrorFactory.connection(
      `Error validating headers against index '${indexName}': ${
        error instanceof Error ? error.message : String(error)
      }`,
      "Elasticsearch",
      undefined,
      [
        "Check Elasticsearch connectivity",
        "Verify index exists and is accessible",
        "Confirm proper authentication",
        "Check network and firewall settings",
      ]
    );
  }
}

/**
 * Analyze header issues for detailed feedback
 */
function analyzeHeaderIssues(headers: string[]) {
  const invalidHeaders: string[] = [];
  const issues: Record<string, string[]> = {};

  headers.forEach((header: string) => {
    const headerIssues: string[] = [];

    // Check for invalid characters
    const hasInvalidChars = VALIDATION_CONSTANTS.INVALID_CHARS.some((char) =>
      header.includes(char)
    );
    if (hasInvalidChars) {
      const foundChars = VALIDATION_CONSTANTS.INVALID_CHARS.filter((char) =>
        header.includes(char)
      );
      headerIssues.push(
        `contains invalid characters: ${foundChars.join(", ")}`
      );
    }

    // Check length
    if (Buffer.from(header).length > VALIDATION_CONSTANTS.MAX_HEADER_LENGTH) {
      headerIssues.push(
        `too long (${Buffer.from(header).length} > ${
          VALIDATION_CONSTANTS.MAX_HEADER_LENGTH
        } chars)`
      );
    }

    // Check reserved words
    if (VALIDATION_CONSTANTS.RESERVED_WORDS.includes(header.toLowerCase())) {
      headerIssues.push("is a reserved word");
    }

    // Check GraphQL naming
    if (!VALIDATION_CONSTANTS.GRAPHQL_NAME_PATTERN.test(header)) {
      headerIssues.push(
        "doesn't follow naming pattern (use letters, numbers, underscores only)"
      );
    }

    if (headerIssues.length > 0) {
      invalidHeaders.push(header);
      issues[header] = headerIssues;
    }
  });

  return { invalidHeaders, issues };
}

/**
 * Generate specific suggestions based on header validation issues
 */
function generateHeaderSuggestions(validationIssues: any): string[] {
  const suggestions: string[] = [];

  suggestions.push(
    `Fix these ${validationIssues.invalidHeaders.length} invalid header(s):`
  );

  Object.entries(validationIssues.issues).forEach(
    ([header, issues]: [string, any]) => {
      suggestions.push(`  • "${header}": ${issues.join(", ")}`);
    }
  );

  suggestions.push("Header naming rules:");
  suggestions.push("  - Use only letters, numbers, and underscores");
  suggestions.push("  - Start with a letter or underscore");
  suggestions.push(
    "  - Avoid special characters: " +
      VALIDATION_CONSTANTS.INVALID_CHARS.join(" ")
  );
  suggestions.push(
    "  - Keep under " + VALIDATION_CONSTANTS.MAX_HEADER_LENGTH + " characters"
  );
  suggestions.push(
    "  - Avoid reserved words: " +
      VALIDATION_CONSTANTS.RESERVED_WORDS.join(", ")
  );

  return suggestions;
}

/**
 * Find duplicate headers with counts
 */
function findDuplicateHeaders(headers: string[]) {
  const headerCounts: Record<string, number> = headers.reduce(
    (acc: Record<string, number>, header: string) => {
      acc[header] = (acc[header] || 0) + 1;
      return acc;
    },
    {}
  );

  const duplicates = Object.entries(headerCounts)
    .filter(([_, count]) => count > 1)
    .map(([header, count]) => `${header} (${count}x)`);

  return {
    duplicates: duplicates.map((d) => d.split(" (")[0]),
    counts: headerCounts,
  };
}

/**
 * Find generic headers that could be improved
 */
function findGenericHeaders(headers: string[]): string[] {
  const genericPatterns = [
    /^col\d*$/i,
    /^column\d*$/i,
    /^field\d*$/i,
    /^\d+$/,
    /^[a-z]$/i,
  ];

  return headers.filter(
    (header) =>
      genericPatterns.some((pattern) => pattern.test(header)) ||
      ["data", "value", "item", "element", "entry"].includes(
        header.toLowerCase()
      )
  );
}

/**
 * Analyze compatibility between CSV headers and index mapping
 */
function analyzeHeaderMappingCompatibility(
  headers: string[],
  expectedFields: string[],
  fileName: string,
  indexName: string
) {
  // Check for extra headers not in the mapping
  const extraHeaders = headers.filter(
    (header: string) => !expectedFields.includes(header)
  );

  // Check for fields in the mapping that aren't in the headers
  const missingFields = expectedFields.filter(
    (field: string) =>
      field !== "submission_metadata" && !headers.includes(field)
  );

  // Determine if this is a significant mismatch
  const hasSignificantMismatch =
    extraHeaders.length > expectedFields.length * 0.5 ||
    missingFields.length > expectedFields.length * 0.5;

  return {
    extraHeaders,
    missingFields,
    hasSignificantMismatch,
  };
}
