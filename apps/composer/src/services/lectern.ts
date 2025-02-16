import chalk from 'chalk';
import type {
  LecternDictionary,
  LecternSchema,
  LecternField,
  ValueType,
  FieldRestrictions,
  ConditionalRestriction,
  ComparedFieldsRule,
  RangeRule,
  MetaData,
  MatchCase,
  CompareRelation
} from '../types/index';

/**
 * Infer the value type based on header name and sample value
 */

export function inferValueType(headerName: string, sampleValue: string): ValueType {
  process.stdout.write(chalk.cyan(`\nInferring type for field: ${headerName}\n`));

  // Handle empty sample values
  if (!sampleValue || sampleValue.trim() === '') {
    process.stdout.write(
      chalk.yellow(`⚠ Empty sample value detected, defaulting to string type\n`)
    );
    return 'string';
  }

  // Check for boolean fields
  const lowerValue = sampleValue.toLowerCase();
  if (
    lowerValue === 'true' ||
    lowerValue === 'false' ||
    lowerValue === 'yes' ||
    lowerValue === 'no' ||
    lowerValue === '0' ||
    lowerValue === '1'
  ) {
    process.stdout.write(chalk.green(`✓ Detected boolean type\n`));
    return 'boolean';
  }

  // Check for numeric fields
  if (!isNaN(Number(sampleValue))) {
    if (Number.isInteger(Number(sampleValue))) {
      process.stdout.write(chalk.green(`✓ Detected integer type\n`));
      return 'integer';
    }
    process.stdout.write(chalk.green(`✓ Detected number type\n`));
    return 'number';
  }

  // Default to string
  process.stdout.write(chalk.green(`✓ Detected string type\n`));
  return 'string';
}

/**
 * Generates base Lectern dictionary schema structure with user inputted dictionary name
 */
export function generateDictionary(
  dictionaryName: string,
  description: string,
  version: string
): LecternDictionary {
  process.stdout.write(chalk.cyan('\nGenerating Lectern dictionary...\n'));

  return {
    name: dictionaryName,
    description: description,
    version: version,
    schemas: [],
    meta: {}
  };
}

/**
 * Generates a Schema definition from a CSV reference file
 */

export function generateSchema(
  schemaName: string,
  csvHeaders: string[],
  sampleData: Record<string, string>
): LecternSchema {
  process.stdout.write(chalk.cyan(`\nGenerating schema from CSV: ${schemaName}\n`));

  // Generate fields from CSV headers
  const fields: LecternField[] = csvHeaders.map(header => {
    // Get sample value for this header
    const sampleValue = sampleData[header] || '';

    // Infer value type from sample data
    const valueType = inferValueType(header, sampleValue);

    // Create basic field definition
    const field: LecternField = {
      name: header,
      description: `Field containing ${header} data`,
      valueType: valueType,
      meta: {
        displayName: header
      }
    };

    process.stdout.write(chalk.green(`✓ Created field definition for: ${header}\n`));
    return field;
  });

  // Create and return schema
  const schema: LecternSchema = {
    name: schemaName,
    description: `Schema generated from CSV headers`,
    fields: fields,
    meta: {
      createdAt: new Date().toISOString()
    }
  };

  process.stdout.write(chalk.green(`✓ Schema generation complete: ${schemaName}\n`));
  return schema;
}
