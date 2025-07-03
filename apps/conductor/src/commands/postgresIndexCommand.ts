// src/commands/postgresIndexCommand.ts
/**
 * PostgreSQL to Elasticsearch Index Command - UPDATED for nested data structure
 *
 * Command implementation for reading data from a PostgreSQL table
 * and indexing it directly into Elasticsearch with proper nested data mapping.
 */

import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import {
  createPostgresClient,
  validateConnection as validatePostgresConnection,
} from "../services/postgresql";
import {
  createClientFromConfig,
  validateConnection as validateElasticsearchConnection,
} from "../services/elasticsearch";
import { Pool } from "pg";
import { Client } from "@elastic/elasticsearch";
import { createRecordMetadata } from "../services/csvProcessor/metadata";

export class PostgresIndexCommand extends Command {
  constructor() {
    super("postgresIndex");
  }

  /**
   * Executes the indexing process from PostgreSQL to Elasticsearch
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { config } = cliOutput;
    let pgClient: Pool | undefined;
    let esClient: Client | undefined;

    try {
      Logger.info`Starting PostgreSQL to Elasticsearch indexing`;

      // Set up clients
      pgClient = createPostgresClient(config);
      esClient = createClientFromConfig(config);

      // Validate connections
      Logger.info`Validating PostgreSQL connection`;
      await validatePostgresConnection(pgClient);

      Logger.info`Validating Elasticsearch connection`;
      await validateElasticsearchConnection(esClient);

      // Get table data
      const tableName = config.postgresql!.table;
      const indexName = config.elasticsearch!.index;

      Logger.info`Reading data from PostgreSQL table: ${tableName}`;
      const tableData = await this.readTableData(pgClient, tableName);

      if (tableData.length === 0) {
        Logger.warn`No data found in table ${tableName}`;
        return {
          success: true,
          details: {
            recordsProcessed: 0,
            message: "No data to index",
          },
        };
      }

      Logger.info`Found ${tableData.length} records in table ${tableName}`;

      // Transform and index data to Elasticsearch with proper nested structure
      Logger.info`Indexing data to Elasticsearch index: ${indexName}`;
      const indexedCount = await this.indexToElasticsearch(
        esClient,
        tableData,
        indexName,
        config.batchSize || 1000,
        tableName
      );

      Logger.successString("Indexing completed successfully");
      Logger.generic(`  ▸ Total Records processed: ${tableData.length}`);
      Logger.generic(`  ▸ Records Successfully indexed: ${indexedCount}`);

      return {
        success: true,
        details: {
          recordsProcessed: tableData.length,
          recordsIndexed: indexedCount,
          sourceTable: tableName,
          targetIndex: indexName,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw ErrorFactory.validation(
        `Indexing failed: ${errorMessage}`,
        { originalError: error },
        [
          "Check PostgreSQL and Elasticsearch connections",
          "Verify table and index names are correct",
          "Review error details for specific issues",
        ]
      );
    } finally {
      // Clean up connections
      if (pgClient) {
        try {
          Logger.debug`Closing PostgreSQL connection pool`;
          await pgClient.end();
        } catch (closeError) {
          Logger.debug`Warning: Error closing PostgreSQL connection: ${closeError}`;
        }
      }

      // Force exit after cleanup
      setTimeout(() => {
        process.exit(0);
      }, 500);
    }
  }

  /**
   * Validates command line arguments and configuration
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { config } = cliOutput;

    // Validate PostgreSQL configuration
    if (!config.postgresql) {
      throw ErrorFactory.args("PostgreSQL configuration is required", [
        "Provide PostgreSQL connection details",
        "Example: --host localhost --database mydb --table mytable",
      ]);
    }

    if (!config.postgresql.table) {
      throw ErrorFactory.args("PostgreSQL table name is required", [
        "Use --table option to specify the source table",
        "Example: --table demo_data",
      ]);
    }

    // Validate Elasticsearch configuration
    if (!config.elasticsearch) {
      throw ErrorFactory.args("Elasticsearch configuration is required", [
        "Provide Elasticsearch connection details",
        "Example: --url http://localhost:9200 --index my_index",
      ]);
    }

    if (!config.elasticsearch.index) {
      throw ErrorFactory.args("Elasticsearch index name is required", [
        "Use --index option to specify the target index",
        "Example: --index demo_data_index",
      ]);
    }
  }

  /**
   * Reads all data from a PostgreSQL table
   */
  private async readTableData(client: Pool, tableName: string): Promise<any[]> {
    try {
      Logger.debug`Executing query: SELECT * FROM ${tableName}`;

      const result = await client.query(`SELECT * FROM ${tableName}`);

      Logger.debug`Query returned ${result.rows.length} rows`;
      return result.rows;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("relation") &&
        errorMessage.includes("does not exist")
      ) {
        throw ErrorFactory.invalidFile(
          `Table "${tableName}" does not exist`,
          tableName,
          [
            "Check that the table name is correct",
            "Verify the table exists in the specified database",
            "Make sure you have read permissions on the table",
          ]
        );
      }

      throw ErrorFactory.validation(
        `Failed to read data from table ${tableName}`,
        { tableName, originalError: error },
        [
          "Check PostgreSQL connection",
          "Verify table exists and is accessible",
          "Check your permissions on the table",
        ]
      );
    }
  }

  /**
   * Indexes data to Elasticsearch in batches with proper nested data structure
   * UPDATED: Now wraps data in the 'data' object as required by the mapping
   */
  private async indexToElasticsearch(
    client: Client,
    data: any[],
    indexName: string,
    batchSize: number,
    sourceTable: string
  ): Promise<number> {
    let totalIndexed = 0;
    const startTime = Date.now();
    const processingStartTime = new Date().toISOString();

    try {
      // Process data in batches
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        // Prepare bulk index operations with proper nested structure
        const bulkOps = [];
        for (let j = 0; j < batch.length; j++) {
          const record = batch[j];
          const recordId = record.id || `${i + j + 1}`;

          // Create metadata for this record
          const metadata = createRecordMetadata(
            `postgresql://${sourceTable}`,
            processingStartTime,
            i + j + 1
          );

          // IMPORTANT: Structure the document to match your Elasticsearch mapping
          // All actual data goes into the 'data' object, metadata as sibling
          const esDocument = {
            data: {
              ...record, // All PostgreSQL table columns go here
              submission_metadata: metadata, // Add metadata within data object
            },
          };

          // Add the index operation
          bulkOps.push({
            index: {
              _index: indexName,
              _id: recordId,
            },
          });
          bulkOps.push(esDocument);
        }

        // Execute bulk index
        const response = await client.bulk({
          refresh: false,
          body: bulkOps,
        });

        // Check for errors
        if (response.body.errors) {
          const errorItems = response.body.items.filter(
            (item: any) => item.index && item.index.error
          );

          if (errorItems.length > 0) {
            Logger.warnString(
              `${errorItems.length} documents failed to index in this batch`
            );
            errorItems.forEach((item: any) => {
              Logger.debug`Index error: ${JSON.stringify(item.index.error)}`;
            });
          }
        }

        const successfulItems = response.body.items.filter(
          (item: any) => item.index && !item.index.error
        );

        totalIndexed += successfulItems.length;

        // Update progress
        this.updateProgress(i + batch.length, data.length, startTime);
      }

      // Refresh index to make data searchable
      await client.indices.refresh({ index: indexName });

      console.log(""); // New line after progress
      return totalIndexed;
    } catch (error) {
      throw ErrorFactory.validation(
        "Failed to index data to Elasticsearch",
        { indexName, originalError: error },
        [
          "Check Elasticsearch connection and status",
          "Verify index permissions",
          "Review Elasticsearch logs for detailed errors",
          "Ensure the index mapping supports the nested data structure",
        ]
      );
    }
  }

  /**
   * Updates progress display
   */
  private updateProgress(
    processed: number,
    total: number,
    startTime: number
  ): void {
    const elapsedMs = Date.now() - startTime;
    const progress = Math.min(100, (processed / total) * 100);
    const progressBar = this.createProgressBar(progress);
    const recordsPerSecond = Math.round(processed / (elapsedMs / 1000));

    process.stdout.write(
      `\r ${progressBar} | ${processed}/${total} | ⚡${recordsPerSecond} records/sec`
    );
  }

  /**
   * Creates a visual progress bar
   */
  private createProgressBar(percentage: number): string {
    const width = 30;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return `${"█".repeat(filled)}${"░".repeat(empty)} ${percentage.toFixed(
      1
    )}%`;
  }

  /**
   * This command doesn't require input files
   */
  protected requiresInputFiles(): boolean {
    return false;
  }
}
