/**
 * Upload Command
 *
 * Command implementation for uploading CSV data to Elasticsearch.
 * Simplified to remove unnecessary output file handling.
 */

import {
  validateBatchSize,
  validateIndex,
} from "../validations/elasticsearchValidator";
import { validateDelimiter } from "../validations/utils";
import {
  validateCSVStructure,
  validateHeadersMatchMappings,
} from "../validations/csvValidator";
import { validateFiles } from "../validations/fileValidator";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import {
  createClientFromConfig,
  validateConnection,
} from "../services/elasticsearch";
import { processCSVFile } from "../services/csvProcessor";
import { parseCSVLine } from "../services/csvProcessor/csvParser";
import * as fs from "fs";

export class UploadCommand extends Command {
  /**
   * Creates a new UploadCommand instance.
   */
  constructor() {
    super("upload");
  }

  /**
   * Executes the upload process for all specified files
   * @param cliOutput The CLI configuration and inputs
   * @returns Promise<CommandResult> with success/failure information
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { config, filePaths } = cliOutput;

    Logger.debug`Input files specified: ${filePaths.length}`;
    Logger.debug`Files: ${filePaths.join(", ")}`;

    // Process each file
    let successCount = 0;
    let failureCount = 0;
    const failureDetails: Record<string, any> = {};

    for (const filePath of filePaths) {
      Logger.generic("");
      Logger.info`Processing File: ${filePath}`;
      try {
        await this.processFile(filePath, config);
        Logger.debug`Successfully processed ${filePath}`;
        successCount++;
      } catch (error) {
        failureCount++;

        // Handle ConductorErrors - log them with suggestions here
        if (error instanceof Error && error.name === "ConductorError") {
          const conductorError = error as any;

          // Log the error and suggestions at the file processing level
          Logger.errorString(`${conductorError.message}`);

          // Show suggestions if available
          if (
            conductorError.suggestions &&
            conductorError.suggestions.length > 0
          ) {
            Logger.suggestion("Suggestions");
            conductorError.suggestions.forEach((suggestion: string) => {
              Logger.tipString(suggestion);
            });
          }

          Logger.debug`Skipping file '${filePath}': [${conductorError.code}] ${conductorError.message}`;

          failureDetails[filePath] = {
            code: conductorError.code,
            message: conductorError.message,
            details: conductorError.details,
          };
        } else if (error instanceof Error) {
          // Only log non-ConductorError errors
          Logger.errorString(`${error.message}`);
          Logger.debug`Skipping file '${filePath}': ${error.message}`;
          failureDetails[filePath] = {
            message: error.message,
          };
        } else {
          Logger.errorString("An unknown error occurred");
          Logger.debug`Skipping file '${filePath}' due to an error`;
          failureDetails[filePath] = {
            message: "Unknown error",
          };
        }
      }
    }

    // Return the CommandResult
    if (failureCount === 0) {
      Logger.debug`Successfully processed all ${successCount} files`;
      return {
        success: true,
        details: {
          filesProcessed: successCount,
        },
      };
    } else if (successCount === 0) {
      // Don't create a new error, just return the failure result
      // The original error with suggestions has already been logged
      return {
        success: false,
        errorCode: "PROCESSING_FAILED",
        details: failureDetails,
      };
    } else {
      // Partial success
      Logger.warnString(
        `Processed ${successCount} files successfully, ${failureCount} failed`
      );
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
   * Updated to remove index validation (moved to processFile)
   * @param cliOutput The CLI configuration and inputs
   * @throws ConductorError if validation fails
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { config, filePaths } = cliOutput;

    // Validate files first
    const fileValidationResult = await validateFiles(filePaths);
    if (!fileValidationResult.valid) {
      // Create a more detailed error message
      const errorDetails = fileValidationResult.errors.join("; ");
      throw ErrorFactory.invalidFile(
        `File validation failed ${errorDetails}`,
        undefined,
        fileValidationResult.errors.concat([
          "Check file extensions (.csv, .tsv allowed)",
          "Verify files exist and are accessible",
          "Ensure files are not empty",
        ])
      );
    }
    // Validate delimiter
    try {
      validateDelimiter(config.delimiter);
    } catch (error) {
      throw ErrorFactory.validation(
        "Invalid delimiter specified",
        { delimiter: config.delimiter, error },
        [
          "Delimiter must be a single character",
          "Common delimiters: , (comma), ; (semicolon), \\t (tab)",
          "Use --delimiter option to specify delimiter",
        ]
      );
    }

    // Validate batch size
    try {
      validateBatchSize(config.batchSize);
    } catch (error) {
      throw ErrorFactory.validation(
        "Invalid batch size specified",
        { batchSize: config.batchSize, error },
        [
          "Batch size must be a positive number",
          "Recommended range: 100-5000",
          "Use --batch-size option to specify batch size",
        ]
      );
    }

    // Validate each file's CSV headers (without index validation)
    for (const filePath of filePaths) {
      await this.validateFileHeaders(filePath, config.delimiter);
    }
  }

  /**
   * Validates headers for a single file (without index validation)
   */
  private async validateFileHeaders(
    filePath: string,
    delimiter: string
  ): Promise<void> {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const [headerLine] = fileContent.split("\n");

      if (!headerLine) {
        throw ErrorFactory.invalidFile(
          "CSV file is empty or has no headers",
          filePath,
          [
            "Ensure the file contains data",
            "Check if the first line contains column headers",
            "Verify the file was not corrupted during transfer",
          ]
        );
      }

      const parseResult = parseCSVLine(headerLine, delimiter, true);
      if (!parseResult || !parseResult[0]) {
        throw ErrorFactory.parsing(
          "Failed to parse CSV headers",
          { filePath, delimiter, headerLine: headerLine.substring(0, 100) },
          [
            `Check if '${delimiter}' is the correct delimiter`,
            "Verify CSV format is valid",
            "Ensure headers don't contain special characters",
          ]
        );
      }

      const headers = parseResult[0];

      // Validate CSV structure using our validation function (without index mapping)
      await validateCSVStructure(headers);
    } catch (error) {
      // If it's already a ConductorError, rethrow it
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      // Wrap other errors
      throw ErrorFactory.validation(
        "Error validating CSV headers",
        { filePath, originalError: error },
        [
          "Check CSV file format and structure",
          "Ensure headers follow naming conventions",
          "Verify file encoding is UTF-8",
        ]
      );
    }
  }

  /**
   * Processes a single file with consolidated validation
   * Index validation now happens here, creating single point of validation
   */
  private async processFile(filePath: string, config: any): Promise<void> {
    try {
      // Set up Elasticsearch client
      const client = createClientFromConfig(config);

      // Validate Elasticsearch connection first
      await validateConnection(client);

      // Validate index exists (SINGLE POINT OF INDEX VALIDATION)
      await validateIndex(client, config.elasticsearch.index);

      // NOW validate headers against mapping (only after we know index exists)
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const [headerLine] = fileContent.split("\n");
      const parseResult = parseCSVLine(headerLine, config.delimiter, true);
      const headers = parseResult[0];

      Logger.debug`Validating headers against the ${config.elasticsearch.index} mapping`;
      await validateHeadersMatchMappings(
        client,
        headers,
        config.elasticsearch.index
      );

      // Process the file
      await processCSVFile(filePath, config, client);
    } catch (error) {
      // If it's already a ConductorError, just rethrow it without additional wrapping
      // This prevents duplicate error creation and logging
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      // Only wrap and categorize non-ConductorError exceptions
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("ENOTFOUND")
      ) {
        throw ErrorFactory.connection(
          "Failed to connect to Elasticsearch",
          {
            filePath,
            elasticsearchUrl: config.elasticsearch.url,
            originalError: error,
          },
          [
            "Check that Elasticsearch is running",
            `Verify the URL: ${config.elasticsearch.url}`,
            "Check network connectivity",
            "Review firewall and security settings",
          ]
        );
      }

      if (errorMessage.includes("401") || errorMessage.includes("403")) {
        throw ErrorFactory.auth(
          "Elasticsearch authentication failed",
          {
            filePath,
            originalError: error,
          },
          [
            "Check your Elasticsearch credentials",
            "Verify username and password",
            "Ensure you have write permissions to the index",
          ]
        );
      }

      // Generic processing error for unknown exceptions
      throw ErrorFactory.csv(
        "Failed to process CSV file",
        {
          filePath,
          originalError: error,
        },
        [
          "Check CSV file format and structure",
          "Verify file is not corrupted",
          "Ensure sufficient memory and disk space",
          "Use --debug for detailed error information",
        ]
      );
    }
  }
}
