// src/services/csvProcessor/postgresProcessor.ts
/**
 * PostgreSQL CSV Processing Module
 *
 * Processes CSV files for PostgreSQL upload, similar to the Elasticsearch processor
 * but optimized for PostgreSQL bulk inserts.
 * FIXED: Proper error handling to stop processing on header validation failures.
 * UPDATED: Using centralized progress display functions
 */

import * as fs from "fs";
import * as readline from "readline";
import { Pool } from "pg";
import { Config } from "../../types/cli";
import { countFileLines, parseCSVLine } from "./csvParser";
import { Logger } from "../../utils/logger";
import { ErrorFactory } from "../../utils/errors";
import { CSVProcessingErrorHandler } from "./logHandler";
import { sendBulkInsertRequest } from "../postgresql/bulk";
import { updateUploadProgress } from "./progressBar";
import { createRecordMetadata } from "./metadata";

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
  client: Pool
): Promise<void> {
  let isFirstLine = true;
  let headers: string[] = [];
  let processedRecords = 0;
  let failedRecords = 0;
  const startTime = Date.now();
  const batchedRecords: object[] = [];
  const processingStartTime = new Date().toISOString();

  try {
    // Validate inputs
    if (!filePath || typeof filePath !== "string") {
      throw ErrorFactory.args("Invalid file path provided", [
        "Provide a valid file path",
        "Check file path parameter",
      ]);
    }

    if (!config) {
      throw ErrorFactory.args("Configuration is required", [
        "Provide valid configuration object",
        "Check configuration setup",
      ]);
    }

    if (!config.postgresql) {
      throw ErrorFactory.args("PostgreSQL configuration is required", [
        "Provide valid PostgreSQL configuration",
        "Check postgresql config in your configuration object",
      ]);
    }

    if (!client) {
      throw ErrorFactory.args("PostgreSQL client is required", [
        "Provide valid PostgreSQL client",
        "Check client initialization",
      ]);
    }

    // Check file exists and is accessible
    if (!fs.existsSync(filePath)) {
      throw ErrorFactory.file("CSV file not found", filePath, [
        "Check that the file exists",
        "Verify the file path is correct",
        "Ensure the file hasn't been moved or deleted",
      ]);
    }

    // Check file permissions
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (error) {
      throw ErrorFactory.file("Cannot read CSV file", filePath, [
        "Check file permissions",
        "Ensure you have read access",
        "Try running with appropriate privileges",
      ]);
    }

    // Get total lines upfront
    const totalLines = await countFileLines(filePath);

    if (totalLines === 0) {
      throw ErrorFactory.invalidFile(
        "CSV file contains no data rows",
        filePath,
        [
          "Ensure the file contains data beyond headers",
          "Check if the file has at least one data row",
          "Verify the file format is correct",
        ]
      );
    }

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
            // FIXED: If header processing fails, throw immediately - don't continue
            headers = await processHeaderLine(line, config, client, filePath);
            isFirstLine = false;
            continue;
          }

          // Rest of processing only happens if headers were validated successfully
          const record = await processDataLine(
            line,
            headers,
            config,
            filePath,
            processingStartTime,
            processedRecords + 1
          );

          if (record) {
            batchedRecords.push(record);
            processedRecords++;

            // Update progress more frequently using centralized function
            if (processedRecords % 10 === 0) {
              updateUploadProgress(processedRecords, totalLines, startTime);
            }

            if (batchedRecords.length >= config.batchSize) {
              await sendBatchToPostgreSQL(
                client,
                batchedRecords,
                config.postgresql!.table, // Use non-null assertion since we validated above
                headers,
                filePath,
                (count) => {
                  failedRecords += count;
                }
              );
              batchedRecords.length = 0;
            }
          }
        } catch (lineError) {
          // FIXED: If this is a header validation error, don't treat it as a line processing error
          if (isFirstLine) {
            // Header validation failed - rethrow to stop processing entirely
            throw lineError;
          }

          // Handle individual line processing errors (not header errors)
          Logger.warnString(
            `Error processing line: ${line.substring(0, 50)}...`
          );
          Logger.debugString(`Line error: ${lineError}`);
          failedRecords++;
        }
      }

      // Process final batch
      if (batchedRecords.length > 0) {
        await sendBatchToPostgreSQL(
          client,
          batchedRecords,
          config.postgresql!.table,
          headers,
          filePath,
          (count) => {
            failedRecords += count;
          }
        );
      }

      // Ensure final progress is displayed
      updateUploadProgress(processedRecords, totalLines, startTime);

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
    // If it's already a ConductorError, rethrow it
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    // Use the error handler to process and throw the error
    CSVProcessingErrorHandler.handleProcessingError(
      error,
      processedRecords,
      isFirstLine,
      config.delimiter
    );
  }
}

/**
 * Process the header line of the CSV file
 */
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

    // FIXED: This validation should throw and stop processing if it fails
    await validateHeadersAgainstTable(
      client,
      headers,
      config.postgresql!.table
    );

    Logger.debug`Headers validated against table schema`;

    return headers;
  } catch (error) {
    // FIXED: Don't wrap header validation errors - let them bubble up to stop processing
    if (error instanceof Error && error.name === "ConductorError") {
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
  processingStartTime: string,
  recordNumber: number
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

    // Create a simple record object mapping headers to values
    const record: any = {};
    headers.forEach((header, index) => {
      record[header] = rowValues[index] || null;
    });

    // Add metadata if configured
    if (config.postgresql?.addMetadata) {
      const metadata = createRecordMetadata(
        filePath,
        processingStartTime,
        recordNumber
      );
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
    // Query table columns
    const result = await client.query(
      `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `,
      [tableName]
    );

    const tableColumns = result.rows.map((row) => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === "YES",
    }));

    if (tableColumns.length === 0) {
      throw ErrorFactory.validation(
        `Table '${tableName}' does not exist or has no columns`,
        { tableName },
        [
          "Verify the table name is correct",
          "Ensure the table exists in the database",
          "Check your database connection and permissions",
        ]
      );
    }

    // Check for missing required columns
    const tableColumnNames = tableColumns.map((col) => col.name.toLowerCase());
    const csvHeaderNames = headers.map((h) => h.toLowerCase());

    const missingColumns = tableColumnNames.filter(
      (colName) => !csvHeaderNames.includes(colName)
    );

    const requiredMissingColumns = missingColumns.filter((colName) => {
      const column = tableColumns.find(
        (col) => col.name.toLowerCase() === colName
      );
      return column && !column.nullable;
    });

    if (requiredMissingColumns.length > 0) {
      throw ErrorFactory.validation(
        `CSV headers are missing required table columns: ${requiredMissingColumns.join(
          ", "
        )}`,
        {
          tableName,
          missingColumns: requiredMissingColumns,
          csvHeaders: headers,
          tableColumns: tableColumnNames,
        },
        [
          "Add the missing columns to your CSV file",
          "Verify CSV headers match table schema",
          "Check column name spelling and case",
        ]
      );
    }

    Logger.debug`Header validation successful - CSV compatible with table schema`;
  } catch (error) {
    if (error instanceof Error && error.name === "ConductorError") {
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
  onFailure: (count: number) => void
): Promise<void> {
  try {
    await sendBulkInsertRequest(client, records, tableName, headers, onFailure);
  } catch (error) {
    // If it's already a specific validation error, just rethrow it
    if (error instanceof Error && error.name === "ConductorError") {
      const conductorError = error as any;

      // Check if this is a data validation error (from our bulk handler)
      if (
        conductorError.message.includes("constraint violation") ||
        conductorError.message.includes("Bulk insert failed")
      ) {
        // Rethrow without additional wrapping - the user already has specific info
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
          "Verify the service URL and port",
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
        "Check the data type issues shown above",
        "Fix your CSV data to match the expected types",
        "Review the error log for detailed information",
      ]
    );
  }
}
