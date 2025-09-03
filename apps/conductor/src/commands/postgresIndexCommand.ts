// src/commands/postgresIndexCommand.ts
/**
 * PostgreSQL to Elasticsearch Index Command - CLEAN & SIMPLE
 *
 * Reads data from PostgreSQL and indexes it to Elasticsearch.
 * UPDATED: Data structure now matches elasticsearch mapping expectations.
 * UPDATED: Using centralized progress display functions for indexing (cyan color)
 */

import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import { ConnectionManager } from "../services/connectionManager";
import {
  createPostgresClient,
  validateConnection as validatePostgresConnection,
} from "../services/postgresql";
import {
  createClientFromConfig,
  validateConnection as validateElasticsearchConnection,
} from "../services/elasticsearch";
import { createRecordMetadata } from "../services/csvProcessor/metadata";
import { updateIndexingProgress } from "../services/csvProcessor/progressBar";

export class IndexCommand extends Command {
  constructor() {
    super("index");
  }

  protected async validate(cliOutput: CLIOutput): Promise<void> {
    await super.validate(cliOutput);

    const { config } = cliOutput;

    if (!config.postgresql?.table) {
      throw ErrorFactory.args("PostgreSQL table name is required", [
        "Use -t <tableName> to specify source table",
      ]);
    }

    if (!config.elasticsearch?.index) {
      throw ErrorFactory.args("Elasticsearch index name is required", [
        "Use -i <indexName> to specify target index",
      ]);
    }
  }

  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const indexer = new PostgresToElasticsearchIndexer();
    return await indexer.index(cliOutput.config);
  }

  protected requiresInputFiles(): boolean {
    return false;
  }
}

/**
 * Handles the indexing process from PostgreSQL to Elasticsearch
 * Clean separation of concerns with focused methods
 * UPDATED: Using centralized progress display
 */
export class PostgresToElasticsearchIndexer {
  async index(config: any): Promise<CommandResult> {
    const connManager = new ConnectionManager();

    try {
      const pgClient = createPostgresClient(config);
      const esClient = createClientFromConfig(config);

      connManager.register(pgClient);

      await this.validateConnections(pgClient, esClient);

      const indexConfig = this.extractIndexConfig(config);

      const totalRecords = await this.getRecordCount(
        pgClient,
        indexConfig.tableName
      );

      if (totalRecords === 0) {
        Logger.warn`No data found in table ${indexConfig.tableName}`;
        return {
          success: true,
          details: {
            recordsProcessed: 0,
            message: "No data to index",
          },
        };
      }

      Logger.info`Indexing ${totalRecords} records: ${indexConfig.tableName} → ${indexConfig.indexName} in batches of ${indexConfig.batchSize}\n`;

      const recordsIndexed = await this.performStreamingIndex(
        pgClient,
        esClient,
        indexConfig,
        totalRecords
      );

      Logger.successString("Indexing completed successfully");
      Logger.generic(`  ▸ Records processed: ${totalRecords}`);
      Logger.generic(`  ▸ Records indexed: ${recordsIndexed}`);
      Logger.generic(`  ▸ Batch size: ${indexConfig.batchSize}`);

      return {
        success: true,
        details: {
          recordsProcessed: totalRecords,
          recordsIndexed,
          sourceTable: indexConfig.tableName,
          targetIndex: indexConfig.indexName,
          batchSize: indexConfig.batchSize,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      throw ErrorFactory.validation(
        `Indexing failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { originalError: error },
        [
          "Check PostgreSQL and Elasticsearch connections",
          "Verify table and index names are correct",
          "Review error details for specific issues",
        ]
      );
    } finally {
      await connManager.closeAll();
    }
  }

  private async validateConnections(
    pgClient: any,
    esClient: any
  ): Promise<void> {
    Logger.debug`Validating database connections`;

    try {
      await validatePostgresConnection(pgClient);
      Logger.debug`✓ PostgreSQL connection validated`;
    } catch (error) {
      throw ErrorFactory.connection("PostgreSQL connection failed", {
        originalError: error,
      });
    }

    try {
      await validateElasticsearchConnection(esClient);
      Logger.debug`✓ Elasticsearch connection validated`;
    } catch (error) {
      throw ErrorFactory.connection("Elasticsearch connection failed", {
        originalError: error,
      });
    }
  }

  private extractIndexConfig(config: any) {
    const tableName = config.postgresql.table;
    const indexName = config.elasticsearch.index;
    const batchSize = config.batchSize || 1000;

    Logger.debug`Index configuration: ${tableName} → ${indexName} (batch: ${batchSize})`;

    return { tableName, indexName, batchSize };
  }

  private async getRecordCount(
    client: any,
    tableName: string
  ): Promise<number> {
    try {
      const result = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
      return parseInt(result.rows[0].count, 10);
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
            "Ensure you have read permissions on the table",
          ]
        );
      }

      throw ErrorFactory.validation(
        `Failed to count records in table ${tableName}`,
        { tableName, originalError: error },
        [
          "Check PostgreSQL connection",
          "Verify table exists and is accessible",
          "Check your permissions on the table",
        ]
      );
    }
  }

  private async performStreamingIndex(
    pgClient: any,
    esClient: any,
    indexConfig: any,
    totalRecords: number
  ): Promise<number> {
    let totalIndexed = 0;
    let offset = 0;
    const { tableName, indexName, batchSize } = indexConfig;
    const startTime = Date.now();

    Logger.debug`Processing ${totalRecords} records in batches of ${batchSize}\n`;

    while (offset < totalRecords) {
      try {
        const batch = await this.readTableBatch(
          pgClient,
          tableName,
          offset,
          batchSize
        );

        if (batch.length === 0) {
          Logger.debug`No more records to process at offset ${offset}`;
          break;
        }

        await this.indexBatchToElasticsearch(esClient, indexName, batch);

        totalIndexed += batch.length;
        offset += batchSize;

        // Use centralized indexing progress (cyan color)
        updateIndexingProgress(totalIndexed, totalRecords, startTime);
      } catch (error) {
        Logger.error`Error processing batch at offset ${offset}: ${error}`;
        throw error;
      }
    }

    console.log(""); // Newline after progress bar
    const duration = Date.now() - startTime;
    Logger.debug`Indexing completed in ${Math.round(duration / 1000)}s`;

    return totalIndexed;
  }

  private async readTableBatch(
    client: any,
    tableName: string,
    offset: number,
    limit: number
  ): Promise<any[]> {
    try {
      Logger.debug`Reading batch: LIMIT ${limit} OFFSET ${offset}`;

      let result;
      try {
        result = await client.query(
          `SELECT * FROM ${tableName} ORDER BY id LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
      } catch (orderError) {
        const errorMsg =
          orderError instanceof Error ? orderError.message : String(orderError);

        if (errorMsg.includes('column "id" does not exist')) {
          Logger.debug`No 'id' column found, using unordered query`;
          result = await client.query(
            `SELECT * FROM ${tableName} LIMIT $1 OFFSET $2`,
            [limit, offset]
          );
        } else {
          throw orderError;
        }
      }

      return result.rows || [];
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
            "Ensure you have read permissions on the table",
          ]
        );
      }

      throw ErrorFactory.validation(
        `Failed to read batch from table ${tableName}`,
        { tableName, offset, limit, originalError: error },
        [
          "Check PostgreSQL connection",
          "Verify table exists and is accessible",
          "Check your permissions on the table",
        ]
      );
    }
  }

  private async indexBatchToElasticsearch(
    client: any,
    indexName: string,
    batch: any[]
  ): Promise<void> {
    try {
      const { sendBulkWriteRequest } = await import(
        "../services/elasticsearch"
      );

      // Transform records to match elasticsearch expectations
      const transformedRecords = batch.map((row) => {
        const processingStartTime = new Date().toISOString();
        const metadata = createRecordMetadata(
          `table:${indexName}`,
          processingStartTime,
          row.id || Math.random()
        );

        return {
          submission_metadata: metadata,
          data: row,
        };
      });

      await sendBulkWriteRequest(
        client,
        transformedRecords,
        indexName,
        () => {} // Simple error callback
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const isPerformanceError =
        errorMessage.includes("memory") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("heap");

      const suggestions = [
        "Check Elasticsearch connection and status",
        "Verify index permissions",
        "Review Elasticsearch logs for detailed errors",
      ];

      if (isPerformanceError) {
        suggestions.push(
          "Consider reducing batch size if encountering memory issues"
        );
      }

      throw ErrorFactory.validation(
        "Failed to index batch to Elasticsearch",
        {
          indexName,
          batchSize: batch.length,
          originalError: error,
        },
        suggestions
      );
    }
  }
}
