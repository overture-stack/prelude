#!/usr/bin/env node

import { setupCLI } from "./utils/cli";
import { createClient } from "./utils/elasticsearch";
import { processCSVFile } from "./services/processor";
import * as validations from "./services/validations";
import { parseCSVLine } from "./utils/csv";
import { Config } from "./types";
import chalk from "chalk";
import * as fs from "fs";

/**
 * Helper function to validate CSV headers.
 * Reads the first line of the file and uses the parseCSVLine utility.
 */
async function validateCSVHeaders(
  filePath: string,
  delimiter: string
): Promise<boolean> {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const [headerLine] = fileContent.split("\n");

    if (!headerLine) {
      console.error(chalk.red("Error: CSV file is empty or has no headers"));
      return false;
    }

    const headers = parseCSVLine(headerLine, delimiter, true)[0];
    if (!headers) {
      console.error(chalk.red("Error: Failed to parse CSV headers"));
      return false;
    }

    // Validate CSV structure using our validation function
    const isValid = await validations.validateCSVStructure(headers);
    if (!isValid) {
      console.error(chalk.red("Error: CSV headers failed validation"));
      return false;
    }

    return true;
  } catch (error) {
    console.error(chalk.red("Error validating CSV headers:"), error);
    return false;
  }
}

/**
 * Handles the upload mode.
 * Validates batch size, Elasticsearch connection, and index existence,
 * then processes the CSV file.
 */
async function handleUploadMode(filePath: string, config: Config) {
  const batchSizeValid = validations.validateBatchSize(config.batchSize);
  if (!batchSizeValid) process.exit(1);

  const client = createClient(config);

  const connectionValid = await validations.validateElasticsearchConnection(
    client,
    config
  );
  if (!connectionValid) process.exit(1);

  const indexValid = await validations.validateIndex(
    client,
    config.elasticsearch.index
  );
  if (!indexValid) process.exit(1);

  await processCSVFile(filePath, config, client);
}

/**
 * Main function – entry point for the CSV-to-Elasticsearch ETL process.
 * It only supports the "upload" mode.
 */
async function main() {
  try {
    console.log(chalk.blue("\n============================================="));
    console.log(chalk.bold.blue("      Conductor Starting... 🚀"));
    console.log(chalk.blue("=============================================\n"));

    const { config, filePaths, mode } = setupCLI();

    if (!filePaths || filePaths.length === 0) {
      console.error(chalk.red("Error: No input files specified"));
      process.exit(1);
    }

    const delimiterValid = validations.validateDelimiter(config.delimiter);
    if (!delimiterValid) process.exit(1);

    if (mode === "upload") {
      for (const filePath of filePaths) {
        const fileValid = await validations.validateFile(filePath);
        if (!fileValid) continue;

        const headersValid = await validateCSVHeaders(
          filePath,
          config.delimiter
        );
        if (!headersValid) continue;

        await handleUploadMode(filePath, config);
      }
    } else {
      console.error(
        chalk.red(
          `Error: Unsupported mode '${mode}' for this upload-only process`
        )
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red("\nError during processing:"));
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
main().catch((error) => {
  console.error(chalk.red("Fatal error:"), error);
  process.exit(1);
});
