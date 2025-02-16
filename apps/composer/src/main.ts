#!/usr/bin/env node

import { setupCLI } from './utils/cli';
import { createClient } from './utils/elasticsearch';
import { processCSVFile } from './services/processor';
import * as validations from './services/validations';
import { validateAndGetMapping } from './services/validations';
import { generateArrangerConfigs } from './services/arranger';
import { parseCSVLine } from './utils/csv';
import { generateDictionary, generateSchema } from './services/lectern';
import { generateSongSchema, validateSongSchema } from './services/song';
import { Config } from './types/processor';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

type Mode = 'dictionary' | 'song' | 'upload' | 'mapping' | 'arranger' | 'all';

// Helper function to validate CSV headers
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

// Upload mode handler
async function handleUploadMode(filePath: string, config: Config) {
  const batchSizeValid = validations.validateBatchSize(config.batchSize);
  if (!batchSizeValid) process.exit(1);

  const client = createClient(config);

  const connectionValid = await validations.validateElasticsearchConnection(client, config);
  if (!connectionValid) process.exit(1);

  const indexValid = await validations.validateIndex(client, config.elasticsearch.index);
  if (!indexValid) process.exit(1);

  await processCSVFile(filePath, config, client);
}

// Mapping mode handler
function handleMappingMode(mapping: any, outputPath: string) {
  fs.writeFileSync(outputPath, JSON.stringify(mapping, null, 2));
  console.log(chalk.green(`\n✓ Mapping saved to ${outputPath}`));
}

// Arranger mode handler
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

// Dictionary mode handler
async function handleDictionaryMode(
  filePaths: string[],
  dictionaryConfig: { name: string; description: string; version: string },
  delimiter: string,
  outputPath: string
) {
  console.log(chalk.cyan('\nGenerating Lectern dictionary...'));

  const dictionary = generateDictionary(
    dictionaryConfig.name,
    dictionaryConfig.description,
    dictionaryConfig.version
  );

  for (const filePath of filePaths) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const [headerLine, sampleLine] = fileContent.split('\n');

      if (!headerLine) {
        console.error(chalk.red(`Error: CSV file ${filePath} is empty or has no headers`));
        continue;
      }

      const headers = parseCSVLine(headerLine, delimiter, true)[0];
      if (!headers) {
        console.error(chalk.red(`Error: Failed to parse CSV headers in ${filePath}`));
        continue;
      }

      // Get schema name from file name
      const schemaName = path
        .basename(filePath, path.extname(filePath))
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');

      // Get sample data
      const sampleData: Record<string, string> = {};
      if (sampleLine) {
        const sampleValues = parseCSVLine(sampleLine, delimiter, false)[0];
        if (sampleValues) {
          headers.forEach((header: string, index: number) => {
            sampleData[header] = sampleValues[index] || '';
          });
        }
      }

      const schema = generateSchema(schemaName, headers, sampleData);
      dictionary.schemas.push(schema);
      console.log(chalk.green(`✓ Generated schema for ${schemaName}`));
    } catch (error) {
      console.error(chalk.red(`Error processing ${filePath}:`), error);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(dictionary, null, 2));
  console.log(chalk.green(`\n✓ Dictionary saved to ${outputPath}`));
}

// Song mode handler
async function handleSongMode(
  filePath: string,
  outputPath: string,
  songConfig?: { name: string; fileTypes?: string[] }
) {
  console.log(chalk.cyan('\nGenerating SONG schema...'));

  try {
    // Validate file exists
    const fileValid = await validations.validateFile(filePath);
    if (!fileValid) {
      console.error(chalk.red(`Error: Invalid file ${filePath}`));
      return;
    }

    // Read and parse the JSON file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    let sampleData: Record<string, any>;

    try {
      sampleData = JSON.parse(fileContent);
    } catch (error) {
      console.error(chalk.red('Error: Invalid JSON file'));
      return;
    }

    // Validate the JSON structure
    if (!sampleData || !sampleData.experiment) {
      console.error(chalk.red('Error: JSON must contain an experiment object'));
      return;
    }

    // Generate SONG schema with provided configuration
    const schemaName = songConfig?.name || path.basename(filePath, path.extname(filePath));
    const songOptions = songConfig?.fileTypes ? { fileTypes: songConfig.fileTypes } : undefined;

    const songSchema = generateSongSchema(sampleData, schemaName, songOptions);

    // Validate the generated schema
    const isValid = validateSongSchema(songSchema);
    if (!isValid) {
      console.error(chalk.red('Error: Generated schema validation failed'));
      return;
    }

    // Write schema to output file
    fs.writeFileSync(outputPath, JSON.stringify(songSchema, null, 2));
    console.log(chalk.green(`✓ Song schema saved to ${outputPath}`));
    console.log(
      chalk.white(
        `Tip: enums and required fields are not inferred, make sure to update your schema accordingly`
      )
    );
  } catch (error) {
    console.error(chalk.red('Error generating SONG schema:'), error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log(chalk.blue('\n============================================='));
    console.log(chalk.bold.blue('      Composer Starting... 🚀'));
    console.log(chalk.blue('=============================================\n'));

    const { config, filePaths, outputPath, mode, arrangerConfigDir, dictionaryConfig, songConfig } =
      setupCLI();

    if (!filePaths || filePaths.length === 0) {
      console.error(chalk.red('Error: No input files specified'));
      process.exit(1);
    }

    const delimiterValid = validations.validateDelimiter(config.delimiter);
    if (!delimiterValid) process.exit(1);

    // Handle different modes
    switch (mode as Mode) {
      case 'dictionary': {
        if (!dictionaryConfig) {
          console.error(
            chalk.red('Error: Dictionary configuration is required for dictionary mode')
          );
          process.exit(1);
        }
        await handleDictionaryMode(filePaths, dictionaryConfig, config.delimiter, outputPath);
        break;
      }

      case 'song': {
        if (!outputPath) {
          console.error(chalk.red('Error: Output path is required for song mode'));
          process.exit(1);
        }
        await handleSongMode(filePaths[0], outputPath, songConfig);
        break;
      }

      case 'upload': {
        // Process each file for upload
        for (const filePath of filePaths) {
          const fileValid = await validations.validateFile(filePath);
          if (!fileValid) continue;

          const headersValid = await validateCSVHeaders(filePath, config.delimiter);
          if (!headersValid) continue;

          await handleUploadMode(filePath, config);
        }
        break;
      }

      case 'mapping': {
        // Use the first file for mapping
        const mapping = await validateAndGetMapping(filePaths[0], config.delimiter);
        handleMappingMode(mapping, outputPath);
        break;
      }

      case 'arranger': {
        const mapping = await validateAndGetMapping(filePaths[0], config.delimiter);
        handleArrangerMode(mapping, arrangerConfigDir!, config.elasticsearch.index);
        break;
      }

      case 'all': {
        const mapping = await validateAndGetMapping(filePaths[0], config.delimiter);
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
