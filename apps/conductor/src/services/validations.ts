import { Client } from "@elastic/elasticsearch";
import chalk from "chalk";
import * as fs from "fs";
import { Config } from "../types";

/**
 * Validation Utilities for CSV Processing Pipeline
 *
 * This module provides a comprehensive set of validation functions to ensure
 * data integrity, system readiness, and configuration correctness before
 * processing CSV files into Elasticsearch.
 *
 * Key Validation Checks:
 * - File existence and readability
 * - Elasticsearch cluster connection
 * - CSV structure and header validation
 * - Batch size configuration
 * - Index existence and accessibility
 * - Delimiter configuration
 *
 * Features:
 * - Detailed error and warning messages
 * - Interactive feedback during validation
 * - Checks for common configuration issues
 * - Helps prevent processing errors early in the pipeline
 *
 * Each validation function:
 * - Returns a boolean indicating pass/fail status
 * - Writes descriptive messages to stdout
 * - Provides actionable feedback for troubleshooting
 */

/**
 * Validates file accessibility and content
 *
 * Performs multiple checks to ensure the file:
 * - Exists on the file system
 * - Is readable by the current process
 * - Is not empty
 *
 * @param filePath Full path to the file to be validated
 * @returns Promise resolving to boolean validation status
 */
export async function validateFile(filePath: string): Promise<boolean> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      process.stdout.write(
        chalk.red(`\n❌ Error: File '${filePath}' does not exist\n\n`)
      );
      return false;
    }

    // Check if file is readable
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (error) {
      process.stdout.write(
        chalk.red(`\n❌ Error: File '${filePath}' is not readable\n\n`)
      );
      return false;
    }

    // Check if file is empty
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      process.stdout.write(
        chalk.red(`\n❌ Error: File '${filePath}' is empty\n\n`)
      );
      return false;
    }

    // Success message
    process.stdout.write(
      chalk.green("✓ File ") +
        chalk.yellow(`'${filePath}'`) +
        chalk.green(" is valid and readable.\n")
    );
    return true;
  } catch (error) {
    process.stdout.write(chalk.red(`\n❌ Error validating file: ${error}\n\n`));
    return false;
  }
}

/**
 * Validates connection to Elasticsearch cluster
 *
 * Checks:
 * - Ability to connect to the cluster
 * - Retrieves cluster health information
 * - Provides detailed error messages for common connection issues
 *
 * @param client Elasticsearch client instance
 * @param config Configuration object containing connection details
 * @returns Promise resolving to boolean connection status
 */
export async function validateElasticsearchConnection(
  client: Client,
  config: Config
): Promise<boolean> {
  try {
    // Test connection to Elasticsearch
    const { body: health } = await client.cluster.health();
    process.stdout.write(
      chalk.green(`\n✓ Connection to Elasticsearch successful.\n`)
    );
    return true;
  } catch (error: any) {
    // Type as any for error handling
    process.stdout.write(
      chalk.red("\n❌ Error connecting to Elasticsearch:\n\n")
    );
    if (error?.name === "ConnectionError") {
      process.stdout.write(
        chalk.yellow("Could not connect to Elasticsearch. Please check:\n")
      );
      process.stdout.write("1. Elasticsearch is running\n");
      process.stdout.write(
        `2. The URL is correct: ${config.elasticsearch.url}\n`
      );
      process.stdout.write("3. Network connectivity\n");
    } else if (error?.name === "AuthenticationException") {
      process.stdout.write(
        chalk.yellow("Authentication failed. Please check:\n")
      );
      process.stdout.write("1. Username is correct\n");
      process.stdout.write("2. Password is correct\n");
      process.stdout.write("3. User has sufficient permissions\n");
    } else {
      process.stdout.write(chalk.yellow("Error details:\n"));
      console.error(error);
    }
    return false;
  }
}

/**
 * Validates CSV header structure
 *
 * Checks:
 * - Presence of headers
 * - No duplicate headers
 * - No empty or whitespace-only headers
 *
 * @param headers Array of CSV headers to validate
 * @returns Promise resolving to boolean validation status
 */

export async function validateCSVStructure(
  headers: string[]
): Promise<boolean> {
  try {
    // Remove empty strings and trim whitespace
    const cleanedHeaders = headers
      .map((header) => header.trim())
      .filter((header) => header !== "");

    // Check if we have the expected number of headers
    if (cleanedHeaders.length === 0) {
      process.stdout.write(
        chalk.red("\n❌ Error: No valid headers found in CSV file\n\n")
      );
      return false;
    }

    // Check if the number of cleaned headers matches the original headers
    if (cleanedHeaders.length !== headers.length) {
      process.stdout.write(
        chalk.red("\n❌ Error: Empty or whitespace-only headers detected\n\n")
      );
      process.stdout.write(chalk.yellow("Problematic headers are:\n"));

      headers.forEach((header: string, index: number) => {
        if (header.trim() === "") {
          process.stdout.write(
            chalk.yellow(`├─ Column ${index + 1}: Empty header\n\n`)
          );
        }
      });

      process.stdout.write(chalk.cyan("\nSuggestions:\n"));
      process.stdout.write("1. Remove empty columns from the CSV file\n");
      process.stdout.write("2. Ensure each column has a meaningful name\n");
      process.stdout.write("3. Check your CSV export settings\n");

      return false;
    }

    // Validation constants
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
      // Elasticsearch reserved
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
      // GraphQL reserved
      "__typename",
      "__schema",
      "__type",
    ];

    // GraphQL compliant name pattern
    const graphqlNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

    const invalidHeaders = cleanedHeaders.filter((header: string) => {
      // Check for invalid characters
      const hasInvalidChars = invalidChars.some((char) =>
        header.includes(char)
      );
      // Check length
      const isTooLong = Buffer.from(header).length > maxLength;
      // Check if it's a reserved word
      const isReserved = reservedWords.includes(header.toLowerCase());
      // Check if it matches GraphQL naming pattern
      const isValidGraphQLName = graphqlNamePattern.test(header);

      return hasInvalidChars || isTooLong || isReserved || !isValidGraphQLName;
    });

    if (invalidHeaders.length > 0) {
      process.stdout.write(
        chalk.red("\n❌ Error: Invalid header names detected\n\n")
      );
      process.stdout.write(
        chalk.yellow("The following headers are invalid:\n")
      );

      invalidHeaders.forEach((header: string) => {
        process.stdout.write(chalk.yellow(`├─ "${header}"\n`));
        if (Buffer.from(header).length > maxLength) {
          process.stdout.write(
            chalk.yellow(`   ↳ Exceeds maximum length of ${maxLength} bytes\n`)
          );
        }
        if (reservedWords.includes(header.toLowerCase())) {
          process.stdout.write(
            chalk.yellow(
              `   ↳ Is a reserved field name (Elasticsearch/GraphQL)\n`
            )
          );
        }
        if (!graphqlNamePattern.test(header)) {
          process.stdout.write(
            chalk.yellow(
              `   ↳ Must match pattern: start with letter/underscore, contain only letters/numbers/underscores\n`
            )
          );
        }
        const foundInvalidChars = invalidChars.filter((char) =>
          header.includes(char)
        );
        if (foundInvalidChars.length > 0) {
          process.stdout.write(
            chalk.yellow(
              `   ↳ Contains invalid characters: ${foundInvalidChars.join(
                " "
              )}\n`
            )
          );
        }
      });

      process.stdout.write(chalk.cyan("\nSuggestions:\n"));
      process.stdout.write("1. Use only letters, numbers, and underscores\n");
      process.stdout.write(
        "2. Start field names with a letter or underscore\n"
      );
      process.stdout.write("3. Keep field names under 255 bytes\n");
      process.stdout.write(
        "4. Avoid Elasticsearch and GraphQL reserved words\n"
      );
      process.stdout.write("5. Follow pattern: ^[A-Za-z_][A-Za-z0-9_]*$\n\n");

      return false;
    }

    // Count header occurrences for duplicates
    const headerCounts: Record<string, number> = cleanedHeaders.reduce(
      (acc: Record<string, number>, header: string) => {
        acc[header] = (acc[header] || 0) + 1;
        return acc;
      },
      {}
    );

    // Find duplicate headers
    const duplicates = Object.entries(headerCounts)
      .filter(([_, count]) => count > 1)
      .map(([header, _]) => header);

    if (duplicates.length > 0) {
      process.stdout.write(
        chalk.red("\n❌ Error: Duplicate headers found in CSV file\n\n")
      );

      duplicates.forEach((header) => {
        process.stdout.write(
          chalk.yellow(
            `├─ Duplicate header: "${header}" appears ${headerCounts[header]} times\n`
          )
        );
      });

      process.stdout.write(chalk.cyan("\nSuggestions:\n"));
      process.stdout.write("1. Remove duplicate columns from the CSV file\n");
      process.stdout.write("2. Ensure each column has a unique name\n");
      process.stdout.write("3. Check your CSV export settings\n");

      return false;
    }

    // Optional: Suggest renaming generic headers
    const genericHeaderWarnings = cleanedHeaders.filter((header) =>
      ["0", "1", "2", "col1", "col2", "column1", "column2"].includes(
        header.toLowerCase()
      )
    );

    if (genericHeaderWarnings.length > 0) {
      process.stdout.write(
        chalk.yellow("\n⚠️  Warning: Generic headers detected\n")
      );
      genericHeaderWarnings.forEach((header) => {
        process.stdout.write(chalk.yellow(`├─ Generic header: "${header}"\n`));
      });
      process.stdout.write(
        chalk.cyan("Consider using more descriptive column names\n\n")
      );
    }

    process.stdout.write(chalk.green("\n✓ CSV header structure is valid.\n\n"));
    return true;
  } catch (error) {
    process.stdout.write(
      chalk.red(`\n❌ Error validating CSV structure: ${error}\n\n`)
    );
    return false;
  }
}

/**
 * Validates batch size configuration
 *
 * Checks:
 * - Batch size is a positive number
 * - Warns about potentially problematic large batch sizes
 *
 * @param batchSize Configured batch size to validate
 * @returns Boolean indicating if batch size is valid
 */
export function validateBatchSize(batchSize: number): boolean {
  if (isNaN(batchSize) || batchSize < 1) {
    process.stdout.write(chalk.red("\n❌ Error: Invalid batch size\n\n"));
    process.stdout.write(
      chalk.yellow("Batch size must be a positive number\n")
    );
    return false;
  }

  if (batchSize > 10000) {
    process.stdout.write(
      chalk.yellow("\n⚠️  Warning: Large batch size detected\n")
    );
    process.stdout.write(
      "Large batch sizes may cause memory issues or timeouts\n"
    );
    process.stdout.write("Recommended batch size is between 500 and 5000\n");
  }

  return true;
}

/**
 * Validates Elasticsearch index
 *
 * Checks:
 * - Index existence
 * - Retrieves and displays available indices if not found
 *
 * @param client Elasticsearch client instance
 * @param indexName Name of the index to validate
 * @returns Promise resolving to boolean index validation status
 */
export async function validateIndex(
  client: Client,
  indexName: string
): Promise<boolean> {
  try {
    // Check if index exists
    const exists = await client.indices.exists({ index: indexName });

    if (!exists.body) {
      // Get list of available indices
      const { body } = await client.cat.indices({ format: "json", v: true });

      process.stdout.write(
        chalk.red(`\n❌ Error: Index '${indexName}' does not exist\n\n`)
      );
      process.stdout.write(chalk.yellow("Available indices:\n"));

      // Filter and sort indices
      const filteredIndices = body
        .filter((idx: any) => {
          const name = idx.index;
          return (
            !name.startsWith(".") && // Remove system indices
            !name.endsWith("_arranger_set")
          ); // Remove arranger sets
        })
        .sort((a: any, b: any) => a.index.localeCompare(b.index));

      filteredIndices.forEach((idx: any) => {
        process.stdout.write(chalk.cyan(`├─ ${idx.index}\n`));
      });

      return false;
    }

    // Get index settings and mappings for additional validation if needed
    await client.indices.get({
      index: indexName,
      include_type_name: false,
    });

    // Log index details
    process.stdout.write(
      chalk.green("\n✓ ") +
        chalk.yellow(`'${indexName}'`) +
        chalk.green(" exists and is valid.\n")
    );
    return true;
  } catch (error) {
    process.stdout.write(
      chalk.red(`\n❌ Error validating index: ${error}\n\n`)
    );
    return false;
  }
}

export async function checkElasticsearchIndex(
  client: Client,
  indexName: string
): Promise<boolean> {
  try {
    const indexExists = await client.indices.exists({
      index: indexName,
    });

    if (!indexExists.body) {
      const { body } = await client.cat.indices({
        format: "json",
        v: true,
      });

      process.stdout.write(
        chalk.red(`\n❌ Error: Index '${indexName}' does not exist\n\n`)
      );
      process.stdout.write(chalk.yellow("Available indices:\n"));

      // Filter and sort indices
      const filteredIndices = body
        .filter((idx: any) => {
          const indexName = idx.index;
          return (
            !indexName.startsWith(".") && // Remove system indices
            !indexName.endsWith("_arranger_set")
          ); // Remove arranger sets
        })
        .sort((a: any, b: any) => a.index.localeCompare(b.index));

      filteredIndices.forEach((idx: any) => {
        process.stdout.write(chalk.cyan(`├─ ${idx.index}\n`));
      });

      process.stdout.write(
        chalk.yellow(
          "\nPlease specify one of the above indices using the -i option\n"
        )
      );
      return false;
    }

    process.stdout.write(chalk.green(`✓ Index '${indexName}' found\n`));
    return true;
  } catch (error) {
    process.stdout.write(
      chalk.red("\n❌ Error checking Elasticsearch indices: ") + error + "\n\n"
    );
    throw error;
  }
}

/**
 * Validates CSV headers against the existing index mapping
 *
 * @param client Elasticsearch client
 * @param headers Array of CSV headers to validate
 * @param indexName Name of the target Elasticsearch index
 * @returns Promise resolving to boolean indicating header validity
 */

export async function validateHeadersMatchMappings(
  client: Client,
  headers: string[],
  indexName: string
): Promise<boolean> {
  try {
    // Retrieve the current index mapping
    const { body: mappingResponse } = await client.indices.getMapping({
      index: indexName,
    });

    const mappings = mappingResponse[indexName].mappings;

    // If a root "data" object exists, use its properties for comparison.
    let expectedFields: string[] = [];
    if (
      mappings.properties &&
      mappings.properties.data &&
      (mappings.properties.data as any).properties
    ) {
      expectedFields = Object.keys(
        (mappings.properties.data as any).properties
      );
    } else {
      expectedFields = Object.keys(mappings.properties || {});
    }

    // Clean headers to remove any extra whitespace or empty strings
    const cleanedHeaders = headers
      .map((header) => header.trim())
      .filter((header) => header !== "");

    if (cleanedHeaders.length === 0) {
      process.stdout.write(chalk.red("\n❌ No valid headers found\n\n"));
      return false;
    }

    // Find headers in CSV that don't exist in expectedFields
    const extraHeaders = cleanedHeaders.filter(
      (header) => !expectedFields.includes(header)
    );

    // Find expected fields that are missing in the CSV headers, ignoring "submission_metadata"
    const missingRequiredFields = expectedFields.filter(
      (field) =>
        field !== "submission_metadata" && !cleanedHeaders.includes(field)
    );

    if (extraHeaders.length > 0 || missingRequiredFields.length > 0) {
      process.stdout.write(
        chalk.red("\n❌ Header/Field Mismatch Detected:\n\n")
      );

      // Display CSV headers with match status
      process.stdout.write(chalk.yellow.bold.underline("CSV headers:\n\n"));
      cleanedHeaders.forEach((header) => {
        const matchStatus = expectedFields.includes(header)
          ? chalk.green("✓ ")
          : chalk.red("✗ ");
        process.stdout.write(matchStatus + header + "\n");
      });

      // Report missing required fields (ignoring "submission_metadata")
      if (missingRequiredFields.length > 0) {
        process.stdout.write(
          chalk.yellow.bold.underline("\nMissing required headers in CSV:\n\n")
        );
        missingRequiredFields.forEach((field) => {
          process.stdout.write(chalk.red("✗ ") + chalk.white(`${field}\n`));
        });
      }

      // Report extra fields in CSV that are not expected
      if (extraHeaders.length > 0) {
        process.stdout.write(
          chalk.yellow.bold.underline("\nUnexpected headers in CSV:\n\n")
        );
        extraHeaders.forEach((field) => {
          process.stdout.write(chalk.red("✗ ") + chalk.white(`${field}\n`));
        });
      }

      return false;
    }

    process.stdout.write(
      chalk.green("✓ All headers validated against the index mapping\n\n")
    );
    return true;
  } catch (error) {
    process.stdout.write(
      chalk.red("\n❌ Error validating headers against index:\n\n")
    );
    console.error(error);
    return false;
  }
}

/**
 * Validates CSV delimiter configuration
 *
 * Checks:
 * - Delimiter is a single character
 *
 * @param delimiter Delimiter to validate
 * @returns Boolean indicating if delimiter is valid
 */
export function validateDelimiter(delimiter: string): boolean {
  if (!delimiter || delimiter.length !== 1) {
    process.stdout.write(chalk.red("\n❌ Error: Invalid delimiter\n\n"));
    process.stdout.write(
      chalk.yellow("Delimiter must be a single character\n")
    );
    return false;
  }
  return true;
}
