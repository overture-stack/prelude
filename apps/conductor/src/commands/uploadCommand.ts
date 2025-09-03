// src/commands/uploadCommand.ts
/**
 * Unified Upload Command - CLEAN & SIMPLE
 *
 * Delegates to appropriate upload strategy based on configuration.
 * No more complex conditional logic - uses Strategy pattern for clarity.
 */

import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import { createUploadStrategy } from "../services/uploadStrategies";

export class UnifiedUploadCommand extends Command {
  constructor() {
    super("upload");
  }

  protected async validate(cliOutput: CLIOutput): Promise<void> {
    await super.validate(cliOutput);

    const { config } = cliOutput;
    const hasTable = !!config.postgresql?.table;
    const hasIndex = !!config.elasticsearch?.index;

    if (!hasTable && !hasIndex) {
      throw ErrorFactory.args(
        "Must specify either table (-t) or index (-i) or both",
        [
          "Use -t <tableName> for PostgreSQL upload",
          "Use -i <indexName> for Elasticsearch upload",
          "Use both for sequential upload and indexing",
        ]
      );
    }

    // Log the determined strategy for clarity
    this.logUploadStrategy(hasTable, hasIndex, config);
  }

  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    try {
      const strategy = createUploadStrategy(cliOutput);
      return await strategy.execute(cliOutput);
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      throw ErrorFactory.connection(
        `Upload command failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { config: cliOutput.config },
        ["Check database connections", "Verify configuration parameters"]
      );
    }
  }

  private logUploadStrategy(
    hasTable: boolean,
    hasIndex: boolean,
    config: any
  ): void {
    if (hasTable && hasIndex) {
      Logger.debug`Strategy: Sequential upload (PostgreSQL → Elasticsearch)`;
      Logger.debug`  Table: ${config.postgresql.table}`;
      Logger.debug`  Index: ${config.elasticsearch.index}`;
    } else if (hasTable) {
      Logger.debug`Strategy: PostgreSQL upload only`;
      Logger.debug`  Table: ${config.postgresql.table}`;
    } else if (hasIndex) {
      Logger.debug`Strategy: Elasticsearch upload only`;
      Logger.debug`  Index: ${config.elasticsearch.index}`;
    }
  }

  protected requiresInputFiles(): boolean {
    return true;
  }
}
