// src/services/generateEsMappingFromLectern.ts
import fs from "fs";
import path from "path";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import type {
  ElasticsearchMapping,
  ElasticsearchField,
  LecternDictionary,
  LecternSchema,
  LecternField,
} from "../types";

export interface LecternMappingOptions {
  ignoredSchemas?: string[];
  ignoredFields?: string[];
  skipMetadata?: boolean;
  customRules?: Partial<TypeMappingRules>;
}

interface TypeMappingRules {
  textFieldThreshold: number;
  datePatterns: string[];
  keywordFields: string[];
}

const defaultRules: TypeMappingRules = {
  textFieldThreshold: 256,
  datePatterns: ["date", "time", "timestamp", "created", "updated", "modified"],
  keywordFields: ["id", "code", "status", "type", "category"],
};

/**
 * Maps Lectern value types to Elasticsearch field types
 */
function mapLecternTypeToElasticsearch(
  lecternField: LecternField,
  rules: TypeMappingRules = defaultRules
): ElasticsearchField {
  Logger.debug`Mapping Lectern field: ${lecternField.name} (${lecternField.valueType})`;

  const fieldName = lecternField.name.toLowerCase();

  // Check for date patterns in field name
  const isDateField = rules.datePatterns.some((pattern) =>
    fieldName.includes(pattern)
  );

  // Check for keyword patterns in field name
  const isKeywordField = rules.keywordFields.some((pattern) =>
    fieldName.includes(pattern)
  );

  let esField: ElasticsearchField;

  switch (lecternField.valueType) {
    case "string":
      if (isDateField) {
        esField = { type: "date" };
      } else if (isKeywordField) {
        esField = { type: "keyword" };
      } else {
        // Use description length or field name to determine text vs keyword
        const description = lecternField.description || "";
        const shouldBeText =
          description.length > rules.textFieldThreshold ||
          fieldName.includes("description") ||
          fieldName.includes("comment") ||
          fieldName.includes("note");

        esField = { type: shouldBeText ? "text" : "keyword" };
      }
      break;

    case "integer":
      esField = { type: "integer" };
      break;

    case "number":
      esField = { type: "float" };
      break;

    case "boolean":
      esField = { type: "boolean" };
      break;

    default:
      Logger.warn`Unknown Lectern type: ${lecternField.valueType}, defaulting to keyword`;
      esField = { type: "keyword" };
  }

  Logger.debug`Mapped to Elasticsearch type: ${esField.type}`;
  return esField;
}

/**
 * Converts a Lectern schema to Elasticsearch field properties
 */
function convertLecternSchemaToProperties(
  schema: LecternSchema,
  options: LecternMappingOptions,
  rules: TypeMappingRules
): Record<string, ElasticsearchField> {
  Logger.info`Converting schema: ${schema.name}`;

  const properties: Record<string, ElasticsearchField> = {};
  const ignoredFields = options.ignoredFields || [];

  schema.fields.forEach((field) => {
    if (ignoredFields.includes(field.name)) {
      Logger.debug`Ignoring field: ${field.name}`;
      return;
    }

    try {
      properties[field.name] = mapLecternTypeToElasticsearch(field, rules);
      Logger.debug`Added field: ${field.name}`;
    } catch (error) {
      Logger.warn`Error processing field ${field.name}: ${error}`;
      // Fallback to keyword type
      properties[field.name] = { type: "keyword", null_value: "No Data" };
    }
  });

  Logger.debug`Converted ${
    Object.keys(properties).length
  } fields from schema: ${schema.name}`;
  return properties;
}

/**
 * Main function to generate Elasticsearch mapping from Lectern dictionary
 */
export function generateMappingFromLectern(
  lecternFilePath: string,
  indexName: string,
  options: LecternMappingOptions = {}
): ElasticsearchMapping {
  try {
    Logger.debugString("generateEsMappingFromLectern running");
    Logger.debug`Processing file: ${path.basename(lecternFilePath)}`;

    const ignoredSchemas = options.ignoredSchemas || [];
    const skipMetadata = options.skipMetadata || false;
    const customRules = options.customRules || {};

    const rules: TypeMappingRules = {
      ...defaultRules,
      ...customRules,
    };

    if (ignoredSchemas.length > 0) {
      Logger.info`Schemas that will be excluded: ${ignoredSchemas.join(", ")}`;
    }

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

    const startTime = Date.now();

    // Read and parse Lectern dictionary
    const lecternData: LecternDictionary = JSON.parse(
      fs.readFileSync(lecternFilePath, "utf8")
    );

    const parseTime = Date.now() - startTime;
    if (parseTime > 500) {
      Logger.timing("JSON parsing", parseTime);
    }

    // Validate Lectern dictionary structure
    if (!lecternData.schemas || !Array.isArray(lecternData.schemas)) {
      throw ErrorFactory.file(
        "Invalid Lectern dictionary: missing or invalid schemas array",
        lecternFilePath,
        [
          "Ensure the dictionary contains a 'schemas' array",
          "Check that the file is a valid Lectern dictionary",
          "Verify the JSON structure matches Lectern specification",
        ]
      );
    }

    if (lecternData.schemas.length === 0) {
      throw ErrorFactory.file(
        "Lectern dictionary contains no schemas",
        lecternFilePath,
        [
          "Ensure the dictionary has at least one schema",
          "Check that schemas were properly generated",
          "Verify the dictionary is not empty",
        ]
      );
    }

    Logger.info`Found ${lecternData.schemas.length} schemas in dictionary`;

    // Filter out ignored schemas
    const validSchemas = lecternData.schemas.filter((schema) => {
      if (ignoredSchemas.includes(schema.name)) {
        Logger.debug`Ignoring schema: ${schema.name}`;
        return false;
      }
      return true;
    });

    if (validSchemas.length === 0) {
      throw ErrorFactory.validation(
        "No valid schemas found after filtering",
        { totalSchemas: lecternData.schemas.length, ignoredSchemas },
        [
          "Check that not all schemas are being ignored",
          "Verify schema names in the dictionary",
          "Ensure the dictionary contains processable schemas",
        ]
      );
    }

    Logger.info`Processing ${validSchemas.length} schemas`;

    // Convert schemas to Elasticsearch properties
    const allProperties: Record<string, ElasticsearchField> = {};
    let totalFieldCount = 0;

    validSchemas.forEach((schema) => {
      const schemaProperties = convertLecternSchemaToProperties(
        schema,
        options,
        rules
      );

      // Merge properties - if there are conflicts, log them
      Object.entries(schemaProperties).forEach(([fieldName, fieldDef]) => {
        if (allProperties[fieldName]) {
          // Check if definitions are compatible
          if (allProperties[fieldName].type !== fieldDef.type) {
            Logger.warn`Field type conflict for '${fieldName}': ${allProperties[fieldName].type} vs ${fieldDef.type}`;
            Logger.warn`Using first definition (${allProperties[fieldName].type})`;
          }
        } else {
          allProperties[fieldName] = fieldDef;
          totalFieldCount++;
        }
      });
    });

    Logger.info`Generated mapping for ${totalFieldCount} unique fields`;

    // Create data properties (only the Lectern fields)
    const dataProperties = { ...allProperties };

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
          submitter_id: { type: "keyword" as const, null_value: "No Data" },
          processing_started: { type: "date" as const },
          processed_at: { type: "date" as const },
          source_file: { type: "keyword" as const, null_value: "No Data" },
          record_number: { type: "integer" as const },
          hostname: { type: "keyword" as const, null_value: "No Data" },
          username: { type: "keyword" as const, null_value: "No Data" },
        },
      };
    }

    // Build the final mapping
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
    Logger.debugObject("Generated Mapping Summary", {
      indexName,
      totalSchemas: validSchemas.length,
      totalFields: totalFieldCount,
      hasMetadata: !skipMetadata,
    });

    return mapping;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack =
      error instanceof Error ? error.stack : "No stack trace available";

    Logger.errorString("Error generating mapping from Lectern dictionary");
    Logger.debugObject("Error details", {
      filePath: lecternFilePath,
      errorMessage,
      stack: errorStack,
    });

    if (error instanceof Error && error.name === "ComposerError") {
      throw error;
    }

    throw ErrorFactory.generation(
      `Error generating mapping from Lectern dictionary: ${errorMessage}`,
      {
        filePath: lecternFilePath,
        errorMessage,
        stack: errorStack,
      },
      [
        "Check that the Lectern dictionary file is valid and properly formatted",
        "Ensure the file contains valid schemas with fields",
        "Verify file permissions and accessibility",
        "Check that the dictionary follows Lectern specification",
      ]
    );
  }
}
