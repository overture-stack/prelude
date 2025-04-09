import { Logger } from "../utils/logger";
import type { SongSchema, SongField, SongOptions } from "../types";

// ---- Type Inference ----

/**
 * Infers SONG field type from property value
 *
 * Rules:
 * - Numbers → integer or number
 * - Booleans → boolean
 * - Default → string
 *
 * @example
 * inferSongType("age", 25) → "integer"
 * inferSongType("score", 85.5) → "number"
 * inferSongType("active", true) → "boolean"
 * inferSongType("name", "sample") → "string"
 */
export function inferSongType(
  propertyName: string,
  value: any
): string | string[] {
  Logger.debug`Inferring type for field: ${propertyName}`;

  // Handle numeric values
  if (!isNaN(Number(value))) {
    if (Number.isInteger(Number(value))) {
      Logger.debug("Detected integer type");
      return "integer";
    }
    Logger.debug("Detected number type");
    return "number";
  }

  // Handle boolean values
  if (typeof value === "boolean" || value === "true" || value === "false") {
    Logger.debug("Detected boolean type");
    return "boolean";
  }

  // Default to string
  Logger.debug("Defaulting to string type");
  return "string";
}

// ---- Field Generation ----

/**
 * Generates a SONG field definition based on value analysis
 * Handles arrays, objects, and primitive types
 *
 * @example
 * // Primitive
 * generateSongField("name", "John") → { type: "string" }
 *
 * // Array
 * generateSongField("tags", ["red", "blue"]) → {
 *   type: "array",
 *   items: { type: "string" }
 * }
 *
 * // Object
 * generateSongField("address", { city: "NY" }) → {
 *   type: "object",
 *   properties: { city: { type: "string" } },
 *   required: ["city"]
 * }
 */
export function generateSongField(propertyName: string, value: any): SongField {
  // Handle arrays
  if (Array.isArray(value)) {
    Logger.debug`Generating field for array: ${propertyName}`;
    const itemType =
      value.length > 0
        ? generateSongField("arrayItem", value[0])
        : { type: "string" };

    return {
      type: "array",
      items: itemType,
    };
  }

  // Handle objects
  if (typeof value === "object" && value !== null) {
    Logger.debug`Generating field for object: ${propertyName}`;
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

  // Handle primitive types
  Logger.debug`Generating field for primitive: ${propertyName}`;
  return {
    type: inferSongType(propertyName, value),
  };
}

/**
 * Generates field definitions for all properties in an object
 * Preserves field order and tracks required fields
 */
export function generateSongFields(data: Record<string, any>): {
  fields: Record<string, SongField>;
  fieldNames: string[];
} {
  Logger.debug("Generating field definitions");

  const fields: Record<string, SongField> = {};
  const fieldNames: string[] = [];

  for (const propertyName of Object.keys(data)) {
    try {
      const value = data[propertyName];
      fields[propertyName] = generateSongField(propertyName, value);
      fieldNames.push(propertyName);
      Logger.debug`Generated field definition for: ${propertyName}`;
    } catch (error) {
      Logger.warn`Error generating field definition for ${propertyName}: ${error}`;
      // Provide a minimal field definition instead of failing
      fields[propertyName] = { type: "object" };
      fieldNames.push(propertyName);
    }
  }

  return { fields, fieldNames };
}

// ---- Schema Generation ----

/**
 * Generates a complete SONG schema from sample data
 * Focuses on required experiment section and optional workflow section
 *
 * @example
 * generateSongSchema(
 *   {
 *     workflow: { name: "analysis" },
 *     experiment: { id: "exp1" }
 *   },
 *   "my_schema",
 *   { fileTypes: ["bam", "vcf"] }
 * ) → {
 *   name: "my_schema",
 *   options: { fileTypes: ["bam", "vcf"] },
 *   schema: {
 *     type: "object",
 *     required: ["experiment"],
 *     properties: { ... }
 *   }
 * }
 */
export function generateSongSchema(
  sampleData: Record<string, any>,
  schemaName: string,
  options?: SongOptions
): SongSchema {
  Logger.debug("Generating SONG schema");
  Logger.debug`Schema name: ${schemaName}`;

  // Extract fields from sample data, focusing on experiment (required) and workflow (optional)
  const schemaFields: Record<string, any> = {};
  const requiredFields: string[] = ["experiment"];

  // Add experiment section (required)
  if (sampleData.experiment) {
    try {
      schemaFields.experiment = generateSongField(
        "experiment",
        sampleData.experiment
      );
      Logger.debug("Added experiment field to schema");
    } catch (error) {
      Logger.warn`Error generating experiment field: ${error}`;
      // Provide a minimal placeholder since experiment is required
      schemaFields.experiment = { type: "object" };
    }
  } else {
    // If no experiment data provided, add an empty object placeholder
    Logger.warn(
      "No experiment data provided in sample, adding empty placeholder"
    );
    schemaFields.experiment = { type: "object" };
  }

  // Add workflow section (optional)
  if (sampleData.workflow) {
    try {
      schemaFields.workflow = generateSongField(
        "workflow",
        sampleData.workflow
      );
      Logger.debug("Added workflow field to schema");
      // Add workflow to required fields if present in the sample
      requiredFields.push("workflow");
    } catch (error) {
      Logger.warn`Error generating workflow field: ${error}`;
      // Add a basic field definition
      schemaFields.workflow = { type: "object" };
    }
  }

  // Define schema options
  const schemaOptions: SongOptions = {
    fileTypes: options?.fileTypes || [],
    externalValidations: options?.externalValidations || [],
  };

  // Construct the full schema
  const schema: SongSchema = {
    name: schemaName,
    options: schemaOptions,
    schema: {
      type: "object",
      required: requiredFields,
      properties: schemaFields,
    },
  };

  Logger.debug("Song schema generated successfully");
  Logger.debugObject("Generated Schema", schema);
  return schema;
}

// ---- Schema Validation ----

/**
 * Validates a generated SONG schema
 * Checks:
 * - Schema name is valid
 * - Schema has an experiment section
 * - Required fields are defined
 * - Properties are present
 *
 * @example
 * validateSongSchema({
 *   name: "my_schema",
 *   schema: {
 *     type: "object",
 *     required: ["experiment"],
 *     properties: { experiment: { type: "object" } }
 *   }
 * }) → true/false
 */
export function validateSongSchema(schema: SongSchema): boolean {
  try {
    Logger.debug("Validating SONG schema");

    // Validate schema name
    if (!schema.name) {
      throw new Error("Schema must have a name");
    }
    if (schema.name.includes(" ")) {
      throw new Error("Schema name cannot contain spaces");
    }

    // Validate schema structure
    if (!schema.schema || schema.schema.type !== "object") {
      throw new Error("Schema must be an object type");
    }
    if (!Array.isArray(schema.schema.required)) {
      throw new Error("Schema must have a required array");
    }
    if (
      !schema.schema.properties ||
      Object.keys(schema.schema.properties).length === 0
    ) {
      throw new Error("Schema must have at least one property");
    }

    // Validate experiment section is present and required
    const properties = schema.schema.properties;
    if (!properties.experiment) {
      throw new Error("Schema must have an experiment section");
    }
    if (!schema.schema.required.includes("experiment")) {
      throw new Error("The experiment field must be required");
    }

    Logger.debug("Schema validation passed");
    return true;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    Logger.debug`Schema validation failed: ${errorMessage}`;
    return false;
  }
}

/* Usage Examples:
// Generate schema from sample data
const sampleData = {
  workflow: {
    name: "DNA-Seq Analysis",
    version: "1.0"
  },
  experiment: {
    id: "EXP-001",
    type: "sequencing",
    platform: "illumina"
  }
};

const schema = generateSongSchema(
  sampleData,
  "dna_seq_schema",
  { fileTypes: ["fastq", "bam"] }
);

// Validate the generated schema
const isValid = validateSongSchema(schema);
*/
