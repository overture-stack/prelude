import { Logger } from "../utils/logger";
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
  Logger.debug(`Inferring type for field: ${headerName}`);

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
  Logger.debug("Generating Lectern dictionary");
  Logger.debug(`Dictionary Name: ${dictionaryName}`);
  Logger.debug(`Description: ${description}`);
  Logger.debug(`Version: ${version}`);

  const dictionary = {
    name: dictionaryName,
    description: description,
    version: version,
    schemas: [],
    meta: {},
  };

  Logger.success("Dictionary generated successfully");
  Logger.debugObject("Dictionary Details", dictionary);
  return dictionary;
}

// ---- Schema Generation ----

/**
 * Generates a Lectern schema from CSV headers and sample data
 * Creates field definitions with inferred types and metadata
 *
 * Process:
 * 1. Maps each CSV header to a field definition
 * 2. Infers value types from sample data
 * 3. Adds metadata and descriptions
 * 4. Assembles complete schema
 *
 * @example
 * generateSchema(
 *   "patient_data",
 *   ["name", "age", "is_active"],
 *   { name: "John", age: "30", is_active: "true" }
 * ) → {
 *   name: "patient_data",
 *   description: "Schema generated from CSV headers",
 *   fields: [
 *     { name: "name", valueType: "string", ... },
 *     { name: "age", valueType: "integer", ... },
 *     { name: "is_active", valueType: "boolean", ... }
 *   ],
 *   meta: { createdAt: "..." }
 * }
 */
export function generateSchema(
  schemaName: string,
  csvHeaders: string[],
  sampleData: Record<string, string>
): LecternSchema {
  Logger.debug(`Generating schema: ${schemaName}`);
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

    Logger.debug(`Created field definition for: ${header}`);
    Logger.debugObject(`Field Details for ${header}`, field);
    return field;
  });

  // Create schema with metadata
  const schema: LecternSchema = {
    name: schemaName,
    description: `Schema generated from CSV headers`,
    fields: fields,
    meta: {
      createdAt: new Date().toISOString(),
    },
  };

  Logger.success(`Schema generation complete: ${schemaName}`);
  Logger.debugObject("Schema Details", schema);
  return schema;
}

/* Usage Examples:
// Create a dictionary
const dictionary = generateDictionary("Patient Data", "Medical records schema", "1.0.0");

// Generate schema from CSV data
const headers = ["name", "age", "is_active"];
const sampleData = {
  name: "John Doe",
  age: "30",
  is_active: "true"
};
const schema = generateSchema("patient_records", headers, sampleData);
dictionary.schemas.push(schema);
*/
