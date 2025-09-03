// src/services/uploadStrategies.ts
/**
 * Upload strategy implementations using Strategy pattern
 * Makes different upload scenarios explicit and testable
 * FIXED: Proper null checking and correct method calls
 */

import { CommandResult } from "../commands/baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";

/**
 * Base interface for all upload strategies
 */
export interface UploadStrategy {
  execute(cliOutput: CLIOutput): Promise<CommandResult>;
}

/**
 * Strategy for PostgreSQL-only uploads
 */
export class PostgresOnlyStrategy implements UploadStrategy {
  async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    // Safe access with null checking
    const tableName = cliOutput.config.postgresql?.table;
    if (!tableName) {
      throw ErrorFactory.args("PostgreSQL table name is required");
    }

    Logger.info`Uploading to PostgreSQL table: ${tableName}`;

    const { PostgresUploadCommand } = await import(
      "../commands/postgresUploadCommand"
    );
    const command = new PostgresUploadCommand();

    // Use the inherited run method from Command base class
    const result = await command.run(cliOutput);
    return result;
  }
}

/**
 * Strategy for Elasticsearch-only uploads
 */
export class ElasticsearchOnlyStrategy implements UploadStrategy {
  async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    // Safe access with null checking
    const indexName = cliOutput.config.elasticsearch?.index;
    if (!indexName) {
      throw ErrorFactory.args("Elasticsearch index name is required");
    }

    // Confirm direct Elasticsearch upload (bypasses PostgreSQL)
    await this.confirmDirectUpload(cliOutput, indexName);

    Logger.info`Uploading to Elasticsearch index: ${indexName}`;

    const { UploadCommand } = await import(
      "../commands/elasticsearchUploadCommand"
    );
    const command = new UploadCommand();

    // Use the inherited run method from Command base class
    const result = await command.run(cliOutput);
    return result;
  }

  private async confirmDirectUpload(
    cliOutput: CLIOutput,
    indexName: string
  ): Promise<void> {
    Logger.warn`Direct Elasticsearch upload to: ${indexName}`;
    Logger.generic("This bypasses PostgreSQL storage.");

    if (!cliOutput.options?.force) {
      const confirmed = await this.getUserConfirmation("Continue? (y/N): ");
      if (!confirmed) {
        throw ErrorFactory.args("Upload cancelled by user");
      }
    }
  }

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
}

/**
 * Strategy for sequential PostgreSQL upload followed by Elasticsearch indexing
 */
export class SequentialUploadStrategy implements UploadStrategy {
  async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { config } = cliOutput;

    // Safe access with null checking
    const tableName = config.postgresql?.table;
    const indexName = config.elasticsearch?.index;

    if (!tableName) {
      throw ErrorFactory.args(
        "PostgreSQL table name is required for sequential upload"
      );
    }

    if (!indexName) {
      throw ErrorFactory.args(
        "Elasticsearch index name is required for sequential upload"
      );
    }

    Logger.debug`Sequential upload: PostgreSQL(${tableName}) → Elasticsearch(${indexName})`;

    // Step 1: PostgreSQL Upload
    Logger.debug`Step 1: Uploading to PostgreSQL...`;
    const postgresResult = await this.runPostgresUpload(cliOutput);

    if (!postgresResult.success) {
      Logger.errorString("PostgreSQL upload failed, skipping indexing step");
      return postgresResult;
    }

    Logger.debug`PostgreSQL upload completed successfully`;

    // Step 2: Elasticsearch Indexing
    Logger.debug`Step 2: Indexing to Elasticsearch...`;
    const indexResult = await this.runIndexing(cliOutput);

    if (!indexResult.success) {
      Logger.errorString(
        "Indexing failed, but PostgreSQL upload was successful"
      );
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

    Logger.debug`Sequential upload workflow completed successfully`;

    return {
      success: true,
      details: {
        postgresResult,
        indexResult,
        workflow: "sequential",
        sourceTable: tableName,
        targetIndex: indexName,
      },
    };
  }

  private async runPostgresUpload(
    cliOutput: CLIOutput
  ): Promise<CommandResult> {
    const { PostgresUploadCommand } = await import(
      "../commands/postgresUploadCommand"
    );
    const command = new PostgresUploadCommand();

    // Use the inherited run method from Command base class
    return await command.run(cliOutput);
  }

  private async runIndexing(cliOutput: CLIOutput): Promise<CommandResult> {
    const { IndexCommand } = await import("../commands/postgresIndexCommand");
    const command = new IndexCommand();

    // Use the inherited run method from Command base class
    return await command.run(cliOutput);
  }
}

/**
 * Factory function to create appropriate upload strategy
 * FIXED: Proper null checking for config properties
 */
export function createUploadStrategy(cliOutput: CLIOutput): UploadStrategy {
  const { config } = cliOutput;
  const hasTable = !!config.postgresql?.table;
  const hasIndex = !!config.elasticsearch?.index;

  if (hasTable && hasIndex) {
    return new SequentialUploadStrategy();
  }

  if (hasTable) {
    return new PostgresOnlyStrategy();
  }

  if (hasIndex) {
    return new ElasticsearchOnlyStrategy();
  }

  throw ErrorFactory.args(
    "Must specify either table (-t) or index (-i) or both",
    [
      "Use -t <tableName> for PostgreSQL upload",
      "Use -i <indexName> for Elasticsearch upload",
      "Use both for sequential upload and indexing",
    ]
  );
}
