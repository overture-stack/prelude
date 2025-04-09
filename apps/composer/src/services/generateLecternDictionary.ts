import { Logger } from "../utils/logger";
import * as path from "path";
import type {
  LecternDictionary,
  LecternSchema,
  LecternField,
  ValueType,
  MetaData,
} from "../types";

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
export function inferValueType(
  headerName: string,
  sampleValue: string
): ValueType {
  Logger.debug`Inferring type for field: ${headerName}`;

  // Handle empty values
  if (!sampleValue || sampleValue.trim() === "") {
    Logger.debug("Empty sample value detected, defaulting to string type");
    return "string";
  }

  // Check for boolean values
  const lowerValue = sampleValue.toLowerCase();
  const booleanValues = ["true", "false", "yes", "no", "0", "1"];
  if (booleanValues.includes(lowerValue)) {
    Logger.debug("Detected boolean type");
    return "boolean";
  }

  // Check for numeric values
  if (!isNaN(Number(sampleValue))) {
    if (Number.isInteger(Number(sampleValue))) {
      Logger.debug("Detected integer type");
      return "integer";
    }
    Logger.debug("Detected number type");
    return "number";
  }

  // Default to string type
  Logger.debug("Detected string type");
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
export function generateDictionary(
  dictionaryName: string,
  description: string,
  version: string
): LecternDictionary {
  Logger.info("Generating Lectern dictionary");
  Logger.info`Dictionary Name: ${dictionaryName}`;
  Logger.info`Description: ${description}`;
  Logger.info`Version: ${version}`;

  const dictionary = {
    name: dictionaryName,
    description: description,
    version: version,
    meta: {},
    schemas: [],
  };

  Logger.debug`${dictionaryName} dictionary generated`;

  Logger.debugObject("Dictionary Details", dictionary);
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
export function generateSchema(
  inputFilePath: string,
  csvHeaders: string[],
  sampleData: Record<string, string>
): LecternSchema {
  // Generate schema name from file name
  const schemaName = path
    .basename(inputFilePath, path.extname(inputFilePath))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_");

  Logger.info`Generating schema: ${schemaName} from file: ${inputFilePath}`;
  Logger.debugObject("CSV Headers", csvHeaders);

  // Generate field definitions
  const fields: LecternField[] = csvHeaders.map((header) => {
    const sampleValue = sampleData[header] || "";
    const valueType = inferValueType(header, sampleValue);

    // Create field definition with metadata
    const field: LecternField = {
      name: header,
      description: `Field containing ${header} data`,
      valueType: valueType,
      meta: {
        displayName: header,
      },
    };

    Logger.debug`Created field definition for: ${header}`;
    Logger.debugObject(`Field Details for ${header}`, field);
    return field;
  });

  // Create schema with metadata
  const schema: LecternSchema = {
    name: schemaName,
    description: `Schema generated from ${path.basename(inputFilePath)}`,
    fields: fields,
    meta: {
      createdAt: new Date().toISOString(),
      sourceFile: path.basename(inputFilePath),
    },
  };

  Logger.info`${schemaName} schema added to dictionary`;
  Logger.debugObject("Schema Details", schema);
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
