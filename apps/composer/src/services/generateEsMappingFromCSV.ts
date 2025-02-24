import { Logger } from "../utils/logger";
import type { ElasticsearchMapping, ElasticsearchField } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";

// ---- Type Inference Configuration ----

/**
 * Rules for inferring Elasticsearch field types from CSV data
 * Controls how different field types are detected and handled
 */
interface TypeInferenceRules {
  maxTextLength: number; // Length at which strings become 'text' instead of 'keyword'
  datePatterns: string[]; // Field names that suggest date content
  excludePatterns: string[]; // Field names to treat carefully (e.g., sensitive data)
  booleanValues: string[]; // Valid values for boolean fields
}

/**
 * Default rules for type inference
 */
const defaultRules: TypeInferenceRules = {
  maxTextLength: 256,
  datePatterns: ["date", "time", "timestamp", "created", "updated", "modified"],
  excludePatterns: ["password", "secret", "key", "token"],
  booleanValues: ["true", "false", "yes", "no", "0", "1"],
};

/**
 * Validates if a string could be a valid date
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Infers Elasticsearch field types from CSV headers and sample data
 * Handles different data types based on content and naming patterns
 *
 * Type Inference Rules:
 * - null/undefined/empty → keyword with null_value
 * - numbers → integer or float
 * - booleans → boolean (based on common boolean values)
 * - strings → date, text, or keyword based on content and field name
 *
 * @example
 * inferFieldType("user_id", "123") → { type: "integer" }
 * inferFieldType("description", "very long text...") → { type: "text" }
 * inferFieldType("is_active", "true") → { type: "boolean" }
 */
export function inferFieldType(
  headerName: string,
  sampleValue: string,
  rules: TypeInferenceRules = defaultRules
): ElasticsearchField {
  try {
    Logger.debug(`Inferring type for field: ${headerName}`);

    // Handle empty values
    if (!sampleValue || sampleValue.trim() === "") {
      Logger.debug(
        "Empty value detected, defaulting to keyword with null value"
      );
      return { type: "keyword", null_value: "No Data" };
    }

    // Handle sensitive data patterns
    if (
      rules.excludePatterns.some((pattern) =>
        headerName.toLowerCase().includes(pattern)
      )
    ) {
      Logger.debug("Field matches exclude pattern, setting as keyword");
      return { type: "keyword" };
    }

    // Check for numeric fields
    if (!isNaN(Number(sampleValue))) {
      if (Number.isInteger(Number(sampleValue))) {
        Logger.debug("Detected integer type");
        return { type: "integer" };
      }
      Logger.debug("Detected float type");
      return { type: "float" };
    }

    // Check for boolean fields
    const lowerValue = sampleValue.toLowerCase();
    if (rules.booleanValues.includes(lowerValue)) {
      Logger.debug("Detected boolean type");
      return { type: "boolean" };
    }

    // Check for dates based on header name
    if (
      rules.datePatterns.some((pattern) =>
        headerName.toLowerCase().includes(pattern)
      )
    ) {
      // If the sample value is a valid date, use date type
      if (isValidDate(sampleValue)) {
        Logger.debug("Detected date type");
        return { type: "date" };
      }
    }

    // Check string length for keyword vs text
    if (sampleValue.length > rules.maxTextLength) {
      Logger.debug("Detected text type (long string)");
      return { type: "text" };
    }

    // Default to keyword for shorter strings
    Logger.debug("Detected keyword type");
    return { type: "keyword" };
  } catch (error) {
    Logger.error("Error inferring field type");
    Logger.debugObject("Error details", { headerName, sampleValue, error });
    throw new ComposerError(
      "Error inferring field type",
      ErrorCodes.GENERATION_FAILED,
      { headerName, sampleValue, error }
    );
  }
}

/**
 * Generates Elasticsearch mapping from CSV headers and sample data
 * Adds standard metadata fields and configuration
 *
 * @example
 * // For CSV with headers: "name", "age", "email"
 * generateMappingFromCSV(["name", "age", "email"], { name: "John", age: "30", email: "john@example.com" }) → {
 *   mappings: {
 *     properties: {
 *       data: {
 *         properties: {
 *           name: { type: "keyword" },
 *           age: { type: "integer" },
 *           email: { type: "keyword" },
 *           submission_metadata: { ... }
 *         }
 *       }
 *     }
 *   }
 *   // ... other configuration
 * }
 */
export function generateMappingFromCSV(
  csvHeaders: string[],
  sampleData: Record<string, string>,
  indexName: string = "data"
): ElasticsearchMapping {
  try {
    Logger.debug("generateEsMappingFromCSV running");
    Logger.debug(`Processing ${csvHeaders.length} CSV columns`);

    // Check if using default index name
    if (indexName === "default" || indexName === "data") {
      Logger.defaultValueWarning(
        "No index name supplied, defaulting to: data",
        "--index <name>"
      );
      indexName = "data";
    } else {
      Logger.info(`Using index name: ${indexName}`);
    }

    // Generate field mappings
    Logger.info(`Analyzing ${csvHeaders.length} fields for type inference`);

    const typeInferenceStart = Date.now();
    const properties: Record<string, ElasticsearchField> = {};

    // Track field type counts for summary
    let numericFieldCount = 0;
    let dateFieldCount = 0;
    let booleanFieldCount = 0;
    let textFieldCount = 0;
    let keywordFieldCount = 0;
    let complexFieldCount = 0;

    csvHeaders.forEach((header) => {
      const fieldType = inferFieldType(header, sampleData[header]);
      properties[header] = fieldType;

      // Count field types for summary
      switch (fieldType.type) {
        case "integer":
        case "float":
          numericFieldCount++;
          break;
        case "date":
          dateFieldCount++;
          break;
        case "boolean":
          booleanFieldCount++;
          break;
        case "text":
          textFieldCount++;
          break;
        case "keyword":
          keywordFieldCount++;
          break;
        case "object":
        case "nested":
          complexFieldCount++;
          break;
      }
    });

    const typeInferenceTime = Date.now() - typeInferenceStart;
    if (typeInferenceTime > 500) {
      Logger.timing("Type inference", typeInferenceTime);
    }

    Logger.debug(`Field analysis complete`);

    // Log field type distribution if debug enabled
    if (numericFieldCount > 0) {
      Logger.debug(`Numeric fields: ${numericFieldCount}`);
    }
    if (dateFieldCount > 0) {
      Logger.debug(`Date fields: ${dateFieldCount}`);
    }
    if (booleanFieldCount > 0) {
      Logger.debug(`Boolean fields: ${booleanFieldCount}`);
    }
    if (textFieldCount > 0) {
      Logger.debug(`Text fields: ${textFieldCount}`);
    }
    if (keywordFieldCount > 0) {
      Logger.debug(`Keyword fields: ${keywordFieldCount}`);
    }
    if (complexFieldCount > 0) {
      Logger.debug(`Complex fields: ${complexFieldCount}`);
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
    Logger.error("Error generating mapping from CSV");
    Logger.debugObject("Error details", { csvHeaders, error });
    throw new ComposerError(
      "Error generating mapping from CSV",
      ErrorCodes.GENERATION_FAILED,
      { csvHeaders, error }
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
    Logger.info("Combining multiple mapping configurations");

    const targetFieldCount = Object.keys(target.mappings.properties).length;
    const sourceFieldCount = Object.keys(source.mappings.properties).length;

    Logger.info(`Target mapping has ${targetFieldCount} top-level properties`);
    Logger.info(`Source mapping has ${sourceFieldCount} top-level properties`);

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
// Generate mapping from CSV data
const headers = ["id", "name", "created_at", "is_active", "score"];
const sampleData = {
  id: "12345",
  name: "John Doe",
  created_at: "2024-01-01",
  is_active: "true",
  score: "85.5"
};
const mapping = generateMappingFromCSV(headers, sampleData);

// Infer field types
const stringField = inferFieldType("description", "short text");  // → keyword
const numberField = inferFieldType("count", "42");                // → integer
const dateField = inferFieldType("created_at", "2024-01-01");     // → date

// Merge mappings
const merged = mergeMappings(mapping1, mapping2);
*/
