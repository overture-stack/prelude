#!/usr/bin/env node

import { setupCLI } from './utils/cli';
import { createClient } from './utils/elasticsearch';
import { processCSVFile } from './services/processor';
import * as validations from './services/validations';
import { validateAndGetMapping } from './services/validations';
import { generateArrangerConfigs } from './services/arranger';
import { parseCSVLine } from './utils/csv';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

type Mode = 'upload' | 'mapping' | 'arranger' | 'all';

// Separate functions for each mode
async function handleUploadMode(filePath: string, config: any) {
  const batchSizeValid = validations.validateBatchSize(config.batchSize);
  if (!batchSizeValid) process.exit(1);

  const client = createClient(config);

  const connectionValid = await validations.validateElasticsearchConnection(client, config);
  if (!connectionValid) process.exit(1);

  const indexValid = await validations.validateIndex(client, config.elasticsearch.index);
  if (!indexValid) process.exit(1);

  await processCSVFile(filePath, config, client);
}

function handleMappingMode(mapping: any, outputPath: string) {
  fs.writeFileSync(outputPath, JSON.stringify(mapping, null, 2));
  console.log(chalk.green(`\n✓ Mapping saved to ${outputPath}`));
}

function handleArrangerMode(mapping: any, arrangerConfigDir: string, indexName: string) {
  if (!arrangerConfigDir) {
    console.error(chalk.red('Error: Arranger config directory not specified'));
    process.exit(1);
  }

  if (!fs.existsSync(arrangerConfigDir)) {
    fs.mkdirSync(arrangerConfigDir, { recursive: true });
  }

  console.log(chalk.cyan('\nGenerating Arranger configurations...'));

  const arrangerConfigs = generateArrangerConfigs(mapping, indexName);

  const configFiles = [
    { name: 'base.json', content: arrangerConfigs.base },
    { name: 'extended.json', content: arrangerConfigs.extended },
    { name: 'table.json', content: arrangerConfigs.table },
    { name: 'facets.json', content: arrangerConfigs.facets }
  ];

  configFiles.forEach(({ name, content }) => {
    const filePath = path.join(arrangerConfigDir, name);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    console.log(chalk.green(`✓ Generated ${name}`));
  });

  console.log(chalk.green(`\n✓ All Arranger configurations saved to ${arrangerConfigDir}`));
}

async function validateCSVHeaders(filePath: string, delimiter: string): Promise<boolean> {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const [headerLine] = fileContent.split('\n');

    if (!headerLine) {
      console.error(chalk.red('Error: CSV file is empty or has no headers'));
      return false;
    }

    const headers = parseCSVLine(headerLine, delimiter, true)[0];
    if (!headers) {
      console.error(chalk.red('Error: Failed to parse CSV headers'));
      return false;
    }

    // Validate CSV structure using our validation function
    const isValid = await validations.validateCSVStructure(headers);
    if (!isValid) {
      console.error(chalk.red('Error: CSV headers failed validation'));
      return false;
    }

    return true;
  } catch (error) {
    console.error(chalk.red('Error validating CSV headers:'), error);
    return false;
  }
}

async function main() {
  try {
    console.log(chalk.blue('\n============================================='));
    console.log(chalk.bold.blue('      CSV Processor Starting... 🚀'));
    console.log(chalk.blue('=============================================\n'));

    const { config, filePath, outputPath, mode, arrangerConfigDir } = setupCLI();

    if (!filePath) {
      console.error(chalk.red('Error: No input file specified'));
      process.exit(1);
    }

    // Common validations for all modes
    const fileValid = await validations.validateFile(filePath);
    if (!fileValid) process.exit(1);

    const delimiterValid = validations.validateDelimiter(config.delimiter);
    if (!delimiterValid) process.exit(1);

    // Validate CSV headers before proceeding
    const headersValid = await validateCSVHeaders(filePath, config.delimiter);
    if (!headersValid) process.exit(1);

    // Handle different modes
    switch (mode as Mode) {
      case 'upload':
        await handleUploadMode(filePath, config);
        break;

      case 'mapping': {
        const mapping = await validateAndGetMapping(filePath, config.delimiter);
        handleMappingMode(mapping, outputPath);
        break;
      }

      case 'arranger': {
        const mapping = await validateAndGetMapping(filePath, config.delimiter);
        handleArrangerMode(mapping, arrangerConfigDir!, config.elasticsearch.index);
        break;
      }

      case 'all': {
        const mapping = await validateAndGetMapping(filePath, config.delimiter);
        handleMappingMode(mapping, outputPath);
        handleArrangerMode(mapping, arrangerConfigDir!, config.elasticsearch.index);
        break;
      }

      default:
        console.error(chalk.red(`Error: Unknown mode '${mode}'`));
        process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('\nError during processing:'));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
      if (error.stack) {
        console.error(chalk.gray(error.stack));
      }
    } else {
      console.error(chalk.red(String(error)));
    }
    process.exit(1);
  }
}

// Start processing
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
