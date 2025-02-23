import { Logger } from "../utils/logger";
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
    Logger.debug(`Inferring type for field: ${headerName}`);

    // Handle empty values
    if (!sampleValue || sampleValue.trim() === "") {
      Logger.debug(
        "Empty sample value detected, defaulting to keyword with null value"
      );
      return { type: "keyword", null_value: "No Data" };
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

    // Check for date fields based on header name
    const isDateField = rules.datePatterns.some((pattern) =>
      headerName.toLowerCase().includes(pattern)
    );
    if (isDateField) {
      Logger.debug("Detected date type");
      return { type: "date" };
    }

    // Check for boolean fields
    const lowerValue = sampleValue.toLowerCase();
    if (rules.booleanValues.includes(lowerValue)) {
      Logger.debug("Detected boolean type");
      return { type: "boolean" };
    }

    // Check string length for keyword vs text
    if (sampleValue.length > rules.maxStringLength) {
      Logger.debug("Detected text type (long string)");
      return { type: "text" };
    }

    // Default to keyword for shorter strings
    Logger.debug("Using default keyword type");
    return { type: "keyword" };
  } catch (error) {
    Logger.debug("Error inferring field type");
    Logger.debugObject("Error details", { headerName, sampleValue, error });
    throw new ComposerError(
      "Error inferring field type",
      ErrorCodes.GENERATION_FAILED,
      { headerName, sampleValue, error }
    );
  }
}

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
  sampleData: Record<string, string>,
  indexName: string
): ElasticsearchMapping {
  try {
    Logger.debug("Generating Elasticsearch mapping");
    Logger.debug(`Index name: ${indexName}`);
    Logger.debugObject("CSV Headers", csvHeaders);

    // Process CSV fields
    const properties: Record<string, ElasticsearchField> = {};
    csvHeaders.forEach((header) => {
      properties[header] = inferFieldType(header, sampleData[header]);
    });

    Logger.debug("Processed field types");
    Logger.debugObject("Field Properties", properties);

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

    Logger.success("Mapping generated successfully");
    Logger.debugObject("Generated Mapping", mapping);
    return mapping;
  } catch (error) {
    Logger.debug("Error generating mapping from CSV");
    Logger.debugObject("Error details", { csvHeaders, error });
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
