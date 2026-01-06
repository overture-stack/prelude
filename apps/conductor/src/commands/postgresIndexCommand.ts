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
import { sendBulkWriteRequest } from "../services/elasticsearch/bulk";
import { Pool, PoolClient } from "pg";
import Cursor from "pg-cursor";
import { Client } from "@elastic/elasticsearch";
import { createRecordMetadata } from "../services/csvProcessor/metadata";
import { createProgressBar } from "../services/csvProcessor/progressBar";
import { processCSVFileForPostgres } from "../services/csvProcessor/postgresProcessor";
import { validateFiles } from "../validations/fileValidator";

export class PostgresIndexCommand extends Command {
  constructor() {
    super("postgresIndex");
  }

  /**
   * Executes the full workflow: CSV upload to PostgreSQL + indexing to Elasticsearch
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { config, filePaths } = cliOutput;
    let pgClient: Pool | undefined;
    let esClient: Client | undefined;

    try {
      const hasFiles = filePaths && filePaths.length > 0;

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

      // Step 1: Upload CSV files to PostgreSQL if files are provided
      if (hasFiles) {
        await this.uploadFilesToPostgreSQL(filePaths, config, pgClient);
      }

      // Step 2: Index PostgreSQL data to Elasticsearch with streaming
      const result = await this.streamIndexToElasticsearch(
        pgClient,
        esClient,
        tableName,
        indexName,
        config.batchSize || 1000,
        config.pgReadChunkSize || 10000
      );

      if (result.totalProcessed === 0) {
        Logger.warn`No data found in table ${tableName}`;
        return {
          success: true,
          details: {
            recordsProcessed: 0,
            recordsIndexed: 0,
            message: `No data found in table ${tableName}`,
          },
        };
      }

      Logger.successString(
        `Indexing complete: ${result.totalIndexed} records indexed to ${indexName}`
      );

      return {
        success: true,
        details: {
          filesUploaded: hasFiles ? filePaths.length : 0,
          recordsProcessed: result.totalProcessed,
          recordsIndexed: result.totalIndexed,
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
    const { config, filePaths } = cliOutput;

    // Validate files if provided
    if (filePaths && filePaths.length > 0) {
      const fileValidationResult = await validateFiles(filePaths);
      if (!fileValidationResult.valid) {
        const errorDetails = fileValidationResult.errors.join("; ");
        throw ErrorFactory.invalidFile(
          `File validation failed ${errorDetails}`,
          undefined,
          fileValidationResult.errors.concat([
            "Check file extensions (.csv, .tsv allowed)",
            "Verify files exist and are accessible",
            "Ensure files are not empty",
          ])
        );
      }
    }

    // Validate PostgreSQL configuration
    if (!config.postgresql) {
      throw ErrorFactory.args("PostgreSQL configuration is required", [
        "Provide PostgreSQL connection details",
        "Example: --db-host localhost:5435 --db-name mydb -t mytable",
      ]);
    }

    if (!config.postgresql.table) {
      throw ErrorFactory.args("PostgreSQL table name is required", [
        "Use -t or --table option to specify the source table",
        "Example: -t demo_data",
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
   * Streams data from PostgreSQL and indexes to Elasticsearch in batches
   * Memory-efficient approach using cursors to avoid loading entire table into memory
   */
  private async streamIndexToElasticsearch(
    pgClient: Pool,
    esClient: Client,
    tableName: string,
    indexName: string,
    esBatchSize: number,
    pgReadChunkSize: number
  ): Promise<{ totalProcessed: number; totalIndexed: number }> {
    let totalProcessed = 0;
    let totalIndexed = 0;
    let failedRecords = 0;
    const startTime = Date.now();
    const processingStartTime = new Date().toISOString();

    // Get a dedicated client from the pool for cursor operations
    const client = await pgClient.connect();

    try {
      Logger.debug`PostgreSQL chunk size: ${pgReadChunkSize}, Elasticsearch batch size: ${esBatchSize}`;

      // Get total record count for accurate progress tracking
      Logger.debug`Counting total records in ${tableName}`;
      const countResult = await client.query(
        `SELECT COUNT(*) FROM ${tableName}`
      );
      const totalRecords = parseInt(countResult.rows[0].count, 10);

      console.log("");
      Logger.info`Indexing ${totalRecords} records from ${tableName} into ${indexName}`;

      // Create cursor for streaming data from PostgreSQL
      const cursor = client.query(new Cursor(`SELECT * FROM ${tableName}`));

      let buffer: any[] = [];
      let hasMoreRows = true;

      while (hasMoreRows) {
        // Read chunk from PostgreSQL
        const rows: any[] = await new Promise((resolve, reject) => {
          cursor.read(pgReadChunkSize, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });

        if (rows.length === 0) {
          hasMoreRows = false;
        } else {
          totalProcessed += rows.length;
          buffer.push(...rows);
        }

        // Process buffer when it reaches ES batch size or we've read all data
        while (
          buffer.length >= esBatchSize ||
          (!hasMoreRows && buffer.length > 0)
        ) {
          const batch = buffer.splice(0, esBatchSize);

          // Transform PostgreSQL records to Elasticsearch documents
          const esDocuments = batch.map((record, j) => {
            // Extract existing metadata from PostgreSQL record, or create new if missing
            let metadata;
            if (record.submission_metadata) {
              try {
                // Parse existing metadata from PostgreSQL (stored as JSON string)
                metadata = JSON.parse(record.submission_metadata);
              } catch (error) {
                Logger.debug`Failed to parse existing submission_metadata, creating new: ${error}`;
                metadata = createRecordMetadata(
                  `postgresql://${tableName}`,
                  processingStartTime,
                  totalIndexed + j + 1
                );
              }
            } else {
              // Create new metadata if none exists
              metadata = createRecordMetadata(
                `postgresql://${tableName}`,
                processingStartTime,
                totalIndexed + j + 1
              );
            }

            // Separate data from metadata columns
            const { submission_metadata, ...dataColumns } = record;

            // Structure the document with standardized format
            return {
              submission_metadata: metadata,
              data: dataColumns,
            };
          });

          // Send batch to Elasticsearch
          await sendBulkWriteRequest(
            esClient,
            esDocuments,
            indexName,
            (failureCount) => {
              failedRecords += failureCount;
            },
            {
              maxRetries: 3,
              refresh: false, // Don't refresh on each batch for performance
              writeErrorLog: true,
            }
          );

          totalIndexed += batch.length;

          // Update progress with accurate total
          this.updateProgressDisplay(totalIndexed, totalRecords, startTime);

          // If we've processed all remaining buffer and no more rows, exit
          if (buffer.length === 0 && !hasMoreRows) {
            break;
          }
        }
      }

      // Close cursor
      await new Promise<void>((resolve, reject) => {
        cursor.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Final refresh to make all data searchable
      Logger.debug`Refreshing index ${indexName}`;
      await esClient.indices.refresh({ index: indexName });

      // Add newline after progress bar
      if (totalIndexed > 0) {
        process.stdout.write("\n");
      }

      Logger.generic(`   └─ Indexed ${totalIndexed} records to ${indexName}`);

      if (failedRecords > 0) {
        Logger.warnString(
          `Indexing completed with ${failedRecords} failed records`
        );
      }

      return { totalProcessed, totalIndexed };
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
        "Failed to stream and index data",
        {
          tableName,
          indexName,
          totalProcessed,
          totalIndexed,
          failedRecords,
          originalError: error,
        },
        [
          "Check PostgreSQL and Elasticsearch connections",
          "Verify table exists and is accessible",
          "Review error logs for detailed information",
          "Ensure sufficient memory is available",
        ]
      );
    } finally {
      // Release the client back to the pool
      client.release();
    }
  }

  /**
   * Reads all data from a PostgreSQL table
   * @deprecated Use streamIndexToElasticsearch for memory-efficient processing
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
   * Enhanced with improved bulk operations and error handling
   */
  private async indexToElasticsearch(
    client: Client,
    data: any[],
    indexName: string,
    batchSize: number,
    sourceTable: string
  ): Promise<number> {
    let totalIndexed = 0;
    let failedRecords = 0;
    const startTime = Date.now();
    const processingStartTime = new Date().toISOString();

    try {
      Logger.info`Starting indexing of ${data.length} records to ${indexName}`;

      // Process data in batches
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        // Transform PostgreSQL records to Elasticsearch documents
        const esDocuments = batch.map((record, j) => {
          const recordId = record.id || `${i + j + 1}`;

          // Extract existing metadata from PostgreSQL record, or create new if missing
          let metadata;
          if (record.submission_metadata) {
            try {
              // Parse existing metadata from PostgreSQL (stored as JSON string)
              metadata = JSON.parse(record.submission_metadata);
            } catch (error) {
              Logger.debug`Failed to parse existing submission_metadata, creating new: ${error}`;
              metadata = createRecordMetadata(
                `postgresql://${sourceTable}`,
                processingStartTime,
                i + j + 1
              );
            }
          } else {
            // Create new metadata if none exists
            metadata = createRecordMetadata(
              `postgresql://${sourceTable}`,
              processingStartTime,
              i + j + 1
            );
          }

          // Separate data from metadata columns
          const { submission_metadata, ...dataColumns } = record;

          // Structure the document with standardized format
          return {
            submission_metadata: metadata,
            data: dataColumns,
          };
        });

        // Use enhanced bulk operations with error analysis
        await sendBulkWriteRequest(
          client,
          esDocuments,
          indexName,
          (failureCount) => {
            failedRecords += failureCount;
          },
          {
            maxRetries: 3,
            refresh: false, // Don't refresh on each batch for performance
            writeErrorLog: true,
          }
        );

        const successfulInBatch =
          batch.length -
          (failedRecords -
            (totalIndexed > 0 ? failedRecords - batch.length : 0));
        totalIndexed += Math.max(0, successfulInBatch);

        // Update progress
        this.updateProgressDisplay(i + batch.length, data.length, startTime);
      }

      // Final refresh to make all data searchable
      Logger.debug`Refreshing index ${indexName}`;
      await client.indices.refresh({ index: indexName });

      // Clear progress line and show summary
      process.stdout.write("\r" + " ".repeat(80) + "\r");

      if (failedRecords > 0) {
        Logger.warnString(
          `Indexing completed with ${failedRecords} failed records`
        );
        Logger.successString(
          `Successfully indexed ${totalIndexed} out of ${data.length} records`
        );
      } else {
        Logger.successString(
          `Successfully indexed all ${totalIndexed} records`
        );
      }

      return totalIndexed;
    } catch (error) {
      throw ErrorFactory.validation(
        "Failed to index data to Elasticsearch",
        {
          indexName,
          totalRecords: data.length,
          processedRecords: totalIndexed,
          failedRecords,
          originalError: error,
        },
        [
          "Check Elasticsearch connection and status",
          "Verify index permissions and mapping",
          "Review error logs for detailed information",
          "Ensure PostgreSQL data types match Elasticsearch field types",
        ]
      );
    }
  }

  /**
   * Updates progress display with enhanced formatting
   */
  private updateProgressDisplay(
    processed: number,
    total: number,
    startTime: number
  ): void {
    const elapsedMs = Math.max(1, Date.now() - startTime);
    const progress = Math.min(100, (processed / total) * 100);
    const progressBar = createProgressBar(progress, "blue");
    const recordsPerSecond = Math.round(processed / (elapsedMs / 1000));

    // Show progress every 1000 records, every 10% for small datasets, or when complete
    const showProgress =
      processed % 1000 === 0 ||
      processed === total ||
      (total < 1000 && processed % Math.max(1, Math.floor(total / 10)) === 0);

    if (showProgress) {
      // Clear the line first, then write new progress
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(
        `   └─ ${progressBar} ${processed}/${total} | ${recordsPerSecond} records/sec`
      );
    }
  }

  /**
   * This command accepts optional input files for full workflow
   */
  protected requiresInputFiles(): boolean {
    return false; // Files are optional
  }

  /**
   * Uploads CSV files to PostgreSQL table
   */
  private async uploadFilesToPostgreSQL(
    filePaths: string[],
    config: any,
    client: Pool
  ): Promise<void> {
    let successCount = 0;
    let failureCount = 0;

    for (const filePath of filePaths) {
      try {
        Logger.info`Processing file: ${filePath}`;
        await processCSVFileForPostgres(filePath, config, client);
        Logger.success`Successfully uploaded ${filePath} to PostgreSQL`;
        successCount++;
      } catch (error) {
        failureCount++;

        // Log the error but continue processing other files
        if (error instanceof Error && error.name === "ConductorError") {
          const conductorError = error as any;
          Logger.errorString(`${conductorError.message}`);
          if (
            conductorError.suggestions &&
            conductorError.suggestions.length > 0
          ) {
            Logger.suggestion("Suggestions");
            conductorError.suggestions.forEach((suggestion: string) => {
              Logger.tipString(suggestion);
            });
          }
        } else {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          Logger.errorString(`Failed to upload ${filePath}: ${errorMessage}`);
        }
      }
    }

    if (failureCount === 0) {
      Logger.successString(
        `Successfully uploaded all ${successCount} files to PostgreSQL`
      );
    } else if (successCount === 0) {
      throw ErrorFactory.validation(
        "All file uploads failed",
        { successCount, failureCount },
        [
          "Check PostgreSQL connection and table permissions",
          "Verify CSV file format and data types",
          "Review error messages above for specific issues",
        ]
      );
    } else {
      Logger.warnString(
        `Uploaded ${successCount} files successfully, ${failureCount} failed`
      );
      Logger.tipString(
        "Continuing with indexing using successfully uploaded data"
      );
    }
  }
}
