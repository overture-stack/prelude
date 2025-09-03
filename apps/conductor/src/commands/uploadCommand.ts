// src/commands/uploadCommand.ts
/**
 * Unified Upload Command - SIMPLE & MAINTAINABLE
 *
 * Handles three scenarios:
 * 1. -t only: PostgreSQL upload
 * 2. -i only: Elasticsearch upload
 * 3. -t + -i: PostgreSQL upload → index (separate commands)
 */

import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import { PostgresUploadCommand } from "./postgresUploadCommand";
import { UploadCommand } from "./elasticsearchUploadCommand";

export class UnifiedUploadCommand extends Command {
  constructor() {
    super("upload");
  }

  protected async validate(cliOutput: CLIOutput): Promise<void> {
    await super.validate(cliOutput);

    const { config } = cliOutput;
    const tableName = config.postgresql?.table;
    const indexName = config.elasticsearch?.index;

    if (!tableName && !indexName) {
      throw ErrorFactory.args(
        "Must specify either table name (-t) or index name (-i) or both",
        [
          "Use -t <tableName> for PostgreSQL upload only",
          "Use -i <indexName> for Elasticsearch upload only",
          "Use -t <tableName> -i <indexName> for PostgreSQL upload + indexing",
        ]
      );
    }
  }

  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { config } = cliOutput;
    const tableName = config.postgresql?.table;
    const indexName = config.elasticsearch?.index;

    try {
      // Scenario 1: Table only - PostgreSQL upload
      if (tableName && !indexName) {
        Logger.info`Executing PostgreSQL upload to table: ${tableName}`;
        return await this.runPostgresUpload(cliOutput);
      }

      // Scenario 2: Index only - Elasticsearch upload
      if (!tableName && indexName) {
        await this.confirmDirectElasticsearchUpload(cliOutput, indexName);
        Logger.info`Executing Elasticsearch upload to index: ${indexName}`;
        return await this.runElasticsearchUpload(cliOutput);
      }

      // Scenario 3: Both - Sequential execution without forced exits
      if (tableName && indexName) {
        return await this.runSequentialUploadAndIndex(cliOutput);
      }

      throw ErrorFactory.connection("Invalid parameter combination");
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      throw ErrorFactory.connection(
        `Upload command failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { tableName, indexName },
        ["Check database connections", "Verify table and index names"]
      );
    }
  }

  /**
   * Runs sequential upload and index using separate commands
   */
  private async runSequentialUploadAndIndex(
    cliOutput: CLIOutput
  ): Promise<CommandResult> {
    const { config } = cliOutput;
    const tableName = config.postgresql!.table;
    const indexName = config.elasticsearch!.index;

    Logger.info`Executing PostgreSQL upload to table: ${tableName} followed by indexing to: ${indexName}`;

    // Step 1: PostgreSQL Upload
    Logger.info`Uploading to PostgreSQL...`;
    const postgresResult = await this.runPostgresUpload(cliOutput);

    if (!postgresResult.success) {
      Logger.error`PostgreSQL upload failed, skipping indexing step`;
      return postgresResult;
    }

    Logger.success`PostgreSQL upload completed successfully`;

    // Step 2: Run standalone index command but suppress its exit
    Logger.info`Indexing to Elasticsearch...`;
    const indexResult = await this.runIndexCommandSafely(cliOutput);

    if (!indexResult.success) {
      Logger.error`Indexing failed, but PostgreSQL upload was successful`;
      return {
        success: false,
        errorMessage: `PostgreSQL upload succeeded, but indexing failed: ${indexResult.errorMessage}`,
        errorCode: indexResult.errorCode,
        details: { postgresResult, indexResult, partialSuccess: true },
      };
    }

    Logger.success`Upload and indexing workflow completed successfully`;
    return {
      success: true,
      details: { postgresResult, indexResult, workflow: "upload-and-index" },
    };
  }

  /**
   * Runs index command while suppressing its process.exit
   */
  private async runIndexCommandSafely(
    cliOutput: CLIOutput
  ): Promise<CommandResult> {
    // Store original process.exit
    const originalExit = process.exit;
    let exitCalled = false;

    try {
      // Temporarily override process.exit to prevent forced termination
      process.exit = ((code?: number) => {
        Logger.debug`Index command attempted to exit with code: ${code}`;
        exitCalled = true;
        // Don't actually exit - just log it
      }) as any;

      const { IndexCommand } = await import("./postgresIndexCommand");
      const indexCommand = new IndexCommand();
      const result = await indexCommand.run(cliOutput);

      return result;
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        details: { originalError: error },
      };
    } finally {
      // Restore original process.exit
      process.exit = originalExit;

      if (exitCalled) {
        Logger.debug`Successfully intercepted index command exit`;
      }
    }
  }

  /**
   * Confirms direct Elasticsearch upload
   */
  private async confirmDirectElasticsearchUpload(
    cliOutput: CLIOutput,
    indexName: string
  ): Promise<void> {
    Logger.warn`Direct upload to Elasticsearch index: ${indexName}`;
    Logger.generic("This bypasses PostgreSQL storage.");

    if (!cliOutput.options?.force) {
      const confirmed = await this.getUserConfirmation("Continue? (y/N): ");
      if (!confirmed) {
        throw ErrorFactory.args("Upload cancelled by user");
      }
    }
  }

  /**
   * Simple user confirmation prompt
   */
  private async getUserConfirmation(question: string): Promise<boolean> {
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      const answer = await new Promise<string>((resolve) => {
        rl.question(question, resolve);
      });
      return answer.toLowerCase().startsWith("y");
    } finally {
      rl.close();
    }
  }

  /**
   * Runs PostgreSQL upload command
   */
  private async runPostgresUpload(
    cliOutput: CLIOutput
  ): Promise<CommandResult> {
    const command = new PostgresUploadCommand();
    return await command.run(cliOutput);
  }

  /**
   * Runs Elasticsearch upload command
   */
  private async runElasticsearchUpload(
    cliOutput: CLIOutput
  ): Promise<CommandResult> {
    const command = new UploadCommand();
    return await command.run(cliOutput);
  }

  protected requiresInputFiles(): boolean {
    return true;
  }
}
