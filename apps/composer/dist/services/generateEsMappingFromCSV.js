"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMappingFromCSV = generateMappingFromCSV;
// src/services/generateEsMappingFromCSV.ts - Updated with consolidated error handling
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors"); // UPDATED: Import ErrorFactory
const defaultRules = {
    maxTextLength: 256,
    datePatterns: ["date", "time", "timestamp", "created", "updated", "modified"],
    excludePatterns: ["password", "secret", "key", "token"],
    booleanValues: ["true", "false", "yes", "no", "0", "1"],
};
function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
}
function inferFieldType(headerName, sampleValue, rules = defaultRules) {
    try {
        logger_1.Logger.debug `Inferring type for field: ${headerName}`;
        if (!sampleValue || sampleValue.trim() === "") {
            logger_1.Logger.debugString("Empty value detected, defaulting to keyword with null value");
            return { type: "keyword", null_value: "No Data" };
        }
        if (rules.excludePatterns.some((pattern) => headerName.toLowerCase().includes(pattern))) {
            logger_1.Logger.debugString("Field matches exclude pattern, setting as keyword");
            return { type: "keyword" };
        }
        if (!isNaN(Number(sampleValue))) {
            if (Number.isInteger(Number(sampleValue))) {
                logger_1.Logger.debugString("Detected integer type");
                return { type: "integer" };
            }
            logger_1.Logger.debugString("Detected float type");
            return { type: "float" };
        }
        const lowerValue = sampleValue.toLowerCase();
        if (rules.booleanValues.includes(lowerValue)) {
            logger_1.Logger.debugString("Detected boolean type");
            return { type: "boolean" };
        }
        if (rules.datePatterns.some((pattern) => headerName.toLowerCase().includes(pattern))) {
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
    catch (error) {
        logger_1.Logger.errorString("Error inferring field type");
        logger_1.Logger.debugObject("Error details", { headerName, sampleValue, error });
        // UPDATED: Use ErrorFactory
        throw errors_1.ErrorFactory.generation("Error inferring field type", { headerName, sampleValue, error }, [
            "Check that the sample value is valid",
            "Ensure the header name doesn't contain special characters",
            "Verify the CSV data is properly formatted",
        ]);
    }
}
// Main export function
function generateMappingFromCSV(csvHeaders, sampleData, indexName = "data", options = {}) {
    try {
        logger_1.Logger.debugString("generateEsMappingFromCSV running");
        logger_1.Logger.debug `Processing ${csvHeaders.length} CSV columns`;
        const skipMetadata = options.skipMetadata || false;
        const customRules = options.customRules || {};
        const rules = {
            ...defaultRules,
            ...customRules,
        };
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
        logger_1.Logger.info `Analyzing ${csvHeaders.length} fields for type inference`;
        const typeInferenceStart = Date.now();
        const properties = {};
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
            logger_1.Logger.timing("Type inference", typeInferenceTime);
        }
        logger_1.Logger.debugString("Field analysis complete");
        // Log field type distribution if debug enabled
        if (numericFieldCount > 0) {
            logger_1.Logger.debug `Numeric fields: ${numericFieldCount}`;
        }
        if (dateFieldCount > 0) {
            logger_1.Logger.debug `Date fields: ${dateFieldCount}`;
        }
        if (booleanFieldCount > 0) {
            logger_1.Logger.debug `Boolean fields: ${booleanFieldCount}`;
        }
        if (textFieldCount > 0) {
            logger_1.Logger.debug `Text fields: ${textFieldCount}`;
        }
        if (keywordFieldCount > 0) {
            logger_1.Logger.debug `Keyword fields: ${keywordFieldCount}`;
        }
        if (complexFieldCount > 0) {
            logger_1.Logger.debug `Complex fields: ${complexFieldCount}`;
        }
        // Create data properties (only the CSV fields)
        const dataProperties = { ...properties };
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
        logger_1.Logger.debugObject("Generated Mapping", mapping);
        return mapping;
    }
    catch (error) {
        logger_1.Logger.errorString("Error generating mapping from CSV");
        logger_1.Logger.debugObject("Error details", { csvHeaders, error });
        // UPDATED: Use ErrorFactory
        throw errors_1.ErrorFactory.generation("Error generating mapping from CSV", { csvHeaders, error }, [
            "Check that all CSV headers are valid",
            "Ensure sample data is properly formatted",
            "Verify there are no special characters in headers",
            "Check that the CSV structure is consistent",
        ]);
    }
}
//# sourceMappingURL=generateEsMappingFromCSV.js.map