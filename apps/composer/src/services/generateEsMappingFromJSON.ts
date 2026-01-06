// src/services/generateEsMappingFromJSON.ts - Updated with consolidated error handling
import fs from "fs";
import path from "path";
import { Logger } from "../utils/logger";
import type { ElasticsearchMapping, ElasticsearchField } from "../types";
import { ErrorFactory } from "../utils/errors"; // UPDATED: Import ErrorFactory

// ---- Type Inference Configuration ----

interface TypeInferenceRules {
  maxTextLength: number;
  datePatterns: string[];
  excludePatterns: string[];
}

export interface MappingOptions {
  ignoredFields?: string[];
  skipMetadata?: boolean;
  customRules?: Partial<TypeInferenceRules>;
}

const defaultRules: TypeInferenceRules = {
  maxTextLength: 256,
  datePatterns: ["date", "time", "timestamp", "created", "updated", "modified"],
  excludePatterns: ["password", "secret", "key", "token"],
};

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

function inferFieldType(
  keyName: string,
  sampleValue: any,
  rules: TypeInferenceRules = defaultRules
): ElasticsearchField {
  try {
    Logger.debug`Inferring type for field: ${keyName}`;

    if (sampleValue === null || sampleValue === undefined) {
      Logger.debugString(
        "Null/undefined value detected, defaulting to keyword"
      );
      return { type: "keyword" as const, null_value: "No Data" };
    }

    if (
      rules.excludePatterns.some((pattern) =>
        keyName.toLowerCase().includes(pattern)
      )
    ) {
      Logger.debugString("Field matches exclude pattern, setting as keyword");
      return { type: "keyword" as const };
    }

    if (typeof sampleValue === "object" && !Array.isArray(sampleValue)) {
      Logger.debug`Processing nested object for ${keyName}`;
      const properties: Record<string, ElasticsearchField> = {};
      for (const [key, value] of Object.entries(sampleValue)) {
        properties[key] = inferFieldType(key, value, rules);
      }
      return { type: "object" as const, properties };
    }

    if (Array.isArray(sampleValue)) {
      Logger.debug`Processing array for ${keyName}`;

      if (sampleValue.length === 0) {
        return { type: "keyword" as const };
      }

      if (
        typeof sampleValue[0] === "object" &&
        sampleValue[0] !== null &&
        !Array.isArray(sampleValue[0])
      ) {
        const properties: Record<string, ElasticsearchField> = {};

        for (const [key, value] of Object.entries(sampleValue[0])) {
          properties[key] = inferFieldType(key, value, rules);
        }

        return {
          type: "nested" as const,
          properties: properties,
        };
      } else {
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

    if (typeof sampleValue === "number") {
      if (Number.isInteger(sampleValue)) {
        Logger.debugString("Detected integer type");
        return { type: "integer" as const };
      }
      Logger.debugString("Detected float type");
      return { type: "float" as const };
    }

    if (typeof sampleValue === "boolean") {
      Logger.debugString("Detected boolean type");
      return { type: "boolean" as const };
    }

    if (typeof sampleValue === "string") {
      if (
        rules.datePatterns.some((pattern) =>
          keyName.toLowerCase().includes(pattern)
        )
      ) {
        if (isValidDate(sampleValue)) {
          Logger.debugString("Detected date type");
          return { type: "date" as const };
        }
      }

      if (sampleValue.length > rules.maxTextLength) {
        Logger.debugString("Detected text type (long string)");
        return { type: "text" as const };
      }

      Logger.debugString("Detected keyword type");
      return { type: "keyword" as const };
    }

    Logger.debugString("Using default keyword type for unknown value type");
    return { type: "keyword" as const };
  } catch (error) {
    Logger.errorString("Error inferring field type");
    Logger.debugObject("Error details", { keyName, sampleValue, error });
    // UPDATED: Use ErrorFactory
    throw ErrorFactory.generation(
      "Error inferring field type",
      { keyName, sampleValue, error },
      [
        "Check that the JSON value is valid",
        "Ensure the field name doesn't contain special characters",
        "Verify the JSON structure is properly formatted",
      ]
    );
  }
}

// Main export function
export function generateMappingFromJson(
  jsonFilePath: string,
  indexName: string,
  options: MappingOptions = {}
): ElasticsearchMapping {
  try {
    Logger.debugString("generateEsMappingFromJSON running");
    Logger.debug`Processing file: ${path.basename(
      jsonFilePath
    )} within generateEsMappingFromJSON function`;

    const ignoredFields = options.ignoredFields || [];
    const skipMetadata = options.skipMetadata || false;
    const customRules = options.customRules || {};

    const rules: TypeInferenceRules = {
      ...defaultRules,
      ...customRules,
    };

    if (ignoredFields.length > 0) {
      Logger.info`Fields that will be excluded from mapping: ${ignoredFields.join(
        ", "
      )}`;
    }

    if (skipMetadata) {
      Logger.infoString(
        "Submission metadata fields will be excluded from mapping"
      );
    }

    if (indexName === "default" || indexName === "data") {
      Logger.defaultValueWarning(
        "No index name supplied, defaulting to: data",
        "--index <n>"
      );
      indexName = "data";
    } else {
      Logger.info`Using index name: ${indexName}`;
    }

    const startTime = Date.now();

    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));
    const parseTime = Date.now() - startTime;

    if (parseTime > 500) {
      Logger.timing("JSON parsing", parseTime);
    }

    if (typeof jsonData !== "object" || jsonData === null) {
      // UPDATED: Use ErrorFactory
      throw ErrorFactory.file(
        "Invalid JSON: Expected a non-null object",
        jsonFilePath,
        [
          "Ensure the JSON file contains a valid object structure",
          "Check that the file is not empty or corrupted",
          "Verify the JSON syntax is correct",
        ]
      );
    }

    let mappingProperties: Record<string, ElasticsearchField>;

    const hasDataKey = jsonData.hasOwnProperty("data");
    const sampleData = hasDataKey ? jsonData.data : jsonData;

    const processDataStructure = (
      data: Record<string, any>
    ): Record<string, ElasticsearchField> => {
      const dataProperties: Record<string, ElasticsearchField> = {};

      Object.entries(data).forEach(([key, value]) => {
        if (ignoredFields.includes(key)) {
          Logger.debug`Ignoring field: ${key}`;
          return;
        }

        if (Array.isArray(value) && value.length > 0) {
          const firstElement = value[0];
          if (typeof firstElement === "object" && firstElement !== null) {
            dataProperties[key] = {
              type: "nested",
              properties: processDataStructure(firstElement),
            };
          } else {
            dataProperties[key] = inferFieldType(key, value[0], rules);
          }
        } else if (typeof value === "object" && value !== null) {
          dataProperties[key] = {
            type: "object",
            properties: processDataStructure(value),
          };
        } else {
          dataProperties[key] = inferFieldType(key, value, rules);
        }
      });

      return dataProperties;
    };

    if (hasDataKey) {
      mappingProperties = {
        data: {
          type: "object",
          properties: processDataStructure(sampleData),
        },
      };
    } else {
      mappingProperties = processDataStructure(sampleData);
    }

    // Add submission_metadata if not skipped
    if (!skipMetadata) {
      mappingProperties.submission_metadata = {
        type: "object" as const,
        properties: {
          submission_id: { type: "keyword" as const, null_value: "No Data" },
          source_file_hash: { type: "keyword" as const, null_value: "No Data" },
          processed_at: { type: "date" as const },
        },
      };
    }

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

    Logger.debugString("Mapping configuration generated successfully");
    Logger.debugObject("Generated Mapping", mapping);
    return mapping;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack =
      error instanceof Error ? error.stack : "No stack trace available";

    Logger.errorString("Error generating mapping from JSON");
    Logger.debugObject("Error details", {
      filePath: jsonFilePath,
      errorMessage,
      stack: errorStack,
    });

    if (error instanceof Error && error.name === "ComposerError") {
      throw error;
    }
    // UPDATED: Use ErrorFactory
    throw ErrorFactory.generation(
      `Error generating mapping from JSON: ${errorMessage}`,
      {
        filePath: jsonFilePath,
        errorMessage,
        stack: errorStack,
      },
      [
        "Check that the JSON file is valid and properly formatted",
        "Ensure the file contains the expected data structure",
        "Verify file permissions and accessibility",
        "Check that the JSON follows the expected schema format",
      ]
    );
  }
}
