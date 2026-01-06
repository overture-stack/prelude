"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SongSchema = SongSchema;
exports.validateSongSchema = validateSongSchema;
// src/services/generateSongSchema.ts - Updated with consolidated error handling
const logger_1 = require("../utils/logger");
function inferSongType(propertyName, value) {
    logger_1.Logger.debug `Inferring type for field: ${propertyName}`;
    if (!isNaN(Number(value))) {
        if (Number.isInteger(Number(value))) {
            logger_1.Logger.debugString("Detected integer type");
            return "integer";
        }
        logger_1.Logger.debugString("Detected number type");
        return "number";
    }
    if (typeof value === "boolean" || value === "true" || value === "false") {
        logger_1.Logger.debugString("Detected boolean type");
        return "boolean";
    }
    logger_1.Logger.debugString("Defaulting to string type");
    return "string";
}
function generateSongField(propertyName, value) {
    if (Array.isArray(value)) {
        logger_1.Logger.debug `Generating field for array: ${propertyName}`;
        const itemType = value.length > 0
            ? generateSongField("arrayItem", value[0])
            : { type: "string" };
        return {
            type: "array",
            items: itemType,
        };
    }
    if (typeof value === "object" && value !== null) {
        logger_1.Logger.debug `Generating field for object: ${propertyName}`;
        const { fields, fieldNames } = generateSongFields(value);
        return {
            propertyNames: {
                enum: fieldNames,
            },
            required: fieldNames,
            type: "object",
            properties: fields,
        };
    }
    logger_1.Logger.debug `Generating field for primitive: ${propertyName}`;
    return {
        type: inferSongType(propertyName, value),
    };
}
function generateSongFields(data) {
    logger_1.Logger.debugString("Generating field definitions");
    const fields = {};
    const fieldNames = [];
    for (const propertyName of Object.keys(data)) {
        try {
            const value = data[propertyName];
            fields[propertyName] = generateSongField(propertyName, value);
            fieldNames.push(propertyName);
            logger_1.Logger.debug `Generated field definition for: ${propertyName}`;
        }
        catch (error) {
            logger_1.Logger.warn `Error generating field definition for ${propertyName}: ${error}`;
            fields[propertyName] = { type: "object" };
            fieldNames.push(propertyName);
        }
    }
    return { fields, fieldNames };
}
// Main export functions
function SongSchema(sampleData, schemaName, options) {
    logger_1.Logger.debugString("Generating SONG schema");
    logger_1.Logger.debug `Schema name: ${schemaName}`;
    const schemaFields = {};
    const requiredFields = ["experiment"];
    if (sampleData.experiment) {
        try {
            schemaFields.experiment = generateSongField("experiment", sampleData.experiment);
            logger_1.Logger.debugString("Added experiment field to schema");
        }
        catch (error) {
            logger_1.Logger.warn `Error generating experiment field: ${error}`;
            schemaFields.experiment = { type: "object" };
        }
    }
    else {
        logger_1.Logger.warnString("No experiment data provided in sample, adding empty placeholder");
        schemaFields.experiment = { type: "object" };
    }
    if (sampleData.workflow) {
        try {
            schemaFields.workflow = generateSongField("workflow", sampleData.workflow);
            logger_1.Logger.debugString("Added workflow field to schema");
            requiredFields.push("workflow");
        }
        catch (error) {
            logger_1.Logger.warn `Error generating workflow field: ${error}`;
            schemaFields.workflow = { type: "object" };
        }
    }
    const schemaOptions = {
        fileTypes: options?.fileTypes || [],
        externalValidations: options?.externalValidations || [],
    };
    const schema = {
        name: schemaName,
        options: schemaOptions,
        schema: {
            type: "object",
            required: requiredFields,
            properties: schemaFields,
        },
    };
    logger_1.Logger.debugString("Song schema generated successfully");
    logger_1.Logger.debugObject("Generated Schema", schema);
    return schema;
}
function validateSongSchema(schema) {
    try {
        logger_1.Logger.debugString("Validating SONG schema");
        if (!schema.name) {
            throw new Error("Schema must have a name");
        }
        if (schema.name.includes(" ")) {
            throw new Error("Schema name cannot contain spaces");
        }
        if (!schema.schema || schema.schema.type !== "object") {
            throw new Error("Schema must be an object type");
        }
        if (!Array.isArray(schema.schema.required)) {
            throw new Error("Schema must have a required array");
        }
        if (!schema.schema.properties ||
            Object.keys(schema.schema.properties).length === 0) {
            throw new Error("Schema must have at least one property");
        }
        const properties = schema.schema.properties;
        if (!properties.experiment) {
            throw new Error("Schema must have an experiment section");
        }
        if (!schema.schema.required.includes("experiment")) {
            throw new Error("The experiment field must be required");
        }
        logger_1.Logger.debugString("Schema validation passed");
        return true;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        logger_1.Logger.debug `Schema validation failed: ${errorMessage}`;
        return false;
    }
}
//# sourceMappingURL=generateSongSchema.js.map