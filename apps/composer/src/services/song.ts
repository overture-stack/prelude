import chalk from 'chalk';
import type { SongSchema, SongField, SongOptions } from '../types/song';

/**
 * Infer the value type based on property value
 */
export function inferSongType(propertyName: string, value: any): string | string[] {
  process.stdout.write(chalk.cyan(`\nInferring type for field: ${propertyName}\n`));

  // Handle numeric fields
  if (!isNaN(Number(value))) {
    if (Number.isInteger(Number(value))) {
      return 'integer';
    }
    return 'number';
  }

  // Handle boolean values
  if (typeof value === 'boolean' || value === 'true' || value === 'false') {
    return 'boolean';
  }

  // Default to string
  return 'string';
}

/**
 * Generate a field definition based on value analysis
 */
export function generateSongField(propertyName: string, value: any): SongField {
  // Handle arrays
  if (Array.isArray(value)) {
    const itemType =
      value.length > 0 ? generateSongField('arrayItem', value[0]) : { type: 'string' };

    return {
      type: 'array',
      items: itemType
    };
  }

  // Handle objects
  if (typeof value === 'object' && value !== null) {
    const { fields, fieldNames } = generateSongFields(value);

    return {
      propertyNames: {
        enum: fieldNames
      },
      required: fieldNames, // Mark all nested object fields as required
      type: 'object',
      properties: fields
    };
  }

  // Handle primitive types
  return {
    type: inferSongType(propertyName, value)
  };
}

/**
 * Generate field definitions for an object's properties
 */
export function generateSongFields(data: Record<string, any>): {
  fields: Record<string, SongField>;
  fieldNames: string[];
} {
  process.stdout.write(chalk.cyan('\nGenerating field definitions...\n'));

  const fields: Record<string, SongField> = {};
  const fieldNames: string[] = [];

  // Process the properties in their original order
  for (const propertyName of Object.keys(data)) {
    const value = data[propertyName];
    fields[propertyName] = generateSongField(propertyName, value);
    fieldNames.push(propertyName);
    process.stdout.write(chalk.green(`✓ Generated field definition for: ${propertyName}\n`));
  }

  return { fields, fieldNames };
}

/**
 * Generate SONG schema from sample analysis data
 */
export function generateSongSchema(
  sampleData: Record<string, any>,
  schemaName: string,
  options?: SongOptions
): SongSchema {
  process.stdout.write(chalk.cyan('\nGenerating SONG schema...\n'));

  // Only include core workflow and experiment sections
  const coreFields = {
    workflow: sampleData.workflow,
    experiment: sampleData.experiment
  };

  const { fields, fieldNames } = generateSongFields(coreFields);

  // Build schema with properties in desired order
  return {
    name: schemaName,
    ...(options?.fileTypes?.length && { options: { fileTypes: options.fileTypes } }),
    schema: {
      type: 'object',
      required: fieldNames, // Mark all top-level fields as required
      properties: fields
    }
  };
}

/**
 * Validate generated SONG schema
 */
export function validateSongSchema(schema: SongSchema): boolean {
  try {
    if (!schema.name) {
      throw new Error('Schema must have a name');
    }

    // Check that schemaName doesn't contain spaces
    if (schema.name.includes(' ')) {
      throw new Error('Schema name cannot contain spaces');
    }

    if (!schema.schema || schema.schema.type !== 'object') {
      throw new Error('Schema must be an object type');
    }

    if (!Array.isArray(schema.schema.required)) {
      throw new Error('Schema must have a required array');
    }

    if (!schema.schema.properties || Object.keys(schema.schema.properties).length === 0) {
      throw new Error('Schema must have at least one property');
    }

    // Validate core sections exist
    const properties = schema.schema.properties;
    if (!properties.workflow || !properties.experiment) {
      throw new Error('Schema must have workflow and experiment sections');
    }

    process.stdout.write(chalk.green('✓ Schema validation passed\n'));
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    process.stdout.write(chalk.red(`Schema validation failed: ${errorMessage}\n`));
    return false;
  }
}
