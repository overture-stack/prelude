import chalk from "chalk";
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
  process.stdout.write(
    chalk.cyan(`\nInferring type for field: ${propertyName}\n`)
  );

  // Handle numeric values
  if (!isNaN(Number(value))) {
    if (Number.isInteger(Number(value))) {
      return "integer";
    }
    return "number";
  }

  // Handle boolean values
  if (typeof value === "boolean" || value === "true" || value === "false") {
    return "boolean";
  }

  // Default to string
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
  process.stdout.write(chalk.cyan("\nGenerating field definitions...\n"));

  const fields: Record<string, SongField> = {};
  const fieldNames: string[] = [];

  for (const propertyName of Object.keys(data)) {
    const value = data[propertyName];
    fields[propertyName] = generateSongField(propertyName, value);
    fieldNames.push(propertyName);
    process.stdout.write(
      chalk.green(`✓ Generated field definition for: ${propertyName}\n`)
    );
  }

  return { fields, fieldNames };
}

// ---- Schema Generation ----

/**
 * Generates a complete SONG schema from sample data
 * Focuses on workflow and experiment sections
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
 *     required: ["workflow", "experiment"],
 *     properties: { ... }
 *   }
 * }
 */
export function generateSongSchema(
  sampleData: Record<string, any>,
  schemaName: string,
  options?: SongOptions
): SongSchema {
  process.stdout.write(chalk.cyan("\nGenerating SONG schema...\n"));

  // Extract core sections
  const coreFields = {
    workflow: sampleData.workflow,
    experiment: sampleData.experiment,
  };

  const { fields, fieldNames } = generateSongFields(coreFields);

  return {
    name: schemaName,
    ...(options?.fileTypes?.length && {
      options: { fileTypes: options.fileTypes },
    }),
    schema: {
      type: "object",
      required: fieldNames,
      properties: fields,
    },
  };
}

// ---- Schema Validation ----

/**
 * Validates a generated SONG schema
 * Checks:
 * - Schema name is valid
 * - Core sections exist
 * - Required fields are defined
 * - Properties are present
 *
 * @example
 * validateSongSchema({
 *   name: "my_schema",
 *   schema: {
 *     type: "object",
 *     required: ["workflow"],
 *     properties: { workflow: { type: "object" } }
 *   }
 * }) → true/false
 */
export function validateSongSchema(schema: SongSchema): boolean {
  try {
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

    // Validate core sections
    const properties = schema.schema.properties;
    if (!properties.workflow || !properties.experiment) {
      throw new Error("Schema must have workflow and experiment sections");
    }

    process.stdout.write(chalk.green("✓ Schema validation passed\n"));
    return true;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    process.stdout.write(
      chalk.red(`Schema validation failed: ${errorMessage}\n`)
    );
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
