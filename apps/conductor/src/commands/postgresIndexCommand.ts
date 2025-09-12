// src/commands/postgresIndexCommand.ts
/**
 * PostgreSQL to Elasticsearch Index Command
 *
 * Reads data from PostgreSQL and indexes it to Elasticsearch.
 * UPDATED: Simplified metadata without status flags
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
          ]
        );
      }

      throw ErrorFactory.validation(
        `Failed to count records in table ${tableName}`,
        { tableName, originalError: error },
        ["Check PostgreSQL connection", "Verify table exists and is accessible"]
      );
    }
  }

  private async performStreamingIndex(
    pgClient: any,
    esClient: any,
    indexConfig: any,
    totalRecords: number
  ): Promise<number> {
    const { tableName, indexName, batchSize } = indexConfig;
    const startTime = Date.now();
    let offset = 0;
    let recordsIndexed = 0;

    try {
      while (offset < totalRecords) {
        const batch = await this.readBatch(
          pgClient,
          tableName,
          batchSize,
          offset
        );

        if (batch.length === 0) {
          break;
        }

        await this.indexBatchToElasticsearch(esClient, indexName, batch);

        recordsIndexed += batch.length;
        offset += batch.length;

        updateIndexingProgress(recordsIndexed, totalRecords, startTime);
      }

      console.log(""); // Newline after progress bar
      const duration = Date.now() - startTime;
      Logger.debug`Indexing completed in ${Math.round(duration / 1000)}s`;

      return recordsIndexed;
    } catch (error) {
      throw ErrorFactory.validation(
        "Failed during streaming index operation",
        { offset, recordsIndexed, originalError: error },
        [
          "Check connection stability",
          "Review batch size settings",
          "Verify data format compatibility",
        ]
      );
    }
  }

  private async readBatch(
    client: any,
    tableName: string,
    limit: number,
    offset: number
  ): Promise<any[]> {
    try {
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

      // Transform records - preserve existing metadata from PostgreSQL
      const transformedRecords = batch.map((row) => {
        // Parse existing metadata from PostgreSQL
        let existingMetadata = {};
        if (row.submission_metadata) {
          try {
            existingMetadata =
              typeof row.submission_metadata === "string"
                ? JSON.parse(row.submission_metadata)
                : row.submission_metadata;
          } catch (e) {
            Logger.debug`Could not parse existing metadata: ${e}`;
          }
        }

        // Remove submission_metadata from data to avoid duplication
        const { submission_metadata, ...cleanData } = row;

        return {
          submission_metadata: existingMetadata,
          data: cleanData,
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
      throw ErrorFactory.connection(
        `Elasticsearch indexing failed: ${errorMessage}`,
        { indexName, batchSize: batch.length, originalError: error },
        [
          "Check Elasticsearch connection",
          "Verify index mapping",
          "Review document structure",
        ]
      );
    }
  }
}
