"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMappingFromJson = generateMappingFromJson;
// src/services/generateEsMappingFromJSON.ts - Updated with consolidated error handling
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors"); // UPDATED: Import ErrorFactory
const defaultRules = {
    maxTextLength: 256,
    datePatterns: ["date", "time", "timestamp", "created", "updated", "modified"],
    excludePatterns: ["password", "secret", "key", "token"],
};
function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
}
function inferFieldType(keyName, sampleValue, rules = defaultRules) {
    try {
        logger_1.Logger.debug `Inferring type for field: ${keyName}`;
        if (sampleValue === null || sampleValue === undefined) {
            logger_1.Logger.debugString("Null/undefined value detected, defaulting to keyword");
            return { type: "keyword", null_value: "No Data" };
        }
        if (rules.excludePatterns.some((pattern) => keyName.toLowerCase().includes(pattern))) {
            logger_1.Logger.debugString("Field matches exclude pattern, setting as keyword");
            return { type: "keyword" };
        }
        if (typeof sampleValue === "object" && !Array.isArray(sampleValue)) {
            logger_1.Logger.debug `Processing nested object for ${keyName}`;
            const properties = {};
            for (const [key, value] of Object.entries(sampleValue)) {
                properties[key] = inferFieldType(key, value, rules);
            }
            return { type: "object", properties };
        }
        if (Array.isArray(sampleValue)) {
            logger_1.Logger.debug `Processing array for ${keyName}`;
            if (sampleValue.length === 0) {
                return { type: "keyword" };
            }
            if (typeof sampleValue[0] === "object" &&
                sampleValue[0] !== null &&
                !Array.isArray(sampleValue[0])) {
                const properties = {};
                for (const [key, value] of Object.entries(sampleValue[0])) {
                    properties[key] = inferFieldType(key, value, rules);
                }
                return {
                    type: "nested",
                    properties: properties,
                };
            }
            else {
                const elementType = inferFieldType(`${keyName}_element`, sampleValue[0], rules);
                return {
                    type: "nested",
                    properties: { value: elementType },
                };
            }
        }
        if (typeof sampleValue === "number") {
            if (Number.isInteger(sampleValue)) {
                logger_1.Logger.debugString("Detected integer type");
                return { type: "integer" };
            }
            logger_1.Logger.debugString("Detected float type");
            return { type: "float" };
        }
        if (typeof sampleValue === "boolean") {
            logger_1.Logger.debugString("Detected boolean type");
            return { type: "boolean" };
        }
        if (typeof sampleValue === "string") {
            if (rules.datePatterns.some((pattern) => keyName.toLowerCase().includes(pattern))) {
                if (isValidDate(sampleValue)) {
                    logger_1.Logger.debugString("Detected date type");
                    return { type: "date" };
                }
            }
            if (sampleValue.length > rules.maxTextLength) {
                logger_1.Logger.debugString("Detected text type (long string)");
                return { type: "text" };
            }
            logger_1.Logger.debugString("Detected keyword type");
            return { type: "keyword" };
        }
        logger_1.Logger.debugString("Using default keyword type for unknown value type");
        return { type: "keyword" };
    }
    catch (error) {
        logger_1.Logger.errorString("Error inferring field type");
        logger_1.Logger.debugObject("Error details", { keyName, sampleValue, error });
        // UPDATED: Use ErrorFactory
        throw errors_1.ErrorFactory.generation("Error inferring field type", { keyName, sampleValue, error }, [
            "Check that the JSON value is valid",
            "Ensure the field name doesn't contain special characters",
            "Verify the JSON structure is properly formatted",
        ]);
    }
}
// Main export function
function generateMappingFromJson(jsonFilePath, indexName, options = {}) {
    try {
        logger_1.Logger.debugString("generateEsMappingFromJSON running");
        logger_1.Logger.debug `Processing file: ${path_1.default.basename(jsonFilePath)} within generateEsMappingFromJSON function`;
        const ignoredFields = options.ignoredFields || [];
        const skipMetadata = options.skipMetadata || false;
        const customRules = options.customRules || {};
        const rules = {
            ...defaultRules,
            ...customRules,
        };
        if (ignoredFields.length > 0) {
            logger_1.Logger.info `Fields that will be excluded from mapping: ${ignoredFields.join(", ")}`;
        }
        if (skipMetadata) {
            logger_1.Logger.infoString("Submission metadata fields will be excluded from mapping");
        }
        if (indexName === "default" || indexName === "data") {
            logger_1.Logger.defaultValueWarning("No index name supplied, defaulting to: data", "--index <n>");
            indexName = "data";
        }
        else {
            logger_1.Logger.info `Using index name: ${indexName}`;
        }
        const startTime = Date.now();
        const jsonData = JSON.parse(fs_1.default.readFileSync(jsonFilePath, "utf8"));
        const parseTime = Date.now() - startTime;
        if (parseTime > 500) {
            logger_1.Logger.timing("JSON parsing", parseTime);
        }
        if (typeof jsonData !== "object" || jsonData === null) {
            // UPDATED: Use ErrorFactory
            throw errors_1.ErrorFactory.file("Invalid JSON: Expected a non-null object", jsonFilePath, [
                "Ensure the JSON file contains a valid object structure",
                "Check that the file is not empty or corrupted",
                "Verify the JSON syntax is correct",
            ]);
        }
        let mappingProperties;
        const hasDataKey = jsonData.hasOwnProperty("data");
        const sampleData = hasDataKey ? jsonData.data : jsonData;
        const processDataStructure = (data) => {
            const dataProperties = {};
            Object.entries(data).forEach(([key, value]) => {
                if (ignoredFields.includes(key)) {
                    logger_1.Logger.debug `Ignoring field: ${key}`;
                    return;
                }
                if (Array.isArray(value) && value.length > 0) {
                    const firstElement = value[0];
                    if (typeof firstElement === "object" && firstElement !== null) {
                        dataProperties[key] = {
                            type: "nested",
                            properties: processDataStructure(firstElement),
                        };
                    }
                    else {
                        dataProperties[key] = inferFieldType(key, value[0], rules);
                    }
                }
                else if (typeof value === "object" && value !== null) {
                    dataProperties[key] = {
                        type: "object",
                        properties: processDataStructure(value),
                    };
                }
                else {
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
        }
        else {
            mappingProperties = processDataStructure(sampleData);
        }
        // Add submission_metadata if not skipped
        if (!skipMetadata) {
            mappingProperties.submission_metadata = {
                type: "object",
                properties: {
                    submission_id: { type: "keyword", null_value: "No Data" },
                    source_file_hash: { type: "keyword", null_value: "No Data" },
                    processed_at: { type: "date" },
                },
            };
        }
        const mapping = {
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
        logger_1.Logger.debugString("Mapping configuration generated successfully");
        logger_1.Logger.debugObject("Generated Mapping", mapping);
        return mapping;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : "No stack trace available";
        logger_1.Logger.errorString("Error generating mapping from JSON");
        logger_1.Logger.debugObject("Error details", {
            filePath: jsonFilePath,
            errorMessage,
            stack: errorStack,
        });
        if (error instanceof Error && error.name === "ComposerError") {
            throw error;
        }
        // UPDATED: Use ErrorFactory
        throw errors_1.ErrorFactory.generation(`Error generating mapping from JSON: ${errorMessage}`, {
            filePath: jsonFilePath,
            errorMessage,
            stack: errorStack,
        }, [
            "Check that the JSON file is valid and properly formatted",
            "Ensure the file contains the expected data structure",
            "Verify file permissions and accessibility",
            "Check that the JSON follows the expected schema format",
        ]);
    }
}
//# sourceMappingURL=generateEsMappingFromJSON.js.map