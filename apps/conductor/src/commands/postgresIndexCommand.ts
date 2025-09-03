// src/commands/indexCommand.ts
/**
 * PostgreSQL to Elasticsearch Index Command - UPDATED for nested data structure
 *
 * Command implementation for reading data from a PostgreSQL table
 * and indexing it directly into Elasticsearch with proper nested data mapping.
 * FIXED: Memory-efficient streaming processing for large datasets
 * UPDATED: Respects user-specified batch size consistently
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
import {
  formatDuration,
  calculateETA,
} from "../services/csvProcessor/progressBar";
import chalk from "chalk";

export class IndexCommand extends Command {
  constructor() {
    super("index");
  }

  /**
   * Executes the indexing process from PostgreSQL to Elasticsearch
   * UPDATED: Uses user-specified batch size consistently
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { config } = cliOutput;
    let pgClient: Pool | undefined;
    let esClient: Client | undefined;

    try {
      Logger.debug`Starting PostgreSQL to Elasticsearch indexing`;

      // Set up clients
      pgClient = createPostgresClient(config);
      esClient = createClientFromConfig(config);

      // Validate connections
      Logger.debug`Validating PostgreSQL connection`;
      await validatePostgresConnection(pgClient);

      Logger.debug`Validating Elasticsearch connection`;
      await validateElasticsearchConnection(esClient);

      // Get table info
      const tableName = config.postgresql!.table;
      const indexName = config.elasticsearch!.index;
      const batchSize = config.batchSize || 1000;

      Logger.info`Reading data from PostgreSQL table: ${tableName}`;

      // Get total record count first to avoid memory issues
      const totalRecords = await this.getTableRecordCount(pgClient, tableName);

      if (totalRecords === 0) {
        Logger.warn`No data found in table ${tableName}`;
        return {
          success: true,
          details: {
            recordsProcessed: 0,
            message: "No data to index",
          },
        };
      }

      Logger.info`Found ${totalRecords} records in table ${tableName}`;

      // Log batch size info for transparency
      if (totalRecords > 100000) {
        Logger.info`Large dataset detected (${totalRecords} records) - using batch size: ${batchSize}`;
        Logger.info`Note: Large batch sizes may require more Elasticsearch memory`;
      }

      Logger.info`Indexing data to Elasticsearch index: ${indexName}\n`;

      // Process data in chunks instead of loading all into memory
      // FIXED: Use the actual user-specified batch size
      const indexedCount = await this.indexToElasticsearchStreamed(
        pgClient,
        esClient,
        tableName,
        indexName,
        batchSize, // Use original batch size, not overridden
        totalRecords
      );

      Logger.successString("Indexing completed successfully");
      Logger.generic(`  ▸ Total Records processed: ${totalRecords}`);
      Logger.generic(`  ▸ Records Successfully indexed: ${indexedCount}`);
      Logger.generic(`  ▸ Batch size used: ${batchSize}`);

      return {
        success: true,
        details: {
          recordsProcessed: totalRecords,
          recordsIndexed: indexedCount,
          sourceTable: tableName,
          targetIndex: indexName,
          batchSize: batchSize,
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
          "If using large batch sizes, consider reducing batch size if you encounter memory issues",
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

      // Only force exit if running as standalone command
      const isStandalone =
        process.argv[2] === "index" || process.argv[2] === "INDEX";

      if (isStandalone) {
        setTimeout(() => {
          process.exit(0);
        }, 500);
      }
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

    // Validate batch size with PostgreSQL context since we're reading from PostgreSQL
    this.validateBatchSize(config.batchSize);
  }

  /**
   * Validates batch size with PostgreSQL-specific warnings for indexing operations
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
          "Recommended range: 100–5000 for PostgreSQL indexing",
          "Example: --batch-size 1000",
        ]
      );
    }

    // Single, consolidated PostgreSQL batch size warning
    if (batchSize >= 10000) {
      Logger.warnString(
        `Batch size ${batchSize} is extremely large and may cause PostgreSQL connection timeouts during indexing`
      );
      Logger.tipString(
        "Recommended: Use 1000-5000 for reliable PostgreSQL performance"
      );
    } else if (batchSize > 5000) {
      Logger.warnString(
        `Batch size ${batchSize} is large and may impact PostgreSQL performance`
      );
      Logger.tipString(
        "Consider reducing to 2000-5000 if you encounter issues"
      );
    } else if (batchSize > 2000) {
      Logger.infoString(
        `Using indexing batch size: ${batchSize} (higher than default)`
      );
    } else {
      Logger.debug`Indexing batch size validated: ${batchSize}`;
    }
  }

  /**
   * Gets total record count from a PostgreSQL table
   */
  private async getTableRecordCount(
    client: Pool,
    tableName: string
  ): Promise<number> {
    try {
      Logger.debug`Getting record count for table: ${tableName}`;

      const result = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
      const count = parseInt(result.rows[0].count);

      Logger.debug`Table ${tableName} has ${count} records`;
      return count;
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

  /**
   * Indexes data to Elasticsearch in streaming batches to handle large datasets
   * UPDATED: Uses user-specified batch size consistently, with informative logging
   */
  private async indexToElasticsearchStreamed(
    pgClient: Pool,
    esClient: Client,
    tableName: string,
    indexName: string,
    batchSize: number,
    totalRecords: number
  ): Promise<number> {
    let totalIndexed = 0;
    let processedRecords = 0;
    const startTime = Date.now();
    const processingStartTime = new Date().toISOString();

    // FIXED: Use the user-specified batch size directly
    // No more automatic overriding - respect user choice
    Logger.debug`Using user-specified batch size: ${batchSize} for ${totalRecords} records`;

    // Provide helpful guidance for large datasets without forcing changes
    if (totalRecords > 100000 && batchSize > 2000) {
      Logger.warn`Large dataset (${totalRecords} records) with large batch size (${batchSize})`;
      Logger.warn`Monitor Elasticsearch memory usage - consider reducing batch size if errors occur`;
    }

    try {
      // Process data in chunks using LIMIT/OFFSET to avoid memory issues
      for (let offset = 0; offset < totalRecords; offset += batchSize) {
        // Fetch batch from PostgreSQL
        Logger.debug`Fetching batch: OFFSET ${offset} LIMIT ${batchSize}`;

        const batchData = await this.readTableDataBatch(
          pgClient,
          tableName,
          offset,
          batchSize
        );

        if (batchData.length === 0) {
          Logger.debug`No more data to process`;
          break;
        }

        // Prepare bulk index operations with proper nested structure
        const bulkOps = [];
        for (let j = 0; j < batchData.length; j++) {
          const record = batchData[j];
          const recordId = record.id || `${offset + j + 1}`;

          // Create metadata for this record
          const metadata = createRecordMetadata(
            `postgresql://${tableName}`,
            processingStartTime,
            offset + j + 1
          );

          // Structure the document to match your Elasticsearch mapping
          const esDocument = {
            data: {
              ...record,
              submission_metadata: metadata,
            },
          };

          bulkOps.push({
            index: {
              _index: indexName,
              _id: recordId,
            },
          });
          bulkOps.push(esDocument);
        }

        // Execute bulk index with dynamic timeout based on batch size
        const timeout = Math.max(30, Math.ceil(batchSize / 100)) + "s";
        const response = await esClient.bulk({
          refresh: false,
          body: bulkOps,
          timeout: timeout, // Dynamic timeout based on batch size
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
        processedRecords += batchData.length;

        // Update progress
        this.updateProgress(processedRecords, totalRecords, startTime);

        // REMOVED: Automatic delay - let user control performance vs speed
        // Users can adjust batch size if they need to control load on Elasticsearch
      }

      // Refresh index to make data searchable
      await esClient.indices.refresh({ index: indexName });

      console.log(""); // New line after progress
      return totalIndexed;
    } catch (error) {
      // Enhanced error message with batch size context
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check if it's a memory/performance related error
      const isPerformanceError =
        errorMessage.includes("memory") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("heap");

      const suggestions = [
        "Check Elasticsearch connection and status",
        "Verify index permissions",
        "Review Elasticsearch logs for detailed errors",
        "Ensure the index mapping supports the nested data structure",
      ];

      if (isPerformanceError) {
        suggestions.push(
          `Consider reducing batch size from ${batchSize} if encountering memory issues`
        );
      }

      throw ErrorFactory.validation(
        "Failed to index data to Elasticsearch",
        { indexName, batchSize, totalRecords, originalError: error },
        suggestions
      );
    }
  }

  /**
   * Reads a batch of data from a PostgreSQL table using LIMIT/OFFSET
   */
  private async readTableDataBatch(
    client: Pool,
    tableName: string,
    offset: number,
    limit: number
  ): Promise<any[]> {
    try {
      Logger.debug`Executing batch query: SELECT * FROM ${tableName} LIMIT ${limit} OFFSET ${offset}`;

      // Try with ORDER BY id first
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
          Logger.debug`No id column, using unordered query`;
          result = await client.query(
            `SELECT * FROM ${tableName} LIMIT $1 OFFSET $2`,
            [limit, offset]
          );
        } else {
          throw orderError;
        }
      }

      Logger.debug`Batch query returned ${result.rows.length} rows`;
      return result.rows;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      throw ErrorFactory.validation(
        `Failed to read batch data from table ${tableName}`,
        { tableName, offset, limit, originalError: error },
        [
          "Check PostgreSQL connection",
          "Verify table exists and is accessible",
          "Check your permissions on the table",
        ]
      );
    }
  }

  /**
   * Updates progress display using shared utilities but with cyan styling
   */
  private updateProgress(
    processed: number,
    total: number,
    startTime: number
  ): void {
    const elapsedMs = Math.max(1, Date.now() - startTime);
    const progress = Math.min(100, (processed / total) * 100);
    const progressBar = this.createCyanProgressBar(progress);
    const eta = calculateETA(processed, total, elapsedMs / 1000);
    const recordsPerSecond = Math.round(processed / (elapsedMs / 1000));

    if (processed === 10) {
      Logger.generic("");
    }

    // Use \r to overwrite previous line
    process.stdout.write("\r");
    process.stdout.write(
      ` ${progressBar} | ` +
        `${processed}/${total} | ` +
        `⏱ ${formatDuration(elapsedMs)} | ` +
        `🏁 ${eta} | ` +
        `⚡${recordsPerSecond} records/sec`
    );
  }

  /**
   * Creates a cyan-colored visual progress bar (modified from shared utility)
   */
  private createCyanProgressBar(progress: number, width: number = 30): string {
    try {
      // Validate and normalize inputs
      if (!isFinite(progress) || !isFinite(width)) {
        return chalk.yellow("[Invalid progress value]");
      }

      // Clamp progress between 0 and 100
      const normalizedProgress = Math.max(0, Math.min(100, progress || 0));
      // Ensure width is reasonable
      const normalizedWidth = Math.max(10, Math.min(100, width));

      // Calculate bar segments
      const filledWidth = Math.round(
        normalizedWidth * (normalizedProgress / 100)
      );
      const emptyWidth = normalizedWidth - filledWidth;

      // Create bar segments with cyan coloring instead of green
      const filledBar = chalk.cyan("█").repeat(Math.max(0, filledWidth));
      const emptyBar = chalk.gray("░").repeat(Math.max(0, emptyWidth));

      // Return formatted progress bar with cyan percentage
      return `${filledBar}${emptyBar} ${chalk.cyan(
        normalizedProgress.toFixed(1) + "%"
      )}`;
    } catch (error) {
      return chalk.yellow("[Progress calculation error]");
    }
  }

  /**
   * This command doesn't require input files
   */
  protected requiresInputFiles(): boolean {
    return false;
  }
}
