import chalk from "chalk";
import type { ElasticsearchMapping, ElasticsearchField } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";

// ---- Type Inference Configuration ----

/**
 * Rules for inferring Elasticsearch field types from CSV data
 */
interface InferenceRules {
  datePatterns: string[]; // Words that suggest a date field
  booleanValues: string[]; // Valid values for boolean fields
  maxStringLength: number; // Max length before using text instead of keyword
}

/**
 * Default rules for type inference
 */
const inferenceRules: InferenceRules = {
  datePatterns: ["date", "time", "timestamp", "created", "updated", "modified"],
  booleanValues: ["true", "false", "yes", "no", "0", "1"],
  maxStringLength: 256,
};

// ---- Field Type Inference ----

/**
 * Infers the Elasticsearch field type based on header name and sample value
 *
 * Logic:
 * 1. Empty values → keyword with null_value
 * 2. Numeric values → integer or float
 * 3. Date-like headers → date
 * 4. Boolean-like values → boolean
 * 5. Long strings → text
 * 6. Default → keyword
 *
 * Examples:
 * - ("user_id", "12345") → { type: "integer" }
 * - ("created_at", "any") → { type: "date" }
 * - ("is_active", "true") → { type: "boolean" }
 * - ("name", "John") → { type: "keyword" }
 */
export function inferFieldType(
  headerName: string,
  sampleValue: string,
  rules: InferenceRules = inferenceRules
): ElasticsearchField {
  try {
    process.stdout.write(
      chalk.cyan(`\nInferring type for field: ${headerName}\n`)
    );

    // Handle empty values
    if (!sampleValue || sampleValue.trim() === "") {
      process.stdout.write(
        chalk.yellow(
          `⚠ Empty sample value detected, defaulting to keyword with null value\n`
        )
      );
      return { type: "keyword", null_value: "No Data" };
    }

    // Check for numeric fields
    if (!isNaN(Number(sampleValue))) {
      if (Number.isInteger(Number(sampleValue))) {
        process.stdout.write(chalk.green(`✓ Detected integer type\n`));
        return { type: "integer" };
      }
      process.stdout.write(chalk.green(`✓ Detected float type\n`));
      return { type: "float" };
    }

    // Check for date fields based on header name
    const isDateField = rules.datePatterns.some((pattern) =>
      headerName.toLowerCase().includes(pattern)
    );
    if (isDateField) {
      process.stdout.write(chalk.green(`✓ Detected date type\n`));
      return { type: "date" };
    }

    // Check for boolean fields
    const lowerValue = sampleValue.toLowerCase();
    if (rules.booleanValues.includes(lowerValue)) {
      process.stdout.write(chalk.green(`✓ Detected boolean type\n`));
      return { type: "boolean" };
    }

    // Check string length for keyword vs text
    if (sampleValue.length > rules.maxStringLength) {
      process.stdout.write(chalk.green(`✓ Detected text type (long string)\n`));
      return { type: "text" };
    }

    // Default to keyword for shorter strings
    process.stdout.write(chalk.green(`✓ Using default keyword type\n`));
    return { type: "keyword" };
  } catch (error) {
    throw new ComposerError(
      "Error inferring field type",
      ErrorCodes.GENERATION_FAILED,
      { headerName, sampleValue, error }
    );
  }
}

// ---- Mapping Generation ----

/**
 * Generates an Elasticsearch mapping from CSV headers and sample data
 *
 * Structure:
 * - Wraps fields in a 'data' object
 * - Adds standard submission metadata fields
 * - Configures index patterns and aliases
 * - Sets default sharding configuration
 *
 * @param csvHeaders - Array of column headers from the CSV
 * @param sampleData - Object mapping headers to sample values
 * @returns Complete Elasticsearch mapping configuration
 */
export function generateMappingFromCSV(
  csvHeaders: string[],
  sampleData: Record<string, string>
): ElasticsearchMapping {
  try {
    process.stdout.write(chalk.cyan("\nGenerating Elasticsearch mapping...\n"));

    // Process CSV fields
    const properties: Record<string, ElasticsearchField> = {};
    csvHeaders.forEach((header) => {
      properties[header] = inferFieldType(header, sampleData[header]);
    });

    // Create complete mapping with metadata
    const mapping: ElasticsearchMapping = {
      index_patterns: ["tabular-*"],
      aliases: {
        data_centric: {},
      },
      mappings: {
        properties: {
          data: {
            type: "object",
            properties: {
              ...properties,
              // Add standard submission metadata
              submission_metadata: {
                type: "object",
                properties: {
                  submitter_id: { type: "keyword", null_value: "No Data" },
                  processing_started: { type: "date" },
                  processed_at: { type: "date" },
                  source_file: { type: "keyword", null_value: "No Data" },
                  record_number: { type: "integer" },
                  hostname: { type: "keyword", null_value: "No Data" },
                  username: { type: "keyword", null_value: "No Data" },
                },
              },
            },
          },
        },
      },
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
    };

    process.stdout.write(chalk.green(`✓ Mapping generated successfully\n`));
    return mapping;
  } catch (error) {
    throw new ComposerError(
      "Error generating mapping from CSV",
      ErrorCodes.GENERATION_FAILED,
      { csvHeaders, error }
    );
  }
}

/* Example Usage:
const headers = ["id", "name", "created_at", "is_active", "score"];
const sampleData = {
  id: "12345",
  name: "John Doe",
  created_at: "2024-01-01",
  is_active: "true",
  score: "85.5"
};

const mapping = generateMappingFromCSV(headers, sampleData);
*/
