// src/services/postgresql/postgresProcessor.ts
/**
 * PostgreSQL CSV Processing Module
 *
 * Processes CSV files for PostgreSQL upload, similar to the Elasticsearch processor
 * but optimized for PostgreSQL bulk inserts.
 * Fails fast on header validation errors so processing stops before any rows are inserted.
 */

import * as fs from "fs";
import * as readline from "readline";
import { Pool } from "pg";
import { Config } from "../../types/cli";
import { validateAndCountCSVFile, parseCSVLine } from "../csvProcessor/csvParser";
import { Logger } from "../../utils/logger";
import { ConductorError, ErrorFactory } from "../../utils/errors";
import { CSVProcessingErrorHandler } from "../csvProcessor/logHandler";
import { sendBulkInsertRequest } from "./bulk";
import { updateProgressDisplay, finalizeProgressDisplay } from "../csvProcessor/progressBar";
import { createRecordMetadata } from "../csvProcessor/metadata";

/**
 * Processes a CSV file and inserts the data into PostgreSQL.
 *
 * @param filePath - Path to the CSV file to process
 * @param config - Configuration object
 * @param client - PostgreSQL Pool for database operations
 */
export async function processCSVFileForPostgres(
  filePath: string,
  config: Config,
  client: Pool,
  onBatchInserted?: (rows: object[]) => Promise<void>,
  onSkipped?: (totalSkipped: number) => void
): Promise<void> {
  let isFirstLine = true;
  let headers: string[] = [];
  let sortedDataHeaders: string[] = [];
  let processedRecords = 0;
  let failedRecords = 0;
  let skippedRecords = 0;
  const startTime = Date.now();
  const batchedRecords: object[] = [];

  try {
    const totalLines = await validateAndCountCSVFile(filePath);

    Logger.debug`Processing file: ${filePath}`;
    Logger.debugString(`Total data rows to process: ${totalLines}`);

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    try {
      for await (const line of rl) {
        try {
          if (isFirstLine) {
            // If header processing fails, throw immediately — don't continue
            headers = await processHeaderLine(line, config, client, filePath);

            // Add submission_metadata to headers if metadata is enabled
            if (config.postgresql?.addMetadata) {
              headers = [...headers, 'submission_metadata'];
            }

            // Sort data headers once here so every record reuses the same sorted key order
            sortedDataHeaders = headers.filter(h => h !== 'submission_metadata').sort();

            isFirstLine = false;
            continue;
          }

          // Rest of processing only happens if headers were validated successfully
          const record = await processDataLine(
            line,
            headers,
            config,
            filePath,
            processedRecords + 1,
            sortedDataHeaders
          );

          if (record) {
            batchedRecords.push(record);
            processedRecords++;

            // Update progress more frequently
            if (processedRecords % 10 === 0) {
              updateProgressDisplay(processedRecords, totalLines, startTime);
            }

            if (batchedRecords.length >= config.batchSize) {
              const batchNum = Math.ceil(processedRecords / config.batchSize);
              try {
                await sendBatchToPostgreSQL(
                  client,
                  batchedRecords,
                  config.postgresql!.table!,
                  headers,
                  filePath,
                  (count) => { failedRecords += count; },
                  (count) => { skippedRecords += count; onSkipped?.(skippedRecords); },
                  onBatchInserted
                );
              } catch (batchError) {
                const msg =
                  batchError instanceof Error
                    ? batchError.message
                    : String(batchError);
                Logger.warn`PostgreSQL upload — Batch ${batchNum} failed (${batchedRecords.length} records skipped)`;
                Logger.warnString(`  Reason: ${msg}`);
                failedRecords += batchedRecords.length;
              } finally {
                batchedRecords.length = 0;
              }
            }
          }
        } catch (lineError) {
          // Header validation errors must propagate — don't treat them as per-line errors
          if (isFirstLine) {
            throw lineError;
          }

          const msg =
            lineError instanceof Error ? lineError.message : String(lineError);
          Logger.warn`Record ${processedRecords + 1} skipped: ${msg}`;
          failedRecords++;
        }
      }

      // Process final batch
      if (batchedRecords.length > 0) {
        await sendBatchToPostgreSQL(
          client,
          batchedRecords,
          config.postgresql!.table!,
          headers,
          filePath,
          (count) => { failedRecords += count; },
          (count) => { skippedRecords += count; onSkipped?.(skippedRecords); },
          onBatchInserted
        );
      }

      // Ensure final progress is displayed, then advance cursor past all 3 reserved lines
      updateProgressDisplay(processedRecords, totalLines, startTime);
      finalizeProgressDisplay();

      // Print skipped summary only when the caller isn't managing display (no onSkipped callback)
      if (skippedRecords > 0 && !onSkipped) {
        Logger.generic(
          `   └─ Skipped ${skippedRecords} duplicate record(s) — already exists in "${config.postgresql!.table!}"`
        );
      }

      // Display final summary
      CSVProcessingErrorHandler.displaySummary(
        processedRecords,
        failedRecords,
        startTime
      );
    } finally {
      rl.close();
    }
  } catch (error) {
    // Header validation errors must propagate — don't swallow them in the generic CSV error handler
    if (error instanceof ConductorError) {
      if (error.details?.extraHeaders || error.details?.missingHeaders) {
        throw error;
      }
    }

    // Use the error handler for other processing errors
    CSVProcessingErrorHandler.handleProcessingError(
      error,
      processedRecords,
      isFirstLine,
      config.delimiter
    );
  }
}

/** Parses and validates the CSV header line against the target table schema. */
async function processHeaderLine(
  line: string,
  config: Config,
  client: Pool,
  filePath: string
): Promise<string[]> {
  try {
    const headerResult = parseCSVLine(line, config.delimiter, true);
    const headers = headerResult[0] || [];

    if (!headers || headers.length === 0) {
      throw ErrorFactory.parsing(
        "Failed to parse CSV headers",
        { line: line.substring(0, 100), delimiter: config.delimiter, filePath },
        [
          "Check if the first line contains valid headers",
          `Verify '${config.delimiter}' is the correct delimiter`,
          "Ensure headers are properly formatted",
        ]
      );
    }

    Logger.debug`Validating headers against table schema`;

    await validateHeadersAgainstTable(
      client,
      headers,
      config.postgresql!.table!
    );

    Logger.debug`Headers validated against table schema`;

    return headers;
  } catch (error) {
    if (error instanceof ConductorError) {
      throw error;
    }

    throw ErrorFactory.validation(
      "Header validation failed",
      { filePath, originalError: error },
      [
        "Check CSV header format and structure",
        "Ensure headers follow naming conventions",
        "Verify table schema compatibility",
      ]
    );
  }
}

/**
 * Process a data line of the CSV file
 */
async function processDataLine(
  line: string,
  headers: string[],
  config: Config,
  filePath: string,
  recordNumber: number,
  sortedDataHeaders?: string[]
): Promise<object | null> {
  try {
    if (line.trim() === "") {
      Logger.debug`Skipping empty line ${recordNumber}`;
      return null;
    }

    const rowValues = parseCSVLine(line, config.delimiter)[0] || [];

    if (rowValues.length === 0) {
      Logger.debug`Skipping line ${recordNumber} - no data parsed`;
      return null;
    }

    const record: Record<string, string | null> = {};
    headers.forEach((header, index) => {
      record[header] = rowValues[index] || null;
    });

    // Add metadata if configured
    if (config.postgresql?.addMetadata) {
      const metadata = createRecordMetadata(filePath, record, sortedDataHeaders);
      record.submission_metadata = JSON.stringify(metadata);
    }

    return record;
  } catch (error) {
    Logger.debug`Error processing data line ${recordNumber}: ${error}`;
    return null;
  }
}

/**
 * Validates CSV headers against PostgreSQL table structure
 */
async function validateHeadersAgainstTable(
  client: Pool,
  headers: string[],
  tableName: string
): Promise<void> {
  try {
    // Get table columns
    const result = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
       AND table_name = $1
       ORDER BY ordinal_position`,
      [tableName]
    );

    const tableColumns = result.rows.map((row: { column_name: string }) => row.column_name);

    Logger.debug`Table columns: ${tableColumns.join(", ")}`;
    Logger.debug`CSV headers: ${headers.join(", ")}`;

    // Filter out metadata columns from comparison
    const requiredColumns = tableColumns.filter(
      (col: string) => col !== "submission_metadata" && col !== "id"
    );

    // Check for missing headers
    const missingHeaders = requiredColumns.filter(
      (col: string) => !headers.includes(col)
    );

    // Check for extra headers
    const extraHeaders = headers.filter(
      (header: string) => !tableColumns.includes(header)
    );

    if (missingHeaders.length > 0 || extraHeaders.length > 0) {
      Logger.errorString("CSV headers do not match table structure");

      if (extraHeaders.length > 0) {
        Logger.suggestion("Extra headers (in CSV, not in table)");
        extraHeaders.forEach((header) => {
          Logger.generic(`   ▸ ${header}`);
        });
      }

      if (missingHeaders.length > 0) {
        Logger.suggestion(
          "Missing headers (required by table, missing from CSV)"
        );
        missingHeaders.forEach((header) => {
          Logger.generic(`   ▸ ${header}`);
        });
      }

      Logger.suggestion("Expected table columns");
      tableColumns.forEach((col: string) => {
        Logger.generic(`   ▸ ${col}`);
      });

      throw ErrorFactory.validation(
        "Header validation failed - CSV headers do not match table structure",
        {
          tableName,
          tableColumns,
          csvHeaders: headers,
          missingHeaders,
          extraHeaders,
        },
        [] // Empty suggestions since we already displayed them above
      );
    }

    Logger.debug`Headers match table structure perfectly`;
  } catch (error) {
    if (error instanceof ConductorError) {
      throw error;
    }

    throw ErrorFactory.connection(
      "Error validating headers against table structure",
      {
        tableName,
        originalError: error,
      },
      [
        "Check PostgreSQL connection and availability",
        "Verify table exists and you have access",
        "Ensure PostgreSQL service is running",
      ]
    );
  }
}

/**
 * Sends a batch of records to PostgreSQL
 */
async function sendBatchToPostgreSQL(
  client: Pool,
  records: object[],
  tableName: string,
  headers: string[],
  filePath: string,
  onFailure: (count: number) => void,
  onSkipped?: (count: number) => void,
  onInserted?: (rows: object[]) => Promise<void>
): Promise<void> {
  try {
    const insertedRows = await sendBulkInsertRequest(client, records, tableName, headers, onFailure, {}, onSkipped);
    if (onInserted && insertedRows.length > 0) {
      await onInserted(insertedRows);
    }
  } catch (error) {
    // If it's already a specific validation error, just rethrow it
    if (error instanceof ConductorError) {
      if (
        error.message.includes("constraint violation") ||
        error.message.includes("Bulk insert failed")
      ) {
        throw error;
      }
    }

    // For other unexpected errors, provide more appropriate suggestions
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT")
    ) {
      throw ErrorFactory.connection(
        "Failed to connect to PostgreSQL",
        {
          filePath,
          tableName,
          originalError: error,
        },
        [
          "Check that PostgreSQL is running",
          "Verify the connection details",
          "Check network connectivity",
        ]
      );
    }

    // For data validation errors, don't provide generic connection suggestions
    throw ErrorFactory.validation(
      "Data validation failed during upload",
      {
        filePath,
        tableName,
        originalError: error,
      },
      [
        "Check the data constraint issues shown above",
        "Fix your CSV data to match the table schema",
        "Review the error log for detailed information",
      ]
    );
  }
}