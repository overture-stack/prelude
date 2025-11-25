"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMappingFromLectern = generateMappingFromLectern;
// src/services/generateEsMappingFromLectern.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const defaultRules = {
    textFieldThreshold: 256,
    datePatterns: ["date", "time", "timestamp", "created", "updated", "modified"],
    keywordFields: ["id", "code", "status", "type", "category"],
};
/**
 * Maps Lectern value types to Elasticsearch field types
 */
function mapLecternTypeToElasticsearch(lecternField, rules = defaultRules) {
    logger_1.Logger.debug `Mapping Lectern field: ${lecternField.name} (${lecternField.valueType})`;
    const fieldName = lecternField.name.toLowerCase();
    // Check for date patterns in field name
    const isDateField = rules.datePatterns.some((pattern) => fieldName.includes(pattern));
    // Check for keyword patterns in field name
    const isKeywordField = rules.keywordFields.some((pattern) => fieldName.includes(pattern));
    let esField;
    switch (lecternField.valueType) {
        case "string":
            if (isDateField) {
                esField = { type: "date" };
            }
            else if (isKeywordField) {
                esField = { type: "keyword" };
            }
            else {
                // Use description length or field name to determine text vs keyword
                const description = lecternField.description || "";
                const shouldBeText = description.length > rules.textFieldThreshold ||
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
            logger_1.Logger.warn `Unknown Lectern type: ${lecternField.valueType}, defaulting to keyword`;
            esField = { type: "keyword" };
    }
    logger_1.Logger.debug `Mapped to Elasticsearch type: ${esField.type}`;
    return esField;
}
/**
 * Converts a Lectern schema to Elasticsearch field properties
 */
function convertLecternSchemaToProperties(schema, options, rules) {
    logger_1.Logger.info `Converting schema: ${schema.name}`;
    const properties = {};
    const ignoredFields = options.ignoredFields || [];
    schema.fields.forEach((field) => {
        if (ignoredFields.includes(field.name)) {
            logger_1.Logger.debug `Ignoring field: ${field.name}`;
            return;
        }
        try {
            properties[field.name] = mapLecternTypeToElasticsearch(field, rules);
            logger_1.Logger.debug `Added field: ${field.name}`;
        }
        catch (error) {
            logger_1.Logger.warn `Error processing field ${field.name}: ${error}`;
            // Fallback to keyword type
            properties[field.name] = { type: "keyword", null_value: "No Data" };
        }
    });
    logger_1.Logger.debug `Converted ${Object.keys(properties).length} fields from schema: ${schema.name}`;
    return properties;
}
/**
 * Main function to generate Elasticsearch mapping from Lectern dictionary
 */
function generateMappingFromLectern(lecternFilePath, indexName, options = {}) {
    try {
        logger_1.Logger.debugString("generateEsMappingFromLectern running");
        logger_1.Logger.debug `Processing file: ${path_1.default.basename(lecternFilePath)}`;
        const ignoredSchemas = options.ignoredSchemas || [];
        const skipMetadata = options.skipMetadata || false;
        const customRules = options.customRules || {};
        const rules = {
            ...defaultRules,
            ...customRules,
        };
        if (ignoredSchemas.length > 0) {
            logger_1.Logger.info `Schemas that will be excluded: ${ignoredSchemas.join(", ")}`;
        }
        if (skipMetadata) {
            logger_1.Logger.infoString("Submission metadata fields will be excluded from mapping");
        }
        if (indexName === "default" || indexName === "data") {
            logger_1.Logger.defaultValueWarning("No index name supplied, defaulting to: data", "--index <name>");
            indexName = "data";
        }
        else {
            logger_1.Logger.info `Using index name: ${indexName}`;
        }
        const startTime = Date.now();
        // Read and parse Lectern dictionary
        const lecternData = JSON.parse(fs_1.default.readFileSync(lecternFilePath, "utf8"));
        const parseTime = Date.now() - startTime;
        if (parseTime > 500) {
            logger_1.Logger.timing("JSON parsing", parseTime);
        }
        // Validate Lectern dictionary structure
        if (!lecternData.schemas || !Array.isArray(lecternData.schemas)) {
            throw errors_1.ErrorFactory.file("Invalid Lectern dictionary: missing or invalid schemas array", lecternFilePath, [
                "Ensure the dictionary contains a 'schemas' array",
                "Check that the file is a valid Lectern dictionary",
                "Verify the JSON structure matches Lectern specification",
            ]);
        }
        if (lecternData.schemas.length === 0) {
            throw errors_1.ErrorFactory.file("Lectern dictionary contains no schemas", lecternFilePath, [
                "Ensure the dictionary has at least one schema",
                "Check that schemas were properly generated",
                "Verify the dictionary is not empty",
            ]);
        }
        logger_1.Logger.info `Found ${lecternData.schemas.length} schemas in dictionary`;
        // Filter out ignored schemas
        const validSchemas = lecternData.schemas.filter((schema) => {
            if (ignoredSchemas.includes(schema.name)) {
                logger_1.Logger.debug `Ignoring schema: ${schema.name}`;
                return false;
            }
            return true;
        });
        if (validSchemas.length === 0) {
            throw errors_1.ErrorFactory.validation("No valid schemas found after filtering", { totalSchemas: lecternData.schemas.length, ignoredSchemas }, [
                "Check that not all schemas are being ignored",
                "Verify schema names in the dictionary",
                "Ensure the dictionary contains processable schemas",
            ]);
        }
        logger_1.Logger.info `Processing ${validSchemas.length} schemas`;
        // Convert schemas to Elasticsearch properties
        const allProperties = {};
        let totalFieldCount = 0;
        validSchemas.forEach((schema) => {
            const schemaProperties = convertLecternSchemaToProperties(schema, options, rules);
            // Merge properties - if there are conflicts, log them
            Object.entries(schemaProperties).forEach(([fieldName, fieldDef]) => {
                if (allProperties[fieldName]) {
                    // Check if definitions are compatible
                    if (allProperties[fieldName].type !== fieldDef.type) {
                        logger_1.Logger.warn `Field type conflict for '${fieldName}': ${allProperties[fieldName].type} vs ${fieldDef.type}`;
                        logger_1.Logger.warn `Using first definition (${allProperties[fieldName].type})`;
                    }
                }
                else {
                    allProperties[fieldName] = fieldDef;
                    totalFieldCount++;
                }
            });
        });
        logger_1.Logger.info `Generated mapping for ${totalFieldCount} unique fields`;
        // Create data properties (only the Lectern fields)
        const dataProperties = { ...allProperties };
        // Create root-level properties with data and optionally submission_metadata
        const rootProperties = {
            data: {
                type: "object",
                properties: dataProperties,
            },
        };
        // Add submission_metadata at root level if not skipped
        if (!skipMetadata) {
            rootProperties.submission_metadata = {
                type: "object",
                properties: {
                    submission_id: { type: "keyword", null_value: "No Data" },
                    source_file_hash: { type: "keyword", null_value: "No Data" },
                    processed_at: { type: "date" },
                },
            };
        }
        // Build the final mapping
        const mapping = {
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
        logger_1.Logger.debugString("Mapping configuration generated successfully");
        logger_1.Logger.debugObject("Generated Mapping Summary", {
            indexName,
            totalSchemas: validSchemas.length,
            totalFields: totalFieldCount,
            hasMetadata: !skipMetadata,
        });
        return mapping;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : "No stack trace available";
        logger_1.Logger.errorString("Error generating mapping from Lectern dictionary");
        logger_1.Logger.debugObject("Error details", {
            filePath: lecternFilePath,
            errorMessage,
            stack: errorStack,
        });
        if (error instanceof Error && error.name === "ComposerError") {
            throw error;
        }
        throw errors_1.ErrorFactory.generation(`Error generating mapping from Lectern dictionary: ${errorMessage}`, {
            filePath: lecternFilePath,
            errorMessage,
            stack: errorStack,
        }, [
            "Check that the Lectern dictionary file is valid and properly formatted",
            "Ensure the file contains valid schemas with fields",
            "Verify file permissions and accessibility",
            "Check that the dictionary follows Lectern specification",
        ]);
    }
}
//# sourceMappingURL=generateESMappingFromLectern.js.map