#!/usr/bin/env node

import { setupCLI } from './utils/cli';
import { createClient } from './utils/elasticsearch';
import { processCSVFile } from './services/processor';
import * as validations from './services/validations';
import { validateAndGetMapping } from './services/configurator';
import chalk from 'chalk';
import * as fs from 'fs';

async function main() {
  try {
    console.log(chalk.blue('\n============================================='));
    console.log(chalk.bold.blue('      CSV Processor Starting... 🚀'));
    console.log(chalk.blue('=============================================\n'));

    // Setup configuration from CLI arguments
    const { config, filePath, outputPath, mode } = setupCLI();

    if (!filePath) {
      console.error(chalk.red('Error: No input file specified'));
      process.exit(1);
    }

    // Common validations for both modes
    const fileValid = await validations.validateFile(filePath);
    if (!fileValid) process.exit(1);

    const delimiterValid = validations.validateDelimiter(config.delimiter);
    if (!delimiterValid) process.exit(1);

    // Handle mapping mode
    if (mode === 'mapping') {
      const mapping = await validateAndGetMapping(filePath, config.delimiter);
      if (outputPath) {
        fs.writeFileSync(outputPath, JSON.stringify(mapping, null, 2));
        console.log(chalk.green(`\n✓ Mapping saved to ${outputPath}`));
      } else {
        console.log(
          chalk.green('\nGenerated Elasticsearch Mapping:\n'),
          JSON.stringify(mapping, null, 2)
        );
      }
      return;
    }

    // Validations specific to upload mode
    const batchSizeValid = validations.validateBatchSize(config.batchSize);
    if (!batchSizeValid) process.exit(1);

    // Initialize and validate Elasticsearch
    const client = createClient(config);

    const connectionValid = await validations.validateElasticsearchConnection(client, config);
    if (!connectionValid) process.exit(1);

    const indexValid = await validations.validateIndex(client, config.elasticsearch.index);
    if (!indexValid) process.exit(1);

    // Process the CSV file
    await processCSVFile(filePath, config, client);
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
