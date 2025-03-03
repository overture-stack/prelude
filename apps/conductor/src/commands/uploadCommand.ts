/**
 * Upload Command
 *
 * Command implementation for uploading CSV data to Elasticsearch.
 */

import { validateBatchSize } from "../validations/elasticsearchValidator";
import { validateDelimiter } from "../validations/utils";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../cli";
import { Logger } from "../utils/logger";
import { ConductorError, ErrorCodes } from "../utils/errors";
import {
  createClientFromConfig,
  validateConnection,
} from "../services/elasticsearch";
import { processCSVFile } from "../services/csvProcessor";
import {
  validateCSVStructure,
  validateElasticsearchConnection,
  validateIndex,
  validateFiles,
} from "../validations";
import { parseCSVLine } from "../services/csvProcessor/csvParser";
import * as fs from "fs";

export class UploadCommand extends Command {
  /**
   * Creates a new UploadCommand instance.
   */
  constructor() {
    super("upload");
    this.defaultOutputFileName = "upload-results.json";
  }

  /**
   * Executes the upload process for all specified files
   * @param cliOutput The CLI configuration and inputs
   * @returns Promise<CommandResult> with success/failure information
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { config, filePaths } = cliOutput;

    Logger.info(`Input files specified: ${filePaths.length}`, filePaths);

    // Validate common settings before processing files
    this.validateCommonSettings(config);

    // Process each file
    let successCount = 0;
    let failureCount = 0;
    const failureDetails: Record<string, any> = {};

    for (const filePath of filePaths) {
      Logger.debug(`Processing File: ${filePath}`);

      try {
        await this.processFile(filePath, config);
        Logger.debug(`Successfully processed ${filePath}`);
        successCount++;
      } catch (error) {
        failureCount++;
        // Log the error but continue to the next file
        if (error instanceof ConductorError) {
          Logger.debug(
            `Skipping file '${filePath}': [${error.code}] ${error.message}`
          );
          if (error.details) {
            Logger.debug(`Error details: ${JSON.stringify(error.details)}`);
          }
          failureDetails[filePath] = {
            code: error.code,
            message: error.message,
            details: error.details,
          };
        } else if (error instanceof Error) {
          Logger.debug(`Skipping file '${filePath}': ${error.message}`);
          failureDetails[filePath] = {
            message: error.message,
          };
        } else {
          Logger.debug(`Skipping file '${filePath}' due to an error`);
          failureDetails[filePath] = {
            message: "Unknown error",
          };
        }
      }
    }

    // Return the CommandResult
    if (failureCount === 0) {
      return {
        success: true,
        details: {
          filesProcessed: successCount,
        },
      };
    } else if (successCount === 0) {
      return {
        success: false,
        errorMessage: `Failed to process all ${failureCount} files`,
        errorCode: ErrorCodes.VALIDATION_FAILED,
        details: failureDetails,
      };
    } else {
      // Partial success
      return {
        success: true,
        details: {
          filesProcessed: successCount,
          filesFailed: failureCount,
          failureDetails,
        },
      };
    }
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
    const client = createClientFromConfig(config);

    // Validate Elasticsearch connection and index
    await validateConnection(client);
    await validateIndex(client, config.elasticsearch.index);

    // Process the file
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
