// src/services/csvProcessor/postgresProcessor.ts
/**
 * PostgreSQL CSV Processing Module
 *
 * Processes CSV files for PostgreSQL upload with simplified submission metadata.
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
import { createSubmissionMetadata } from "./metadata";

/**
 * Processes a CSV file and inserts the data into PostgreSQL.
 */
export async function processCSVFileForPostgres(
  filePath: string,
  config: Config,
  client: Pool
): Promise<string> {
  let isFirstLine = true;
  let headers: string[] = [];
  let processedRecords = 0;
  let failedRecords = 0;
  const startTime = Date.now();
  const batchedRecords: object[] = [];
  const processingStartTime = new Date().toISOString();

  // Read file content once for hashing
  const fileContent = fs.readFileSync(filePath, "utf-8");
  let submissionId: string = "";

  try {
    // Validation logic
    if (!filePath || typeof filePath !== "string") {
      throw ErrorFactory.args("Invalid file path provided", [
        "Provide a valid file path",
        "Check file path parameter",
      ]);
    }

    if (!config.postgresql) {
      throw ErrorFactory.args("PostgreSQL configuration is required", [
        "Provide valid PostgreSQL configuration",
        "Check postgresql config in your configuration object",
      ]);
    }

    if (!fs.existsSync(filePath)) {
      throw ErrorFactory.file("CSV file not found", filePath, [
        "Check that the file exists",
        "Verify the file path is correct",
        "Ensure the file hasn't been moved or deleted",
      ]);
    }

    const totalLines = await countFileLines(filePath);
    if (totalLines === 0) {
      throw ErrorFactory.invalidFile(
        "CSV file contains no data rows",
        filePath,
        ["Ensure the file contains data beyond headers"]
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
            headers = await processHeaderLine(line, config, client, filePath);
            isFirstLine = false;
            continue;
          }

          const record = await processDataLine(
            line,
            headers,
            config,
            filePath,
            processingStartTime,
            processedRecords + 1,
            fileContent
          );

          if (record) {
            // Capture submission_id from first record
            if (!submissionId && record.submission_metadata) {
              const metadata = JSON.parse(record.submission_metadata);
              submissionId = metadata.submission_id;
            }

            batchedRecords.push(record);
            processedRecords++;

            if (processedRecords % 10 === 0) {
              updateUploadProgress(processedRecords, totalLines, startTime);
            }

            if (batchedRecords.length >= config.batchSize) {
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
              batchedRecords.length = 0;
            }
          }
        } catch (lineError) {
          if (isFirstLine) {
            throw lineError;
          }
          Logger.warnString(
            `Error processing line: ${line.substring(0, 50)}...`
          );
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

      updateUploadProgress(processedRecords, totalLines, startTime);
      CSVProcessingErrorHandler.displaySummary(
        processedRecords,
        failedRecords,
        startTime
      );

      return submissionId;
    } finally {
      rl.close();
    }
  } catch (error) {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }
    CSVProcessingErrorHandler.handleProcessingError(
      error,
      processedRecords,
      isFirstLine,
      config.delimiter
    );
    throw error; // Re-throw for caller
  }
}

/**
 * Process a data line - adds simplified submission metadata
 */
async function processDataLine(
  line: string,
  headers: string[],
  config: Config,
  filePath: string,
  processingStartTime: string,
  recordNumber: number,
  fileContent: string
): Promise<{ [key: string]: any } | null> {
  try {
    if (line.trim() === "") {
      return null;
    }

    const rowValues = parseCSVLine(line, config.delimiter)[0] || [];
    if (rowValues.length === 0) {
      return null;
    }

    // Create record object
    const record: any = {};
    headers.forEach((header, index) => {
      // Skip submission_metadata header since we'll add it separately
      if (header !== "submission_metadata") {
        record[header] = rowValues[index] || null;
      }
    });

    // Add simplified submission metadata
    const metadata = createSubmissionMetadata(
      filePath,
      processingStartTime,
      recordNumber,
      fileContent
    );
    record.submission_metadata = JSON.stringify(metadata);

    return record;
  } catch (error) {
    Logger.debug`Error processing data line ${recordNumber}: ${error}`;
    return null;
  }
}

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

    // Add submission_metadata to headers so it gets inserted into PostgreSQL
    headers.push("submission_metadata");

    await validateHeadersAgainstTable(
      client,
      headers,
      config.postgresql!.table
    );
    return headers;
  } catch (error) {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }
    throw ErrorFactory.validation(
      "Header validation failed",
      { filePath, originalError: error },
      ["Check CSV header format and structure"]
    );
  }
}

async function validateHeadersAgainstTable(
  client: Pool,
  headers: string[],
  tableName: string
): Promise<void> {
  try {
    const result = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = $1
       ORDER BY ordinal_position`,
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
        ["Verify the table name is correct", "Ensure the table exists"]
      );
    }

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
        `CSV headers missing required columns: ${requiredMissingColumns.join(
          ", "
        )}`,
        { tableName, missingColumns: requiredMissingColumns },
        ["Add missing columns to your CSV file"]
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }
    throw ErrorFactory.connection(
      "Error validating headers against table structure",
      { tableName, originalError: error },
      ["Check PostgreSQL connection and table access"]
    );
  }
}

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
    if (error instanceof Error && error.name === "ConductorError") {
      const conductorError = error as any;
      if (
        conductorError.message.includes("constraint violation") ||
        conductorError.message.includes("Bulk insert failed")
      ) {
        throw error;
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw ErrorFactory.connection(
      `PostgreSQL bulk insert failed: ${errorMessage}`,
      {
        tableName,
        recordCount: records.length,
        filePath,
        originalError: error,
      },
      [
        "Check PostgreSQL server status",
        "Verify table schema and constraints",
        "Review data format compatibility",
      ]
    );
  }
}
