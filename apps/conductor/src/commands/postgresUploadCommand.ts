// src/commands/postgresUploadCommand.ts
/**
 * PostgreSQL Upload Command
 *
 * Command implementation for uploading CSV data to PostgreSQL.
 * Mirrors the Elasticsearch upload functionality but targets PostgreSQL database.
 * Updated with proper connection cleanup to ensure process exits correctly.
 */

import { validateDelimiter } from "../validations/utils";
import { validateFiles } from "../validations/fileValidator";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import {
  createPostgresClient,
  validateConnection,
} from "../services/postgresql";
import { processCSVFileForPostgres } from "../services/csvProcessor/postgresProcessor";
import { parseCSVLine } from "../services/csvProcessor/csvParser";
import * as fs from "fs";
import { Pool } from "pg";

export class PostgresUploadCommand extends Command {
  constructor() {
    super("postgresUpload");
  }

  /**
   * Executes the upload process for all specified files
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { config, filePaths } = cliOutput;

    Logger.debug`Input files specified: ${filePaths.length}`;
    Logger.debug`Files: ${filePaths.join(", ")}`;

    // Process each file
    let successCount = 0;
    let failureCount = 0;
    const failureDetails: Record<string, any> = {};

    try {
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
    } finally {
      // CRITICAL: Ensure we exit the process cleanly
      Logger.debug`Cleaning up and preparing to exit`;

      // Force exit after a short delay to allow any remaining cleanup
      setTimeout(() => {
        Logger.debug`Forcing process exit`;
        process.exit(0);
      }, 500);
    }
  }

  /**
   * Validates command line arguments and configuration
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { config, filePaths } = cliOutput;

    // Validate PostgreSQL configuration exists
    if (!config.postgresql) {
      throw ErrorFactory.args("PostgreSQL configuration is required", [
        "Provide PostgreSQL configuration in your config object",
        "Use command-line options to specify PostgreSQL connection details",
        "Example: --host localhost --database mydb --table mytable",
      ]);
    }

    if (!config.postgresql.table) {
      throw ErrorFactory.args("PostgreSQL table name is required", [
        "Use --table option to specify the target table",
        "Example: --table users",
        "Ensure the table exists in your database",
      ]);
    }

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
      this.validateBatchSize(config.batchSize);
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
   * Validates headers for a single CSV file
   */
  private async validateFileHeaders(
    filePath: string,
    delimiter: string
  ): Promise<void> {
    try {
      // Read first line only
      const fileHandle = await fs.promises.open(filePath, "r");
      const firstLineBuffer = Buffer.alloc(1024);
      await fileHandle.read(firstLineBuffer, 0, 1024, 0);
      await fileHandle.close();

      const firstLine = firstLineBuffer.toString("utf8").split("\n")[0];

      // Parse the headers
      const headerResult = parseCSVLine(firstLine, delimiter, true);
      const headers = headerResult[0] || [];

      if (!headers || headers.length === 0) {
        throw ErrorFactory.parsing(
          "Failed to parse CSV headers",
          {
            line: firstLine.substring(0, 100),
            delimiter,
            filePath,
          },
          [
            "Check if the first line contains valid headers",
            `Verify '${delimiter}' is the correct delimiter`,
            "Ensure headers are properly formatted",
          ]
        );
      }

      Logger.debug`Validated headers for ${filePath}: ${headers.join(", ")}`;
    } catch (error) {
      // If it's already a ConductorError, just rethrow it
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
   * Validates batch size
   */
  private validateBatchSize(batchSize: number): void {
    if (!batchSize || isNaN(batchSize) || batchSize <= 0) {
      throw ErrorFactory.validation(
        "Batch size must be a positive number",
        {
          provided: batchSize,
          type: typeof batchSize,
        },
        [
          "Provide a positive number for batch size",
          "Recommended range: 100–5000",
          "Example: --batch-size 1000",
        ]
      );
    }

    if (batchSize > 10000) {
      Logger.warnString(
        `Batch size ${batchSize} is quite large and may cause performance issues`
      );
      Logger.tipString(
        "Consider using a smaller batch size (1000–5000) for better performance"
      );
    } else {
      Logger.debug`Batch size validated: ${batchSize}`;
    }
  }

  /**
   * Processes a single file with proper connection cleanup
   */
  private async processFile(filePath: string, config: any): Promise<void> {
    let client: Pool | undefined;

    try {
      // Set up PostgreSQL client
      client = createPostgresClient(config);

      // Validate PostgreSQL connection
      await validateConnection(client);

      // Validate table exists
      await this.validateTable(client, config.postgresql!.table);

      // Process the file
      await processCSVFileForPostgres(filePath, config, client);
    } catch (error) {
      // If it's already a ConductorError, just rethrow it without additional wrapping
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      // Only wrap and categorize non-ConductorError exceptions
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      throw ErrorFactory.validation(
        `File processing failed: ${errorMessage}`,
        { filePath, originalError: error },
        [
          "Check file format and content",
          "Verify PostgreSQL connection and table schema",
          "Review error details for specific issues",
        ]
      );
    } finally {
      // CRITICAL: Always close the connection pool to allow process to exit
      if (client) {
        try {
          Logger.debug`Closing PostgreSQL connection pool for ${filePath}`;
          await client.end();
          Logger.debug`PostgreSQL connection pool closed successfully`;
        } catch (closeError) {
          Logger.debug`Warning: Error closing PostgreSQL connection pool: ${closeError}`;
          // Don't throw here - we don't want to mask the original error
        }
      }
    }
  }

  /**
   * Validates that a table exists
   */
  private async validateTable(client: Pool, tableName: string): Promise<void> {
    try {
      Logger.debug`Validating table exists: ${tableName}`;

      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName]
      );

      const tableExists = result.rows[0]?.exists;

      if (!tableExists) {
        Logger.debug`Table ${tableName} does not exist, will be created during upload`;
      } else {
        Logger.debug`Table ${tableName} exists and is accessible`;
      }
    } catch (error) {
      throw ErrorFactory.validation(
        "Failed to validate table structure",
        {
          tableName,
          originalError: error,
        },
        [
          "Check PostgreSQL connection and availability",
          "Verify table exists and you have access",
          "Ensure PostgreSQL service is running",
        ]
      );
    }
  }
}
