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
 * Configuration options for mapping generation
 */
export interface MappingOptions {
  ignoredFields?: string[]; // Field names to exclude from mapping
  skipMetadata?: boolean; // Whether to skip adding submission metadata
  customRules?: Partial<TypeInferenceRules>; // Custom type inference rules
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
      return { type: "keyword" as const, null_value: "No Data" };
    }

    // Handle sensitive data patterns
    if (
      rules.excludePatterns.some((pattern) =>
        keyName.toLowerCase().includes(pattern)
      )
    ) {
      Logger.debug("Field matches exclude pattern, setting as keyword");
      return { type: "keyword" as const };
    }

    // Handle nested objects
    if (typeof sampleValue === "object" && !Array.isArray(sampleValue)) {
      Logger.debug`Processing nested object for ${keyName}`;
      const properties: Record<string, ElasticsearchField> = {};
      for (const [key, value] of Object.entries(sampleValue)) {
        properties[key] = inferFieldType(key, value, rules);
      }
      return { type: "object" as const, properties };
    }

    // Handle arrays
    if (Array.isArray(sampleValue)) {
      Logger.debug`Processing array for ${keyName}`;

      if (sampleValue.length === 0) {
        return { type: "keyword" as const };
      }

      // Check if array contains objects
      if (
        typeof sampleValue[0] === "object" &&
        sampleValue[0] !== null &&
        !Array.isArray(sampleValue[0])
      ) {
        // For arrays of objects, directly infer properties from the first element
        // This eliminates the "value" wrapper
        const properties: Record<string, ElasticsearchField> = {};

        for (const [key, value] of Object.entries(sampleValue[0])) {
          properties[key] = inferFieldType(key, value, rules);
        }

        return {
          type: "nested" as const,
          properties: properties,
        };
      } else {
        // For arrays of primitives, use a simpler approach
        const elementType = inferFieldType(
          `${keyName}_element`,
          sampleValue[0],
          rules
        );

        return {
          type: "nested" as const,
          properties: { value: elementType },
        };
      }
    }

    // Handle numbers
    if (typeof sampleValue === "number") {
      if (Number.isInteger(sampleValue)) {
        Logger.debug("Detected integer type");
        return { type: "integer" as const };
      }
      Logger.debug("Detected float type");
      return { type: "float" as const };
    }

    // Handle booleans
    if (typeof sampleValue === "boolean") {
      Logger.debug("Detected boolean type");
      return { type: "boolean" as const };
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
          return { type: "date" as const };
        }
      }

      // Handle long strings
      if (sampleValue.length > rules.maxTextLength) {
        Logger.debug("Detected text type (long string)");
        return { type: "text" as const };
      }

      Logger.debug("Detected keyword type");
      return { type: "keyword" as const };
    }

    // Default fallback
    Logger.debug("Using default keyword type for unknown value type");
    return { type: "keyword" as const };
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
 * Allows configurable field exclusion and metadata skipping
 *
 * @example
 * // For a JSON file containing: { "name": "John", "age": 30 }
 * generateMappingFromJson("data.json", "users", { ignoredFields: ["createdAt"], skipMetadata: true }) → {
 *   mappings: {
 *     properties: {
 *       data: {
 *         properties: {
 *           name: { type: "keyword" },
 *           age: { type: "integer" }
 *           // submission_metadata is NOT included when skipMetadata is true
 *         }
 *       }
 *     }
 *   }
 *   // ... other configuration
 * }
 */
export function generateMappingFromJson(
  jsonFilePath: string,
  indexName: string,
  options: MappingOptions = {}
): ElasticsearchMapping {
  try {
    Logger.debug("generateEsMappingFromJSON running");
    Logger.debug(
      `Processing file: ${path.basename(
        jsonFilePath
      )} within generateEsMappingFromJSON function`
    );

    // Extract options with defaults
    const ignoredFields = options.ignoredFields || [];
    const skipMetadata = options.skipMetadata || false;
    const customRules = options.customRules || {};

    // Merge custom rules with defaults
    const rules: TypeInferenceRules = {
      ...defaultRules,
      ...customRules,
    };

    // Log ignored fields if any are specified
    if (ignoredFields.length > 0) {
      Logger.info`Fields that will be excluded from mapping: ${ignoredFields.join(
        ", "
      )}`;
    }

    // Log metadata skipping
    if (skipMetadata) {
      Logger.info`Submission metadata fields will be excluded from mapping`;
    }

    // Check if using default index name
    if (indexName === "default" || indexName === "data") {
      Logger.defaultValueWarning(
        "No index name supplied, defaulting to: data",
        "--index <n>"
      );
      indexName = "data";
    } else {
      Logger.info`Using index name: ${indexName}`;
    }

    // Read and parse JSON
    const startTime = Date.now();

    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));
    const parseTime = Date.now() - startTime;

    if (parseTime > 500) {
      Logger.timing("JSON parsing", parseTime);
    }

    if (typeof jsonData !== "object" || jsonData === null) {
      throw new ComposerError(
        "Invalid JSON: Expected a non-null object",
        ErrorCodes.INVALID_FILE
      );
    }

    // Prepare properties for mapping
    let mappingProperties: Record<string, ElasticsearchField>;

    // Determine if the top-level contains a 'data' key
    const hasDataKey = jsonData.hasOwnProperty("data");
    const sampleData = hasDataKey ? jsonData.data : jsonData;

    // Process the sample data, preserving the 'data' key if present
    const processDataStructure = (
      data: Record<string, any>
    ): Record<string, ElasticsearchField> => {
      const dataProperties: Record<string, ElasticsearchField> = {};

      // Process each field in the data
      Object.entries(data).forEach(([key, value]) => {
        // Skip ignored fields
        if (ignoredFields.includes(key)) {
          Logger.debug`Ignoring field: ${key}`;
          return;
        }

        // Recursively process nested arrays or objects
        if (Array.isArray(value) && value.length > 0) {
          const firstElement = value[0];
          if (typeof firstElement === "object" && firstElement !== null) {
            dataProperties[key] = {
              type: "nested",
              properties: processDataStructure(firstElement),
            };
          } else {
            // Simple array of primitives
            dataProperties[key] = inferFieldType(key, value[0], rules);
          }
        } else if (typeof value === "object" && value !== null) {
          dataProperties[key] = {
            type: "object",
            properties: processDataStructure(value),
          };
        } else {
          // Simple field
          dataProperties[key] = inferFieldType(key, value, rules);
        }
      });

      return dataProperties;
    };

    // Process the data structure
    if (hasDataKey) {
      mappingProperties = {
        data: {
          type: "object",
          properties: processDataStructure(sampleData),
        },
      };
    } else {
      // If no 'data' key, use the entire object directly
      mappingProperties = processDataStructure(sampleData);
    }

    // Create complete mapping with dynamic index name
    const mapping: ElasticsearchMapping = {
      index_patterns: [`${indexName}-*`],
      aliases: {
        [`${indexName}_centric`]: {},
      },
      mappings: {
        properties: mappingProperties,
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
    // Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : String(error);

    const errorStack =
      error instanceof Error ? error.stack : "No stack trace available";

    Logger.error("Error generating mapping from JSON");
    Logger.debugObject("Error details", {
      filePath: jsonFilePath,
      errorMessage,
      stack: errorStack,
    });

    if (error instanceof ComposerError) {
      throw error;
    }
    throw new ComposerError(
      `Error generating mapping from JSON: ${errorMessage}`,
      ErrorCodes.GENERATION_FAILED,
      {
        filePath: jsonFilePath,
        errorMessage,
        stack: errorStack,
      }
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
