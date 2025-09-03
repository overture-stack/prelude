// src/commands/uploadCommand.ts
/**
 * Unified Upload Command
 *
 * Combines PostgreSQL and Elasticsearch upload functionality into a single command.
 * Handles three scenarios based on provided parameters:
 * 1. -t <tableName> only: PostgreSQL upload
 * 2. -i <indexName> only: Elasticsearch upload
 * 3. -t <tableName> -i <indexName>: PostgreSQL upload followed by indexing
 */

import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import { PostgresUploadCommand } from "./postgresUploadCommand";
import { UploadCommand } from "./elasticsearchUploadCommand";
import { IndexCommand } from "./postgresIndexCommand";

export class UnifiedUploadCommand extends Command {
  constructor() {
    super("upload");
  }

  /**
   * Validates the command parameters and ensures proper configuration
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    await super.validate(cliOutput);

    const { config } = cliOutput;
    const tableName = config.postgresql?.table;
    const indexName = config.elasticsearch?.index;

    // Must provide either table name or index name (or both)
    if (!tableName && !indexName) {
      throw ErrorFactory.args(
        "Must specify either table name (-t) or index name (-i) or both",
        [
          "Use -t <tableName> for PostgreSQL upload only",
          "Use -i <indexName> for Elasticsearch upload only",
          "Use -t <tableName> -i <indexName> for PostgreSQL upload + indexing",
          "Example: conductor upload -f data.csv -t users",
          "Example: conductor upload -f data.csv -i my-index",
          "Example: conductor upload -f data.csv -t users -i users-index",
        ]
      );
    }
  }

  /**
   * Executes the appropriate upload workflow based on provided parameters
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { config } = cliOutput;
    const tableName = config.postgresql?.table;
    const indexName = config.elasticsearch?.index;

    Logger.debug`Determining upload workflow...`;

    try {
      // Check dataset size for combined workflows
      if (tableName && indexName) {
        const recordCount = await this.estimateRecordCount(
          cliOutput.filePaths[0]
        );

        if (recordCount > 10000) {
          Logger.warn`Large dataset detected: ${recordCount} records`;
          Logger.generic(
            "For datasets over 10,000 records, separate commands are recommended for better reliability:"
          );
          Logger.generic(
            `  conductor upload -f ${cliOutput.filePaths[0]} -t ${tableName}`
          );
          Logger.generic(`  conductor index -t ${tableName} -i ${indexName}`);
          Logger.generic("");
          Logger.generic(
            "Large combined uploads may timeout or consume excessive memory."
          );

          if (!cliOutput.options?.force) {
            const readline = require("readline");
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });

            const answer = await new Promise<string>((resolve) => {
              rl.question(
                "Continue with combined workflow anyway? (y/N): ",
                (answer: string) => {
                  rl.close();
                  resolve(answer);
                }
              );
            });

            if (!answer.toLowerCase().startsWith("y")) {
              Logger.info`Workflow cancelled - use separate commands for large datasets`;
              return {
                success: false,
                errorMessage: "Large dataset workflow cancelled by user",
                details: {
                  reason: "user_cancelled_large_dataset",
                  recordCount,
                  recommendation: "Use separate upload and index commands",
                },
              };
            }
          }

          Logger.info`Proceeding with combined workflow for ${recordCount} records (user confirmed)`;
        }
      }

      // Scenario 1: Table name only - PostgreSQL upload
      if (tableName && !indexName) {
        Logger.info`Executing PostgreSQL upload to table: ${tableName}`;
        return await this.executePostgresUpload(cliOutput);
      }

      // Scenario 2: Index name only - Elasticsearch upload with warning
      if (!tableName && indexName) {
        Logger.warn`Warning: You are uploading directly to Elasticsearch index: ${indexName}`;
        Logger.generic(
          "This will bypass PostgreSQL storage and send data directly to Elasticsearch."
        );
        Logger.generic(
          "Data will not be stored in a relational database for backup or further processing."
        );

        // Check if force flag is set to skip confirmation
        if (!cliOutput.options?.force) {
          const readline = require("readline");
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const answer = await new Promise<string>((resolve) => {
            rl.question(
              "Do you wish to continue? (y/N): ",
              (answer: string) => {
                rl.close();
                resolve(answer);
              }
            );
          });

          if (!answer.toLowerCase().startsWith("y")) {
            Logger.info`Upload cancelled by user`;
            return {
              success: false,
              errorMessage: "Upload cancelled by user",
              details: { reason: "user_cancelled" },
            };
          }
        }

        Logger.info`Executing Elasticsearch upload to index: ${indexName}`;
        return await this.executeElasticsearchUpload(cliOutput);
      }

      // Scenario 3: Both table and index - PostgreSQL upload + indexing
      if (tableName && indexName) {
        Logger.info`Executing PostgreSQL upload to table: ${tableName} followed by indexing to: ${indexName}`;
        return await this.executePostgresUploadAndIndex(cliOutput);
      }

      // This shouldn't happen due to validation, but keep as safety
      throw ErrorFactory.connection("Invalid parameter combination", [
        "This error should not occur - please report this bug",
      ]);
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      throw ErrorFactory.connection(
        `Upload command failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { tableName, indexName, error },
        [
          "Check your database/Elasticsearch connections",
          "Verify table and index names are correct",
          "Use --debug for more detailed error information",
        ]
      );
    }
  }

  /**
   * Estimates record count in a CSV file by reading the first few KB and extrapolating
   */
  private async estimateRecordCount(filePath: string): Promise<number> {
    const fs = require("fs");

    try {
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      // For small files, count actual lines
      if (fileSize < 1024 * 1024) {
        // Less than 1MB
        const content = fs.readFileSync(filePath, "utf8");
        const lines = content.split("\n").length;
        return Math.max(0, lines - 1); // Subtract header row
      }

      // For larger files, sample first 10KB and extrapolate
      const sampleSize = Math.min(10240, fileSize); // 10KB sample
      const buffer = Buffer.alloc(sampleSize);
      const fd = fs.openSync(filePath, "r");
      fs.readSync(fd, buffer, 0, sampleSize, 0);
      fs.closeSync(fd);

      const sampleContent = buffer.toString("utf8");
      const sampleLines = sampleContent.split("\n").length - 1; // Subtract header

      if (sampleLines <= 0) return 0;

      // Extrapolate based on file size ratio
      const estimatedRecords = Math.floor(
        (fileSize / sampleSize) * sampleLines
      );
      return Math.max(0, estimatedRecords);
    } catch (error) {
      // If estimation fails, assume it's a large file to be safe
      Logger.debug`Could not estimate record count: ${error}`;
      return 15000; // Conservative estimate to trigger warning
    }
  }

  /**
   * Executes PostgreSQL upload only
   */
  private async executePostgresUpload(
    cliOutput: CLIOutput
  ): Promise<CommandResult> {
    const postgresCommand = new PostgresUploadCommand();
    return await postgresCommand.run(cliOutput);
  }

  /**
   * Executes Elasticsearch upload only
   */
  private async executeElasticsearchUpload(
    cliOutput: CLIOutput
  ): Promise<CommandResult> {
    const elasticsearchCommand = new UploadCommand();
    return await elasticsearchCommand.run(cliOutput);
  }

  /**
   * Executes PostgreSQL upload followed by indexing to Elasticsearch
   */
  private async executePostgresUploadAndIndex(
    cliOutput: CLIOutput
  ): Promise<CommandResult> {
    Logger.info`Step 1/2: Uploading to PostgreSQL...`;

    // First, upload to PostgreSQL
    const postgresResult = await this.executePostgresUpload(cliOutput);

    if (!postgresResult.success) {
      Logger.error`PostgreSQL upload failed, skipping indexing step`;
      return postgresResult;
    }

    Logger.success`PostgreSQL upload completed successfully`;
    Logger.info`Step 2/2: Indexing to Elasticsearch...`;

    // Then, index the uploaded data to Elasticsearch
    const indexResult = await this.executeIndexing(cliOutput);

    if (!indexResult.success) {
      Logger.error`Indexing failed, but PostgreSQL upload was successful`;
      return {
        success: false,
        errorMessage: `PostgreSQL upload succeeded, but indexing failed: ${indexResult.errorMessage}`,
        errorCode: indexResult.errorCode,
        details: {
          postgresResult,
          indexResult,
          partialSuccess: true,
        },
      };
    }

    Logger.success`Upload and indexing workflow completed successfully`;

    return {
      success: true,
      details: {
        postgresResult,
        indexResult,
        workflow: "upload-and-index",
      },
    };
  }

  /**
   * Executes the indexing from PostgreSQL to Elasticsearch
   */
  private async executeIndexing(cliOutput: CLIOutput): Promise<CommandResult> {
    const indexCommand = new IndexCommand();
    return await indexCommand.run(cliOutput);
  }

  /**
   * This command requires input files for upload operations
   */
  protected requiresInputFiles(): boolean {
    return true;
  }
}
