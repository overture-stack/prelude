// src/services/generateSongSchema.ts - Cleaned up exports
import { Logger } from "../utils/logger";
import type { SongSchema, SongField, SongOptions } from "../types";

function inferSongType(propertyName: string, value: any): string | string[] {
  Logger.debug(`Inferring type for field: ${propertyName}`);

  if (!isNaN(Number(value))) {
    if (Number.isInteger(Number(value))) {
      Logger.debug("Detected integer type");
      return "integer";
    }
    Logger.debug("Detected number type");
    return "number";
  }

  if (typeof value === "boolean" || value === "true" || value === "false") {
    Logger.debug("Detected boolean type");
    return "boolean";
  }

  Logger.debug("Defaulting to string type");
  return "string";
}

function generateSongField(propertyName: string, value: any): SongField {
  if (Array.isArray(value)) {
    Logger.debug(`Generating field for array: ${propertyName}`);
    const itemType =
      value.length > 0
        ? generateSongField("arrayItem", value[0])
        : { type: "string" };

    return {
      type: "array",
      items: itemType,
    };
  }

  if (typeof value === "object" && value !== null) {
    Logger.debug(`Generating field for object: ${propertyName}`);
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

  Logger.debug(`Generating field for primitive: ${propertyName}`);
  return {
    type: inferSongType(propertyName, value),
  };
}

function generateSongFields(data: Record<string, any>): {
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
      Logger.debug(`Generated field definition for: ${propertyName}`);
    } catch (error) {
      Logger.warn(
        `Error generating field definition for ${propertyName}: ${error}`
      );
      fields[propertyName] = { type: "object" };
      fieldNames.push(propertyName);
    }
  }

  return { fields, fieldNames };
}

// Main export functions
export function SongSchema(
  sampleData: Record<string, any>,
  schemaName: string,
  options?: SongOptions
): SongSchema {
  Logger.debug("Generating SONG schema");
  Logger.debug(`Schema name: ${schemaName}`);

  const schemaFields: Record<string, any> = {};
  const requiredFields: string[] = ["experiment"];

  if (sampleData.experiment) {
    try {
      schemaFields.experiment = generateSongField(
        "experiment",
        sampleData.experiment
      );
      Logger.debug("Added experiment field to schema");
    } catch (error) {
      Logger.warn(`Error generating experiment field: ${error}`);
      schemaFields.experiment = { type: "object" };
    }
  } else {
    Logger.warn(
      "No experiment data provided in sample, adding empty placeholder"
    );
    schemaFields.experiment = { type: "object" };
  }

  if (sampleData.workflow) {
    try {
      schemaFields.workflow = generateSongField(
        "workflow",
        sampleData.workflow
      );
      Logger.debug("Added workflow field to schema");
      requiredFields.push("workflow");
    } catch (error) {
      Logger.warn(`Error generating workflow field: ${error}`);
      schemaFields.workflow = { type: "object" };
    }
  }

  const schemaOptions: SongOptions = {
    fileTypes: options?.fileTypes || [],
    externalValidations: options?.externalValidations || [],
  };

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

export function validateSongSchema(schema: SongSchema): boolean {
  try {
    Logger.debug("Validating SONG schema");

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
    if (
      !schema.schema.properties ||
      Object.keys(schema.schema.properties).length === 0
    ) {
      throw new Error("Schema must have at least one property");
    }

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

    Logger.debug(`Schema validation failed: ${errorMessage}`);
    return false;
  }
}
