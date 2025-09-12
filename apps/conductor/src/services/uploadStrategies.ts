// src/services/uploadStrategies.ts
/**
 * Upload strategy implementations with simplified payload-only indexing
 *
 * SIMPLE APPROACH:
 * - Sequential upload: Upload to postgres, then index the same CSV payload directly to elasticsearch
 * - Standalone index command: Indexes the entire database
 * UPDATED: Added info messages for both upload and indexing steps
 */

import { CommandResult } from "../commands/baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";

export interface UploadStrategy {
  execute(cliOutput: CLIOutput): Promise<CommandResult>;
}

/**
 * Strategy for PostgreSQL-only uploads
 */
export class PostgresOnlyStrategy implements UploadStrategy {
  async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const tableName = cliOutput.config.postgresql?.table;
    if (!tableName) {
      throw ErrorFactory.args("PostgreSQL table name is required");
    }

    Logger.info`Uploading to PostgreSQL table: ${tableName}`;

    const { PostgresUploadCommand } = await import(
      "../commands/postgresUploadCommand"
    );
    const command = new PostgresUploadCommand();
    return await command.run(cliOutput);
  }
}

/**
 * Strategy for Elasticsearch-only uploads
 */
export class ElasticsearchOnlyStrategy implements UploadStrategy {
  async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const indexName = cliOutput.config.elasticsearch?.index;
    if (!indexName) {
      throw ErrorFactory.args("Elasticsearch index name is required");
    }

    await this.confirmDirectUpload(cliOutput, indexName);

    Logger.info`Uploading to Elasticsearch index: ${indexName}`;

    const { UploadCommand } = await import(
      "../commands/elasticsearchUploadCommand"
    );
    const command = new UploadCommand();
    return await command.run(cliOutput);
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
 * SIMPLE APPROACH: Upload to postgres, then process the same CSV files to elasticsearch
 * UPDATED: Added info message for PostgreSQL upload step
 */
export class SequentialUploadStrategy implements UploadStrategy {
  async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { config } = cliOutput;
    const tableName = config.postgresql?.table;
    const indexName = config.elasticsearch?.index;

    if (!tableName || !indexName) {
      throw ErrorFactory.args(
        "Both PostgreSQL table and Elasticsearch index are required for sequential upload"
      );
    }

    Logger.debug`Sequential upload: PostgreSQL(${tableName}) → Elasticsearch(${indexName})`;

    // Step 1: PostgreSQL Upload
    Logger.generic("");
    Logger.info`Uploading data to ${tableName}`;
    const postgresResult = await this.runPostgresUpload(cliOutput);

    if (!postgresResult.success) {
      Logger.errorString("PostgreSQL upload failed, skipping indexing step");
      return postgresResult;
    }

    Logger.debug`PostgreSQL upload completed successfully`;

    // Step 2: Index the same CSV payload directly to Elasticsearch
    Logger.info`Indexing data to ${indexName}`;
    const elasticsearchResult = await this.runElasticsearchUpload(cliOutput);

    if (!elasticsearchResult.success) {
      Logger.errorString(
        "Elasticsearch indexing failed, but PostgreSQL upload was successful"
      );
      return {
        success: false,
        errorMessage: `PostgreSQL upload succeeded, but elasticsearch indexing failed: ${elasticsearchResult.errorMessage}`,
        errorCode: elasticsearchResult.errorCode,
        details: {
          postgresResult,
          elasticsearchResult,
          partialSuccess: true,
        },
      };
    }

    Logger.debug`Sequential upload workflow completed successfully`;

    return {
      success: true,
      details: {
        postgresResult,
        elasticsearchResult,
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
    return await command.run(cliOutput);
  }

  /**
   * SIMPLE APPROACH: Process the same CSV files to elasticsearch
   * This avoids the postgres table reading issues and ensures we index exactly what was uploaded
   */
  private async runElasticsearchUpload(
    cliOutput: CLIOutput
  ): Promise<CommandResult> {
    const { UploadCommand } = await import(
      "../commands/elasticsearchUploadCommand"
    );
    const command = new UploadCommand();

    // Create elasticsearch-only config (same files, different target)
    const esConfig: CLIOutput = {
      ...cliOutput,
      config: {
        ...cliOutput.config,
        postgresql: undefined, // Clear postgres config to avoid confusion
      },
    };

    return await command.run(esConfig);
  }
}

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
