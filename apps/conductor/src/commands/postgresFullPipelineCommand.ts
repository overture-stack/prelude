// src/commands/postgresFullPipelineCommand.ts
/**
 * PostgreSQL Full Pipeline Command
 *
 * Complete pipeline: CSV → PostgreSQL → Elasticsearch
 * Combines CSV upload and indexing in a single command
 */

import { validateDelimiter } from "../validations/utils";
import { validateFiles } from "../validations/fileValidator";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ConductorError, ErrorFactory } from "../utils/errors";
import {
  createPostgresClient,
  validateConnection as validatePostgresConnection,
} from "../services/postgresql";
import {
  createClientFromConfig,
  validateConnection as validateElasticsearchConnection,
} from "../services/elasticsearch";
import { processCSVFileForPostgres } from "../services/postgresql/postgresProcessor";
import { sendBulkWriteRequest } from "../services/elasticsearch/bulk";
import { postgresRowToEsDocument } from "../services/csvProcessor/metadata";
import { setProgressStats, resetProgressStats, reserveProgressLines } from "../services/csvProcessor/progressBar";

import { Pool } from "pg";
import { Client } from "@elastic/elasticsearch";

export class PostgresFullPipelineCommand extends Command {
  constructor() {
    super("postgresFullPipeline");
  }

  /**
   * Executes the full pipeline: CSV → PostgreSQL → Elasticsearch
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { config, filePaths } = cliOutput;
    let pgClient: Pool | undefined;
    let esClient: Client | undefined;

    // Graceful shutdown on Ctrl+C or SIGTERM — close connections before exit
    const shutdown = () => {
      Logger.warnString("\nInterrupted — closing connections...");
      // Exit immediately — OS will release PG/ES sockets. Waiting for
      // pool.end() to drain lets in-flight batches keep running.
      process.exit(1);
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);

    try {
      Logger.debug`Starting full pipeline: CSV → PostgreSQL → Elasticsearch`;

      // Set up clients
      pgClient = createPostgresClient(config);
      esClient = createClientFromConfig(config);

      // Validate connections
      Logger.debug`Validating PostgreSQL connection`;
      await validatePostgresConnection(pgClient, config);

      Logger.debug`Validating Elasticsearch connection`;
      await validateElasticsearchConnection(esClient);

      const tableName = config.postgresql!.table!;
      const indexName = config.elasticsearch!.index;

      let totalUploaded = 0;
      let totalIndexed = 0;
      let totalSkipped = 0;
      let totalCreated = 0;
      let totalUpdated = 0;
      let indexFailedRecords = 0;
      const pipelineStartTime = Date.now();

      // Reset live stats for this run so the progress bar starts clean
      resetProgressStats();

      // Reserve lines for the 3-line progress display (TTY) or blank separator (non-TTY)
      reserveProgressLines();

      // Process each CSV file — postgres INSERT returns only newly inserted rows,
      // which are indexed directly without a second table scan.
      for (const filePath of filePaths) {
        Logger.generic("");
        Logger.info`Uploading ${filePath} → ${tableName} (PostgreSQL + Elasticsearch)`;

        await processCSVFileForPostgres(
          filePath,
          config,
          pgClient,
          async (rows) => {
            const esDocuments = (rows as Record<string, unknown>[]).map((row) =>
              postgresRowToEsDocument(row, tableName)
            );
            await sendBulkWriteRequest(
              esClient!,
              esDocuments,
              indexName,
              (count) => { indexFailedRecords += count; },
              { maxRetries: 3, refresh: false, writeErrorLog: false },
              (created, updated) => { totalCreated += created; totalUpdated += updated; }
            );
            totalIndexed += esDocuments.length;
            setProgressStats(totalIndexed - indexFailedRecords, totalSkipped);
          },
          (skipped) => { totalSkipped = skipped; setProgressStats(totalIndexed - indexFailedRecords, skipped); }
        );

        totalUploaded++;
      }

      const successfullyIndexed = totalIndexed - indexFailedRecords;
      const pipelineElapsedMs = Math.max(1, Date.now() - pipelineStartTime);
      const pipelineRate = Math.round(successfullyIndexed / (pipelineElapsedMs / 1000));
      if (totalSkipped > 0) {
        Logger.generic(`   └─ Skipped ${totalSkipped.toLocaleString()} duplicate record(s) — already exists in "${tableName}"`);
      }
      Logger.generic(`   └─ ${successfullyIndexed.toLocaleString()} indexed to ${indexName} (${pipelineRate} rec/sec)`);
      if (totalUpdated > 0) {
        Logger.generic(`   └─ ${totalCreated.toLocaleString()} new, ${totalUpdated.toLocaleString()} updated`);
      }
      if (indexFailedRecords > 0) {
        Logger.generic(`   └─ ${indexFailedRecords.toLocaleString()} failed to index`);
        Logger.warnString(`Some records were inserted into "${tableName}" but not indexed. Re-run indexing with:`);
        Logger.generic(`   conductor index -t ${tableName} -i ${indexName}`);
      }

      Logger.successString(
        `Pipeline complete: ${successfullyIndexed.toLocaleString()} records uploaded to ${tableName} and indexed to ${indexName}`
      );

      return {
        success: true,
        details: {
          filesUploaded: totalUploaded,
          recordsIndexed: totalIndexed,
          sourceTable: tableName,
          targetIndex: indexName,
        },
      };
    } catch (error) {
      if (error instanceof ConductorError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw ErrorFactory.validation(
        `Full pipeline failed: ${errorMessage}`,
        { originalError: error },
        [
          "Check PostgreSQL and Elasticsearch connections",
          "Verify CSV file format and table schema",
          "Review error details for specific issues",
        ]
      );
    } finally {
      process.off("SIGINT", shutdown);
      process.off("SIGTERM", shutdown);

      // Clean up connections
      if (pgClient) {
        try {
          Logger.debug`Closing PostgreSQL connection pool`;
          await pgClient.end();
        } catch (closeError) {
          Logger.debug`Warning: Error closing PostgreSQL connection: ${closeError}`;
        }
      }

      if (esClient) {
        try {
          Logger.debug`Closing Elasticsearch client`;
          await esClient.close();
        } catch (closeError) {
          Logger.debug`Warning: Error closing Elasticsearch client: ${closeError}`;
        }
      }
    }
  }

  /**
   * Validates command line arguments and configuration
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { config, filePaths } = cliOutput;

    // Check if user explicitly provided table and index by looking at process.argv
    const args = process.argv;
    const hasTableFlag =
      args.includes("-t") || args.some((arg) => arg.startsWith("--table"));
    const hasIndexFlag =
      args.includes("-i") || args.some((arg) => arg.startsWith("--index"));

    // Validate that user explicitly provided required parameters
    if (!hasTableFlag) {
      throw ErrorFactory.args("Table name is required", [
        "Use -t or --table option to specify the target table",
        "Example: conductor upload -f data.csv -t users -i users-index",
        "Table name must be explicitly provided for data safety",
      ]);
    }

    if (!hasIndexFlag) {
      throw ErrorFactory.args("Index name is required", [
        "Use -i or --index option to specify the target index",
        "Example: conductor upload -f data.csv -t users -i users-index",
        "Index name must be explicitly provided for data safety",
      ]);
    }

    // Validate PostgreSQL configuration
    if (!config.postgresql) {
      throw ErrorFactory.args("PostgreSQL configuration is required", [
        "Provide PostgreSQL connection details",
        "Example: --db-host localhost:5435 --db-name mydb -t mytable",
      ]);
    }

    // Validate Elasticsearch configuration
    if (!config.elasticsearch) {
      throw ErrorFactory.args("Elasticsearch configuration is required", [
        "Provide Elasticsearch connection details",
        "Example: --es-host localhost:9200 -i my_index",
      ]);
    }

    // Validate files
    const fileValidationResult = await validateFiles(filePaths);
    if (!fileValidationResult.valid) {
      const errorDetails = fileValidationResult.errors.join("; ");
      throw ErrorFactory.invalidFile(
        `File validation failed: ${errorDetails}`,
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
    if (
      config.batchSize &&
      (isNaN(config.batchSize) || config.batchSize <= 0)
    ) {
      throw ErrorFactory.validation(
        "Invalid batch size specified",
        { batchSize: config.batchSize },
        [
          "Batch size must be a positive number",
          "Recommended range: 100-5000",
          "Use --batch-size option to specify batch size",
        ]
      );
    }
  }

}
