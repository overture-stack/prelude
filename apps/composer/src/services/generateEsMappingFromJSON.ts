import chalk from "chalk";
import fs from "fs";
import type { ElasticsearchMapping, ElasticsearchField } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";

// ---- Type Inference Configuration ----

/**
 * Rules for inferring Elasticsearch field types from JSON data
 * Controls how different field types are detected and handled
 */
interface TypeInferenceRules {
  maxTextLength: number; // Length at which strings become 'text' instead of 'keyword'
  datePatterns: string[]; // Field names that suggest date content
  excludePatterns: string[]; // Field names to treat carefully (e.g., sensitive data)
}

/**
 * Default rules for type inference
 */
const defaultRules: TypeInferenceRules = {
  maxTextLength: 256,
  datePatterns: ["date", "time", "timestamp", "created", "updated", "modified"],
  excludePatterns: ["password", "secret", "key", "token"],
};

// ---- Helper Functions ----

/**
 * Validates if a string represents a valid date
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// ---- Type Inference Logic ----

/**
 * Infers Elasticsearch field types from JSON data
 * Handles nested objects, arrays, and multiple data types
 *
 * Type Inference Rules:
 * - null/undefined → keyword with null_value
 * - objects → nested object with recursive type inference
 * - arrays → nested type with inferred element type
 * - numbers → integer or float
 * - booleans → boolean
 * - strings → date, text, or keyword based on content
 *
 * @example
 * inferFieldType("user_id", 123) → { type: "integer" }
 * inferFieldType("description", "very long text...") → { type: "text" }
 * inferFieldType("tags", ["red", "blue"]) → { type: "nested", properties: { value: { type: "keyword" } } }
 */
export function inferFieldType(
  keyName: string,
  sampleValue: any,
  rules: TypeInferenceRules = defaultRules
): ElasticsearchField {
  try {
    process.stdout.write(
      chalk.cyan(`\nInferring type for field: ${keyName}\n`)
    );

    // Handle null/undefined
    if (sampleValue === null || sampleValue === undefined) {
      process.stdout.write(
        chalk.yellow(
          `⚠ Null/undefined value detected, defaulting to keyword with null value\n`
        )
      );
      return { type: "keyword", null_value: "No Data" };
    }

    // Handle sensitive data patterns
    if (
      rules.excludePatterns.some((pattern) =>
        keyName.toLowerCase().includes(pattern)
      )
    ) {
      process.stdout.write(
        chalk.yellow(`⚠ Field matches exclude pattern, setting as keyword\n`)
      );
      return { type: "keyword" };
    }

    // Handle nested objects
    if (typeof sampleValue === "object" && !Array.isArray(sampleValue)) {
      const properties: Record<string, ElasticsearchField> = {};
      for (const [key, value] of Object.entries(sampleValue)) {
        properties[key] = inferFieldType(key, value, rules);
      }
      return { type: "object", properties };
    }

    // Handle arrays
    if (Array.isArray(sampleValue)) {
      if (sampleValue.length === 0) {
        return { type: "keyword" };
      }
      const elementType = inferFieldType(
        `${keyName}_element`,
        sampleValue[0],
        rules
      );
      return {
        type: "nested",
        properties: { value: elementType },
      };
    }

    // Handle numbers
    if (typeof sampleValue === "number") {
      if (Number.isInteger(sampleValue)) {
        process.stdout.write(chalk.green(`✓ Detected integer type\n`));
        return { type: "integer" };
      }
      process.stdout.write(chalk.green(`✓ Detected float type\n`));
      return { type: "float" };
    }

    // Handle booleans
    if (typeof sampleValue === "boolean") {
      process.stdout.write(chalk.green(`✓ Detected boolean type\n`));
      return { type: "boolean" };
    }

    // Handle strings
    if (typeof sampleValue === "string") {
      // Check for dates
      if (
        rules.datePatterns.some((pattern) =>
          keyName.toLowerCase().includes(pattern)
        )
      ) {
        if (isValidDate(sampleValue)) {
          process.stdout.write(chalk.green(`✓ Detected date type\n`));
          return { type: "date" };
        }
      }

      // Handle long strings
      if (sampleValue.length > rules.maxTextLength) {
        process.stdout.write(
          chalk.green(`✓ Detected text type (long string)\n`)
        );
        return { type: "text" };
      }

      process.stdout.write(chalk.green(`✓ Detected keyword type\n`));
      return { type: "keyword" };
    }

    // Default fallback
    process.stdout.write(
      chalk.yellow(`⚠ Using default keyword type for unknown value type\n`)
    );
    return { type: "keyword" };
  } catch (error) {
    throw new ComposerError(
      "Error inferring field type",
      ErrorCodes.GENERATION_FAILED,
      { keyName, sampleValue, error }
    );
  }
}

// ---- Mapping Generation ----

/**
 * Generates Elasticsearch mapping from a JSON file
 * Supports both single objects and arrays of objects
 * Adds standard metadata fields and configuration
 *
 * @example
 * // For a JSON file containing: { "name": "John", "age": 30 }
 * generateMappingFromJson("data.json") → {
 *   mappings: {
 *     properties: {
 *       data: {
 *         properties: {
 *           name: { type: "keyword" },
 *           age: { type: "integer" },
 *           submission_metadata: { ... }
 *         }
 *       }
 *     }
 *   }
 *   // ... other configuration
 * }
 */
export function generateMappingFromJson(
  jsonFilePath: string
): ElasticsearchMapping {
  try {
    process.stdout.write(
      chalk.cyan("\nGenerating Elasticsearch mapping from JSON...\n")
    );

    // Read and validate JSON
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));
    if (typeof jsonData !== "object") {
      throw new ComposerError(
        "Invalid JSON: Expected an object or array of objects",
        ErrorCodes.INVALID_FILE
      );
    }

    // Get sample data (first object if array)
    const sampleData = Array.isArray(jsonData) ? jsonData[0] : jsonData;
    if (!sampleData || typeof sampleData !== "object") {
      throw new ComposerError(
        "Invalid JSON structure: No valid object found",
        ErrorCodes.INVALID_FILE
      );
    }

    // Generate field mappings
    const properties: Record<string, ElasticsearchField> = {};
    for (const [key, value] of Object.entries(sampleData)) {
      properties[key] = inferFieldType(key, value);
    }

    // Create complete mapping
    const mapping: ElasticsearchMapping = {
      index_patterns: ["json-data-*"],
      aliases: {
        data_centric: {},
      },
      mappings: {
        properties: {
          data: {
            type: "object",
            properties: {
              ...properties,
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
    if (error instanceof ComposerError) {
      throw error;
    }
    throw new ComposerError(
      "Error generating mapping from JSON",
      ErrorCodes.GENERATION_FAILED,
      { filePath: jsonFilePath, error }
    );
  }
}

// ---- Mapping Utilities ----

/**
 * Merges two Elasticsearch mappings
 * Combines properties while preserving other configuration
 */
export function mergeMappings(
  target: ElasticsearchMapping,
  source: ElasticsearchMapping
): ElasticsearchMapping {
  try {
    const mergedProperties = {
      ...target.mappings.properties,
      ...source.mappings.properties,
    };

    return {
      ...target,
      mappings: {
        properties: mergedProperties,
      },
    };
  } catch (error) {
    throw new ComposerError(
      "Error merging mappings",
      ErrorCodes.GENERATION_FAILED,
      error
    );
  }
}

/* Usage Examples:
// Generate mapping from JSON file
const mapping = generateMappingFromJson("data.json");

// Infer field types
const stringField = inferFieldType("description", "short text");  // → keyword
const numberField = inferFieldType("count", 42);                  // → integer
const dateField = inferFieldType("created_at", "2024-01-01");    // → date

// Merge mappings
const merged = mergeMappings(mapping1, mapping2);
*/
