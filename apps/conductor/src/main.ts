#!/usr/bin/env node

import { setupCLI } from "./utils/cli";
import { createClient } from "./utils/elasticsearch";
import { processCSVFile } from "./services/processor";
import {
  validateCSVStructure,
  validateBatchSize,
  validateElasticsearchConnection,
  validateIndex,
  validateFile,
  validateDelimiter,
} from "./validation";
import { parseCSVLine } from "./utils/csvParser";
import { Config } from "./types";
import chalk from "chalk";
import * as fs from "fs";
import { ComposerError, ErrorCodes, handleError } from "./utils/errors";

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
      throw new ComposerError(
        "CSV file is empty or has no headers",
        ErrorCodes.INVALID_FILE
      );
    }

    const parseResult = parseCSVLine(headerLine, delimiter, true);
    if (!parseResult || !parseResult[0]) {
      throw new ComposerError(
        "Failed to parse CSV headers",
        ErrorCodes.PARSING_ERROR
      );
    }

    const headers = parseResult[0];

    // Validate CSV structure using our validation function
    await validateCSVStructure(headers);
    return true;
  } catch (error) {
    if (error instanceof ComposerError) {
      // Just rethrow ComposerErrors which will be handled upstream
      throw error;
    }
    throw new ComposerError(
      "Error validating CSV headers",
      ErrorCodes.VALIDATION_FAILED,
      error
    );
  }
}

/**
 * Handles the upload mode.
 * Validates batch size, Elasticsearch connection, and index existence,
 * then processes the CSV file.
 *
 * @param filePath - Path to the CSV file to process
 * @param config - Application configuration
 */
async function handleUploadMode(
  filePath: string,
  config: Config
): Promise<void> {
  try {
    validateBatchSize(config.batchSize);

    const client = createClient(config);

    await validateElasticsearchConnection(client, config);
    await validateIndex(client, config.elasticsearch.index);
    await processCSVFile(filePath, config, client);
  } catch (error) {
    // Let the outer handler deal with the error
    throw error;
  }
}

/**
 * Main function – entry point for the CSV-to-Elasticsearch ETL process.
 * It only supports the "upload" mode.
 */
async function main(): Promise<void> {
  try {
    console.log(
      chalk.blue("\n========================================================")
    );
    console.log(
      chalk.bold.blue("      Conductor Data Processor Starting... 🚀")
    );
    console.log(
      chalk.blue("=========================================================\n")
    );

    const { config, filePaths, mode } = setupCLI();

    if (!filePaths || filePaths.length === 0) {
      throw new ComposerError(
        "No input files specified",
        ErrorCodes.INVALID_ARGS
      );
    }

    validateDelimiter(config.delimiter);

    if (mode === "upload") {
      for (const filePath of filePaths) {
        try {
          await validateFile(filePath);
          await validateCSVHeaders(filePath, config.delimiter);
          await handleUploadMode(filePath, config);
        } catch (error) {
          // Log the error but continue to the next file
          if (error instanceof ComposerError) {
            console.error(chalk.red(`\nSkipping file '${filePath}':`));
            console.error(chalk.red(`Error [${error.code}]: ${error.message}`));
            if (error.details) {
              console.error(chalk.yellow("Details:"), error.details);
            }
          } else if (error instanceof Error) {
            console.error(chalk.red(`\nSkipping file '${filePath}':`));
            console.error(chalk.red(error.message));
          } else {
            console.error(
              chalk.red(`\nSkipping file '${filePath}' due to an error`)
            );
          }
          console.log(); // Empty line for readability
          continue;
        }
      }
    } else {
      throw new ComposerError(
        `Unsupported mode '${mode}' for this upload-only process`,
        ErrorCodes.INVALID_ARGS
      );
    }
  } catch (error) {
    // Use the centralized error handler
    handleError(error);
  }
}

// Start processing
main().catch((error) => {
  console.error(chalk.red("Fatal error:"));
  if (error instanceof Error) {
    console.error(chalk.red(error.message));
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
  } else {
    console.error(chalk.red(String(error)));
  }
  process.exit(1);
});
