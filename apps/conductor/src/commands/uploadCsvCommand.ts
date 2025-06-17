/**
 * Upload Command
 *
 * Command implementation for uploading CSV data to Elasticsearch.
 * Updated to use error factory pattern for consistent error handling.
 */

import { validateBatchSize } from "../validations/elasticsearchValidator";
import { validateDelimiter } from "../validations/utils";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
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

    Logger.debug`Input files specified: ${filePaths.length}`;
    Logger.debug`Files: ${filePaths.join(", ")}`;

    // Process each file
    let successCount = 0;
    let failureCount = 0;
    const failureDetails: Record<string, any> = {};

    for (const filePath of filePaths) {
      Logger.generic("");
      Logger.info`Processing File: ${filePath}\n`;

      try {
        await this.processFile(filePath, config);
        Logger.debug`Successfully processed ${filePath}`;
        successCount++;
      } catch (error) {
        failureCount++;

        // Log the error with better formatting for user visibility
        if (error instanceof Error && error.name === "ConductorError") {
          const conductorError = error as any;

          // Display the main error message prominently
          Logger.errorString(`${conductorError.message}`);

          // Show suggestions if available
          if (
            conductorError.suggestions &&
            conductorError.suggestions.length > 0
          ) {
            Logger.generic("");
            Logger.section("Suggestions");
            conductorError.suggestions.forEach((suggestion: string) => {
              Logger.tipString(suggestion);
            });
            Logger.generic("");
          }

          Logger.debug`Skipping file '${filePath}': [${conductorError.code}] ${conductorError.message}`;

          if (conductorError.details) {
            Logger.debugString(
              `Error details: ${JSON.stringify(conductorError.details)}`
            );
          }

          failureDetails[filePath] = {
            code: conductorError.code,
            message: conductorError.message,
            details: conductorError.details,
          };
        } else if (error instanceof Error) {
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
      const error = ErrorFactory.validation(
        `Failed to process all ${failureCount} files`,
        failureDetails,
        [
          "Check file formats and permissions",
          "Verify CSV structure and headers",
          "Ensure Elasticsearch is accessible",
          "Use --debug for detailed error information",
        ]
      );

      return {
        success: false,
        errorMessage: error.message,
        errorCode: error.code,
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

      // Validate CSV structure using our validation function
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
   * Processes a single file
   */
  private async processFile(filePath: string, config: any): Promise<void> {
    try {
      // Set up Elasticsearch client
      const client = createClientFromConfig(config);

      // Validate Elasticsearch connection and index
      await validateConnection(client);
      await validateIndex(client, config.elasticsearch.index);

      // Process the file
      await processCSVFile(filePath, config, client);
    } catch (error) {
      // Categorize and enhance the error based on its type
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

      if (errorMessage.includes("index_not_found")) {
        throw ErrorFactory.validation(
          `Elasticsearch index not found: ${config.elasticsearch.index}`,
          {
            filePath,
            index: config.elasticsearch.index,
            originalError: error,
          },
          [
            "Create the index first or use a different index name",
            `Use --index option to specify a different index`,
            "Check index name spelling",
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

      // If it's already a ConductorError, just rethrow it (including index validation errors)
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      // Generic processing error
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
