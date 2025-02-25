import fs from "fs";
import path from "path";
import { Logger } from "../utils/logger";
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

/**
 * Validates if a string represents a valid date
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

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
    Logger.debug`Inferring type for field: ${keyName}`;

    // Handle null/undefined
    if (sampleValue === null || sampleValue === undefined) {
      Logger.debug("Null/undefined value detected, defaulting to keyword");
      return { type: "keyword", null_value: "No Data" };
    }

    // Handle sensitive data patterns
    if (
      rules.excludePatterns.some((pattern) =>
        keyName.toLowerCase().includes(pattern)
      )
    ) {
      Logger.debug("Field matches exclude pattern, setting as keyword");
      return { type: "keyword" };
    }

    // Handle nested objects
    if (typeof sampleValue === "object" && !Array.isArray(sampleValue)) {
      Logger.debug`Processing nested object for ${keyName}`;
      const properties: Record<string, ElasticsearchField> = {};
      for (const [key, value] of Object.entries(sampleValue)) {
        properties[key] = inferFieldType(key, value, rules);
      }
      return { type: "object", properties };
    }

    // Handle arrays
    if (Array.isArray(sampleValue)) {
      Logger.debug`Processing array for ${keyName}`;
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
        Logger.debug("Detected integer type");
        return { type: "integer" };
      }
      Logger.debug("Detected float type");
      return { type: "float" };
    }

    // Handle booleans
    if (typeof sampleValue === "boolean") {
      Logger.debug("Detected boolean type");
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
          Logger.debug("Detected date type");
          return { type: "date" };
        }
      }

      // Handle long strings
      if (sampleValue.length > rules.maxTextLength) {
        Logger.debug("Detected text type (long string)");
        return { type: "text" };
      }

      Logger.debug("Detected keyword type");
      return { type: "keyword" };
    }

    // Default fallback
    Logger.debug("Using default keyword type for unknown value type");
    return { type: "keyword" };
  } catch (error) {
    Logger.error("Error inferring field type");
    Logger.debugObject("Error details", { keyName, sampleValue, error });
    throw new ComposerError(
      "Error inferring field type",
      ErrorCodes.GENERATION_FAILED,
      { keyName, sampleValue, error }
    );
  }
}

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
  jsonFilePath: string,
  indexName: string
): ElasticsearchMapping {
  try {
    Logger.debug("generateEsMappingFromJSON running");
    Logger.debug(
      `Processing file: ${path.basename(
        jsonFilePath
      )} within generateEsMappingFromJSON function`
    );

    // Check if using default index name
    if (indexName === "default" || indexName === "data") {
      Logger.defaultValueWarning(
        "No index name supplied, defaulting to: data",
        "--index <name>"
      );
      indexName = "data";
    } else {
      Logger.info`Using index name: ${indexName}`;
    }

    // Read and validate JSON
    const startTime = Date.now();

    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));
    const parseTime = Date.now() - startTime;

    if (parseTime > 500) {
      Logger.timing("JSON parsing", parseTime);
    }

    if (typeof jsonData !== "object") {
      throw new ComposerError(
        "Invalid JSON: Expected an object or array of objects",
        ErrorCodes.INVALID_FILE
      );
    }

    // Get sample data (first object if array)
    const isArray = Array.isArray(jsonData);
    const sampleData = isArray ? jsonData[0] : jsonData;

    if (isArray) {
      Logger.info(
        `JSON contains an array of ${jsonData.length} objects, using first object as sample`
      );
    }

    if (!sampleData || typeof sampleData !== "object") {
      throw new ComposerError(
        "Invalid JSON structure: No valid object found",
        ErrorCodes.INVALID_FILE
      );
    }

    // Generate field mappings
    const fieldCount = Object.keys(sampleData).length;
    Logger.info`Analyzing ${fieldCount} fields for type inference`;

    const typeInferenceStart = Date.now();
    const properties: Record<string, ElasticsearchField> = {};

    let complexFieldCount = 0;

    for (const [key, value] of Object.entries(sampleData)) {
      properties[key] = inferFieldType(key, value);

      // Count complex fields (objects, arrays)
      if (
        typeof value === "object" &&
        (Array.isArray(value) ||
          (value !== null && Object.keys(value).length > 0))
      ) {
        complexFieldCount++;
      }
    }

    const typeInferenceTime = Date.now() - typeInferenceStart;
    if (typeInferenceTime > 500) {
      Logger.timing("Type inference", typeInferenceTime);
    }

    Logger.debug`Field analysis complete`;
    if (complexFieldCount > 0) {
      Logger.debug(
        `Detected ${complexFieldCount} complex field(s) (objects/arrays)`
      );
    }

    // Create complete mapping with dynamic index name
    const mapping: ElasticsearchMapping = {
      index_patterns: [`${indexName}-*`],
      aliases: {
        [`${indexName}_centric`]: {},
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

    Logger.debug("Mapping configuration generated successfully");

    Logger.debugObject("Generated Mapping", mapping);
    return mapping;
  } catch (error) {
    Logger.error("Error generating mapping from JSON");
    Logger.debugObject("Error details", {
      filePath: jsonFilePath,
      error,
    });

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

/**
 * Merges two Elasticsearch mappings
 * Combines properties while preserving other configuration
 */
export function mergeMappings(
  target: ElasticsearchMapping,
  source: ElasticsearchMapping
): ElasticsearchMapping {
  try {
    Logger.section("Merging Mappings");
    Logger.info("Combining multiple mapping configurations");

    const targetFieldCount = Object.keys(target.mappings.properties).length;
    const sourceFieldCount = Object.keys(source.mappings.properties).length;

    Logger.info`Target mapping has ${targetFieldCount} top-level properties`;
    Logger.info`Source mapping has ${sourceFieldCount} top-level properties`;

    const mergedProperties = {
      ...target.mappings.properties,
      ...source.mappings.properties,
    };

    const mergedMapping = {
      ...target,
      mappings: {
        properties: mergedProperties,
      },
    };

    const resultFieldCount = Object.keys(mergedProperties).length;
    Logger.success(
      `Mappings merged successfully (${resultFieldCount} total properties)`
    );

    Logger.debugObject("Merged Mapping", mergedMapping);
    return mergedMapping;
  } catch (error) {
    Logger.error("Error merging mappings");
    Logger.debugObject("Error details", error);
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
