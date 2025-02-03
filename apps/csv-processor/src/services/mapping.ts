import chalk from 'chalk';
import { parseCSVLine } from '../utils/csv';
import type { ElasticsearchMapping, ElasticsearchField } from '../types/index';
import * as fs from 'fs';

/**
 * Infers the Elasticsearch field type based on header name and sample value
 */
export function inferFieldType(headerName: string, sampleValue: string): ElasticsearchField {
  process.stdout.write(chalk.cyan(`\nInferring type for field: ${headerName}\n`));

  // Handle empty sample values
  if (!sampleValue || sampleValue.trim() === '') {
    process.stdout.write(
      chalk.yellow(`⚠ Empty sample value detected, defaulting to keyword with null value\n`)
    );
    return { type: 'keyword', null_value: 'No Data' };
  }

  // Check for numeric fields
  if (!isNaN(Number(sampleValue))) {
    if (Number.isInteger(Number(sampleValue))) {
      process.stdout.write(chalk.green(`✓ Detected integer type\n`));
      return { type: 'integer' };
    }
    process.stdout.write(chalk.green(`✓ Detected float type\n`));
    return { type: 'float' };
  }

  // Check for date fields
  if (
    headerName.includes('date') ||
    headerName.includes('time') ||
    headerName.includes('timestamp')
  ) {
    process.stdout.write(chalk.green(`✓ Detected date type\n`));
    return { type: 'date' };
  }

  // Default to keyword
  process.stdout.write(chalk.green(`✓ Using default keyword type\n`));
  return { type: 'keyword' };
}

/**
 * Generates Elasticsearch mapping from CSV headers and sample data
 */
export function generateMapping(
  csvHeaders: string[],
  sampleData: Record<string, string>
): ElasticsearchMapping {
  process.stdout.write(chalk.cyan('\nGenerating Elasticsearch mapping...\n'));

  const properties: Record<string, ElasticsearchField> = {};

  csvHeaders.forEach(header => {
    properties[header] = inferFieldType(header, sampleData[header]);
  });

  const mapping: ElasticsearchMapping = {
    index_patterns: ['tabular-*'],
    aliases: {
      data_centric: {},
    },
    mappings: {
      properties: {
        ...properties,
        submission_metadata: {
          type: 'object',
          properties: {
            submitter_id: {
              type: 'keyword',
              null_value: 'No Data',
            },
            processing_started: {
              type: 'date',
            },
            processed_at: {
              type: 'date',
            },
            source_file: {
              type: 'keyword',
              null_value: 'No Data',
            },
            record_number: {
              type: 'integer',
            },
            hostname: {
              type: 'keyword',
              null_value: 'No Data',
            },
            username: {
              type: 'keyword',
              null_value: 'No Data',
            },
          },
        },
      },
    },
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
    },
  };

  process.stdout.write(chalk.green(`✓ Mapping generated successfully\n`));
  return mapping;
}

/**
 * Validates and extracts mapping information from CSV file
 * @param filePath - Path to the CSV file
 * @param delimiter - CSV delimiter character
 * @returns Promise resolving to Elasticsearch mapping object
 */
export async function validateAndGetMapping(
  filePath: string,
  delimiter: string
): Promise<ElasticsearchMapping> {
  // Read first two lines for mapping generation
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const [headerLine, sampleLine] = fileContent.split('\n');

  if (!headerLine || !sampleLine) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  const headers = parseCSVLine(headerLine, delimiter, true)[0];
  const sampleValues = parseCSVLine(sampleLine, delimiter, false)[0];

  if (!headers || !sampleValues) {
    throw new Error('Failed to parse CSV headers or sample data');
  }

  // Create sample data object
  const sampleData: Record<string, string> = {};
  headers.forEach((header: string, index: number) => {
    sampleData[header] = sampleValues[index]?.toString() || '';
  });

  return generateMapping(headers, sampleData);
}
