// src/services/generateEsMappingFromCSV.ts - Cleaned up exports
import { Logger } from "../utils/logger";
import type { ElasticsearchMapping, ElasticsearchField } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";

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
    Logger.debug(`Inferring type for field: ${headerName}`);

    if (!sampleValue || sampleValue.trim() === "") {
      Logger.debug(
        "Empty value detected, defaulting to keyword with null value"
      );
      return { type: "keyword" as const, null_value: "No Data" };
    }

    if (
      rules.excludePatterns.some((pattern) =>
        headerName.toLowerCase().includes(pattern)
      )
    ) {
      Logger.debug("Field matches exclude pattern, setting as keyword");
      return { type: "keyword" as const };
    }

    if (!isNaN(Number(sampleValue))) {
      if (Number.isInteger(Number(sampleValue))) {
        Logger.debug("Detected integer type");
        return { type: "integer" as const };
      }
      Logger.debug("Detected float type");
      return { type: "float" as const };
    }

    const lowerValue = sampleValue.toLowerCase();
    if (rules.booleanValues.includes(lowerValue)) {
      Logger.debug("Detected boolean type");
      return { type: "boolean" as const };
    }

    if (
      rules.datePatterns.some((pattern) =>
        headerName.toLowerCase().includes(pattern)
      )
    ) {
      if (isValidDate(sampleValue)) {
        Logger.debug("Detected date type");
        return { type: "date" as const };
      }
    }

    if (sampleValue.length > rules.maxTextLength) {
      Logger.debug("Detected text type (long string)");
      return { type: "text" as const };
    }

    Logger.debug("Detected keyword type");
    return { type: "keyword" as const };
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
    Logger.debug("generateEsMappingFromCSV running");
    Logger.debug(`Processing ${csvHeaders.length} CSV columns`);

    const skipMetadata = options.skipMetadata || false;
    const customRules = options.customRules || {};

    const rules: TypeInferenceRules = {
      ...defaultRules,
      ...customRules,
    };

    if (skipMetadata) {
      Logger.info("Submission metadata fields will be excluded from mapping");
    }

    if (indexName === "default" || indexName === "data") {
      Logger.defaultValueWarning(
        "No index name supplied, defaulting to: data",
        "--index <name>"
      );
      indexName = "data";
    } else {
      Logger.info(`Using index name: ${indexName}`);
    }

    Logger.info(`Analyzing ${csvHeaders.length} fields for type inference`);

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

    Logger.debug("Field analysis complete");

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

    // Create data properties with or without submission metadata
    const dataProperties = skipMetadata
      ? { ...properties }
      : {
          ...properties,
          submission_metadata: {
            type: "object" as const,
            properties: {
              submitter_id: { type: "keyword" as const, null_value: "No Data" },
              processing_started: { type: "date" as const },
              processed_at: { type: "date" as const },
              source_file: { type: "keyword" as const, null_value: "No Data" },
              record_number: { type: "integer" as const },
              hostname: { type: "keyword" as const, null_value: "No Data" },
              username: { type: "keyword" as const, null_value: "No Data" },
            },
          },
        };

    const mapping: ElasticsearchMapping = {
      index_patterns: [`${indexName}-*`],
      aliases: {
        [`${indexName}_centric`]: {},
      },
      mappings: {
        properties: {
          data: {
            type: "object" as const,
            properties: dataProperties,
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
