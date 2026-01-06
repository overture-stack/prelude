"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDictionary = generateDictionary;
exports.generateSchema = generateSchema;
// src/services/generateLecternDictionary.ts - Updated with consolidated error handling
const logger_1 = require("../utils/logger");
const path = __importStar(require("path"));
// ---- Value Type Inference ----
/**
 * Infers the Lectern value type from a field's sample data
 *
 * Rules:
 * - Empty values → string
 * - Boolean-like values → boolean (true/false, yes/no, 1/0)
 * - Numeric values → integer or number
 * - Default → string
 *
 * @example
 * inferValueType("age", "25") → "integer"
 * inferValueType("is_active", "true") → "boolean"
 * inferValueType("score", "85.5") → "number"
 * inferValueType("name", "John") → "string"
 */
// Made private - no longer exported
function inferValueType(headerName, sampleValue) {
    logger_1.Logger.debug `Inferring type for field: ${headerName}`;
    // Handle empty values
    if (!sampleValue || sampleValue.trim() === "") {
        logger_1.Logger.debugString("Empty sample value detected, defaulting to string type");
        return "string";
    }
    // Check for boolean values
    const lowerValue = sampleValue.toLowerCase();
    const booleanValues = ["true", "false", "yes", "no", "0", "1"];
    if (booleanValues.includes(lowerValue)) {
        logger_1.Logger.debugString("Detected boolean type");
        return "boolean";
    }
    // Check for numeric values
    if (!isNaN(Number(sampleValue))) {
        if (Number.isInteger(Number(sampleValue))) {
            logger_1.Logger.debugString("Detected integer type");
            return "integer";
        }
        logger_1.Logger.debugString("Detected number type");
        return "number";
    }
    // Default to string type
    logger_1.Logger.debugString("Detected string type");
    return "string";
}
// ---- Dictionary Generation ----
/**
 * Creates a base Lectern dictionary structure
 * Initializes an empty dictionary with metadata
 *
 * @example
 * generateDictionary(
 *   "My Dictionary",
 *   "Sample data dictionary",
 *   "1.0.0"
 * ) → {
 *   name: "My Dictionary",
 *   description: "Sample data dictionary",
 *   version: "1.0.0",
 *   schemas: [],
 *   meta: {}
 * }
 */
function generateDictionary(dictionaryName, description, version) {
    logger_1.Logger.infoString("Generating Lectern dictionary");
    logger_1.Logger.info `Dictionary Name: ${dictionaryName}`;
    logger_1.Logger.info `Description: ${description}`;
    logger_1.Logger.info `Version: ${version}`;
    const dictionary = {
        name: dictionaryName,
        description: description,
        version: version,
        meta: {},
        schemas: [],
    };
    logger_1.Logger.debug `${dictionaryName} dictionary generated`;
    logger_1.Logger.debugObject("Dictionary Details", dictionary);
    return dictionary;
}
// ---- Schema Generation ----
/**
 * Generates a Lectern schema from CSV headers and sample data
 * Creates field definitions with inferred types and metadata
 * Uses the input file name as the schema name
 *
 * Process:
 * 1. Maps each CSV header to a field definition
 * 2. Infers value types from sample data
 * 3. Adds metadata and descriptions
 * 4. Assembles complete schema
 *
 * @example
 * generateSchema(
 *   "patient_data.csv",
 *   ["name", "age", "is_active"],
 *   { name: "John", age: "30", is_active: "true" }
 * ) → {
 *   name: "patient_data",
 *   description: "Schema generated from patient_data.csv",
 *   fields: [
 *     { name: "name", valueType: "string", ... },
 *     { name: "age", valueType: "integer", ... },
 *     { name: "is_active", valueType: "boolean", ... }
 *   ],
 *   meta: { createdAt: "...", filename: "patient_data.csv" }
 * }
 */
function generateSchema(inputFilePath, csvHeaders, sampleData) {
    // Generate schema name from file name
    const schemaName = path
        .basename(inputFilePath, path.extname(inputFilePath))
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_");
    logger_1.Logger.info `Generating schema: ${schemaName} from file: ${inputFilePath}`;
    logger_1.Logger.debugObject("CSV Headers", csvHeaders);
    // Generate field definitions
    const fields = csvHeaders.map((header) => {
        const sampleValue = sampleData[header] || "";
        const valueType = inferValueType(header, sampleValue);
        // Create field definition with metadata
        const field = {
            name: header,
            description: `Field containing ${header} data`,
            valueType: valueType,
            meta: {
                displayName: header,
            },
        };
        logger_1.Logger.debug `Created field definition for: ${header}`;
        logger_1.Logger.debugObject(`Field Details for ${header}`, field);
        return field;
    });
    // Create schema with metadata
    const schema = {
        name: schemaName,
        description: `Schema generated from ${path.basename(inputFilePath)}`,
        fields: fields,
        meta: {
            createdAt: new Date().toISOString(),
            sourceFile: path.basename(inputFilePath),
        },
    };
    logger_1.Logger.info `${schemaName} schema added to dictionary`;
    logger_1.Logger.debugObject("Schema Details", schema);
    return schema;
}
/* Usage Examples:
// Create a dictionary
const dictionary = generateDictionary("Patient Data", "Medical records schema", "1.0.0");

// Generate schema from CSV data
const filePath = "patient_data.csv";
const headers = ["name", "age", "is_active"];
const sampleData = {
  name: "John Doe",
  age: "30",
  is_active: "true"
};
const schema = generateSchema(filePath, headers, sampleData);
dictionary.schemas.push(schema);
*/
//# sourceMappingURL=generateLecternDictionary.js.map