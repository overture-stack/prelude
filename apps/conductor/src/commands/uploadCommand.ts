import { validateBatchSize } from "../validations/elasticsearchValidator";
import { validateDelimiter } from "../validations/utils";
/**
 * Upload Command
 *
 * Command implementation for uploading CSV data to Elasticsearch.
 */

import { Command } from "./baseCommand";
import { CLIOutput } from "../cli";
import { Logger } from "../utils/logger";
import {
  ConductorError,
  ErrorCodes,
  createValidationError,
} from "../utils/errors";
import { createClient } from "../utils/elasticsearch";
import { processCSVFile } from "../services/processor";
import {
  validateCSVStructure,
  validateElasticsearchConnection,
  validateIndex,
  validateFiles,
} from "../validations";
import { parseCSVLine } from "../utils/csvParser";
import * as fs from "fs";
import chalk from "chalk";

export class UploadCommand implements Command {
  /**
   * Runs the upload process for all specified files
   * @param cliOutput The CLI configuration and inputs
   */
  async run(cliOutput: CLIOutput): Promise<void> {
    const { config, filePaths } = cliOutput;
    const startTime = process.hrtime();

    Logger.section("Starting upload process");
    Logger.info`Files to process: ${filePaths.length}`;

    // Validate common settings before processing files
    this.validateCommonSettings(config);

    // Process each file
    let successCount = 0;
    let failureCount = 0;

    for (const filePath of filePaths) {
      Logger.section(`Processing file: ${filePath}`);

      try {
        await this.processFile(filePath, config);
        Logger.success`Successfully processed ${filePath}`;
        successCount++;
      } catch (error) {
        failureCount++;
        // Log the error but continue to the next file
        if (error instanceof ConductorError) {
          Logger.error`Skipping file '${filePath}': [${error.code}] ${error.message}`;
          if (error.details) {
            Logger.debug`Error details: ${JSON.stringify(error.details)}`;
          }
        } else if (error instanceof Error) {
          Logger.error`Skipping file '${filePath}': ${error.message}`;
        } else {
          Logger.error`Skipping file '${filePath}' due to an error`;
        }
      }
    }

    // Log summary
    const hrEnd = process.hrtime(startTime);
    const timeMs = hrEnd[0] * 1000 + hrEnd[1] / 1000000;

    Logger.section("Upload process complete");
    Logger.info`Files processed: ${filePaths.length}`;
    Logger.success`Successful: ${successCount}`;

    if (failureCount > 0) {
      Logger.error`Failed: ${failureCount}`;
    }

    Logger.timing("Total processing time", timeMs);
  }

  /**
   * Validates common settings that apply to all files
   */
  private validateCommonSettings(config: any): void {
    validateDelimiter(config.delimiter);
    validateBatchSize(config.batchSize);
  }

  /**
   * Processes a single file
   */
  private async processFile(filePath: string, config: any): Promise<void> {
    // Validate file and CSV structure
    await validateFiles([filePath]);
    await this.validateCSVHeaders(filePath, config.delimiter);

    // Set up Elasticsearch client
    const client = createClient(config);

    // Validate Elasticsearch connection and index
    await validateElasticsearchConnection(client, config);
    await validateIndex(client, config.elasticsearch.index);

    // Process the file - your existing processor already has progress monitoring
    await processCSVFile(filePath, config, client);
  }

  /**
   * Validates CSV headers by reading the first line
   */
  private async validateCSVHeaders(
    filePath: string,
    delimiter: string
  ): Promise<boolean> {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const [headerLine] = fileContent.split("\n");

      if (!headerLine) {
        throw new ConductorError(
          "CSV file is empty or has no headers",
          ErrorCodes.INVALID_FILE
        );
      }

      const parseResult = parseCSVLine(headerLine, delimiter, true);
      if (!parseResult || !parseResult[0]) {
        throw new ConductorError(
          "Failed to parse CSV headers",
          ErrorCodes.PARSING_ERROR
        );
      }

      const headers = parseResult[0];

      // Validate CSV structure using our validation function
      await validateCSVStructure(headers);
      return true;
    } catch (error) {
      if (error instanceof ConductorError) {
        // Just rethrow ConductorErrors which will be handled upstream
        throw error;
      }
      throw new ConductorError(
        "Error validating CSV headers",
        ErrorCodes.VALIDATION_FAILED,
        error
      );
    }
  }
}
