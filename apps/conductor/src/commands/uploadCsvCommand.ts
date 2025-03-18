/**
 * Upload Command
 *
 * Command implementation for uploading CSV data to Elasticsearch.
 */

import { validateBatchSize } from "../validations/elasticsearchValidator";
import { validateDelimiter } from "../validations/utils";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
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
import * as path from "path";

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
   * Validates command line arguments and configuration
   * @param cliOutput The CLI configuration and inputs
   * @throws ConductorError if validation fails
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { config, filePaths } = cliOutput;

    // Validate files first
    const fileValidationResult = await validateFiles(filePaths);
    if (!fileValidationResult.valid) {
      throw new ConductorError("Invalid input files", ErrorCodes.INVALID_FILE, {
        errors: fileValidationResult.errors,
      });
    }

    // Validate delimiter
    try {
      validateDelimiter(config.delimiter);
    } catch (error) {
      throw new ConductorError(
        "Invalid delimiter",
        ErrorCodes.VALIDATION_FAILED,
        error
      );
    }

    // Validate batch size
    try {
      validateBatchSize(config.batchSize);
    } catch (error) {
      throw new ConductorError(
        "Invalid batch size",
        ErrorCodes.VALIDATION_FAILED,
        error
      );
    }

    // Validate each file's CSV headers
    for (const filePath of filePaths) {
      await this.validateFileHeaders(filePath, config.delimiter);
    }
  }

  /**
   * Validates headers for a single file
   */
  private async validateFileHeaders(
    filePath: string,
    delimiter: string
  ): Promise<void> {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const [headerLine] = fileContent.split("\n");

      if (!headerLine) {
        throw new ConductorError(
          `CSV file is empty or has no headers: ${filePath}`,
          ErrorCodes.INVALID_FILE
        );
      }

      const parseResult = parseCSVLine(headerLine, delimiter, true);
      if (!parseResult || !parseResult[0]) {
        throw new ConductorError(
          `Failed to parse CSV headers: ${filePath}`,
          ErrorCodes.PARSING_ERROR
        );
      }

      const headers = parseResult[0];

      // Validate CSV structure using our validation function
      await validateCSVStructure(headers);
    } catch (error) {
      if (error instanceof ConductorError) {
        // Rethrow ConductorErrors
        throw error;
      }
      throw new ConductorError(
        `Error validating CSV headers: ${filePath}`,
        ErrorCodes.VALIDATION_FAILED,
        error
      );
    }
  }

  /**
   * Processes a single file
   */
  private async processFile(filePath: string, config: any): Promise<void> {
    // Set up Elasticsearch client
    const client = createClientFromConfig(config);

    // Validate Elasticsearch connection and index
    await validateConnection(client);
    await validateIndex(client, config.elasticsearch.index);

    // Process the file
    await processCSVFile(filePath, config, client);
  }
}
