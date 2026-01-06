// src/services/generateEsMappingFromCSV.ts - Updated with consolidated error handling
import { Logger } from "../utils/logger";
import type { ElasticsearchMapping, ElasticsearchField } from "../types";
import { ErrorFactory } from "../utils/errors"; // UPDATED: Import ErrorFactory

// ---- Type Inference Configuration ----

interface TypeInferenceRules {
  maxTextLength: number;
  datePatterns: string[];
  excludePatterns: string[];
  booleanValues: string[];
}

const defaultRules: TypeInferenceRules = {
  maxTextLength: 256,
  datePatterns: ["date", "time", "timestamp", "created", "updated", "modified"],
  excludePatterns: ["password", "secret", "key", "token"],
  booleanValues: ["true", "false", "yes", "no", "0", "1"],
};

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

function inferFieldType(
  headerName: string,
  sampleValue: string,
  rules: TypeInferenceRules = defaultRules
): ElasticsearchField {
  try {
    Logger.debug`Inferring type for field: ${headerName}`;

    if (!sampleValue || sampleValue.trim() === "") {
      Logger.debugString(
        "Empty value detected, defaulting to keyword with null value"
      );
      return { type: "keyword" as const, null_value: "No Data" };
    }

    if (
      rules.excludePatterns.some((pattern) =>
        headerName.toLowerCase().includes(pattern)
      )
    ) {
      Logger.debugString("Field matches exclude pattern, setting as keyword");
      return { type: "keyword" as const };
    }

    if (!isNaN(Number(sampleValue))) {
      if (Number.isInteger(Number(sampleValue))) {
        Logger.debugString("Detected integer type");
        return { type: "integer" as const };
      }
      Logger.debugString("Detected float type");
      return { type: "float" as const };
    }

    const lowerValue = sampleValue.toLowerCase();
    if (rules.booleanValues.includes(lowerValue)) {
      Logger.debugString("Detected boolean type");
      return { type: "boolean" as const };
    }

    if (
      rules.datePatterns.some((pattern) =>
        headerName.toLowerCase().includes(pattern)
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
  } catch (error) {
    Logger.errorString("Error inferring field type");
    Logger.debugObject("Error details", { headerName, sampleValue, error });
    // UPDATED: Use ErrorFactory
    throw ErrorFactory.generation(
      "Error inferring field type",
      { headerName, sampleValue, error },
      [
        "Check that the sample value is valid",
        "Ensure the header name doesn't contain special characters",
        "Verify the CSV data is properly formatted",
      ]
    );
  }
}

interface CSVMappingOptions {
  skipMetadata?: boolean;
  customRules?: Partial<TypeInferenceRules>;
}

// Main export function
export function generateMappingFromCSV(
  csvHeaders: string[],
  sampleData: Record<string, string>,
  indexName: string = "data",
  options: CSVMappingOptions = {}
): ElasticsearchMapping {
  try {
    Logger.debugString("generateEsMappingFromCSV running");
    Logger.debug`Processing ${csvHeaders.length} CSV columns`;

    const skipMetadata = options.skipMetadata || false;
    const customRules = options.customRules || {};

    const rules: TypeInferenceRules = {
      ...defaultRules,
      ...customRules,
    };

    if (skipMetadata) {
      Logger.infoString(
        "Submission metadata fields will be excluded from mapping"
      );
    }

    if (indexName === "default" || indexName === "data") {
      Logger.defaultValueWarning(
        "No index name supplied, defaulting to: data",
        "--index <name>"
      );
      indexName = "data";
    } else {
      Logger.info`Using index name: ${indexName}`;
    }

    Logger.info`Analyzing ${csvHeaders.length} fields for type inference`;

    const typeInferenceStart = Date.now();
    const properties: Record<string, ElasticsearchField> = {};

    let numericFieldCount = 0;
    let dateFieldCount = 0;
    let booleanFieldCount = 0;
    let textFieldCount = 0;
    let keywordFieldCount = 0;
    let complexFieldCount = 0;

    csvHeaders.forEach((header) => {
      const fieldType = inferFieldType(header, sampleData[header], rules);
      properties[header] = fieldType;

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

    Logger.debugString("Field analysis complete");

    // Log field type distribution if debug enabled
    if (numericFieldCount > 0) {
      Logger.debug`Numeric fields: ${numericFieldCount}`;
    }
    if (dateFieldCount > 0) {
      Logger.debug`Date fields: ${dateFieldCount}`;
    }
    if (booleanFieldCount > 0) {
      Logger.debug`Boolean fields: ${booleanFieldCount}`;
    }
    if (textFieldCount > 0) {
      Logger.debug`Text fields: ${textFieldCount}`;
    }
    if (keywordFieldCount > 0) {
      Logger.debug`Keyword fields: ${keywordFieldCount}`;
    }
    if (complexFieldCount > 0) {
      Logger.debug`Complex fields: ${complexFieldCount}`;
    }

    // Create data properties (only the CSV fields)
    const dataProperties = { ...properties };

    // Create root-level properties with data and optionally submission_metadata
    const rootProperties: Record<string, ElasticsearchField> = {
      data: {
        type: "object" as const,
        properties: dataProperties,
      },
    };

    // Add submission_metadata at root level if not skipped
    if (!skipMetadata) {
      rootProperties.submission_metadata = {
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
        properties: rootProperties,
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
    Logger.errorString("Error generating mapping from CSV");
    Logger.debugObject("Error details", { csvHeaders, error });
    // UPDATED: Use ErrorFactory
    throw ErrorFactory.generation(
      "Error generating mapping from CSV",
      { csvHeaders, error },
      [
        "Check that all CSV headers are valid",
        "Ensure sample data is properly formatted",
        "Verify there are no special characters in headers",
        "Check that the CSV structure is consistent",
      ]
    );
  }
}
