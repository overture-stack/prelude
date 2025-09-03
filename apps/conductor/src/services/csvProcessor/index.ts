// src/services/csvProcessor/index.ts
/**
 * Elasticsearch CSV Processing Module
 *
 * Processes CSV files and indexes the data into Elasticsearch.
 * Updated to use error factory pattern for consistent error handling.
 * UPDATED: Using centralized progress display functions for indexing (cyan color)
 */

import * as fs from "fs";
import * as readline from "readline";
import { Client } from "@elastic/elasticsearch";
import { Config } from "../../types";
import { countFileLines, parseCSVLine } from "./csvParser";
import { Logger } from "../../utils/logger";
import { ErrorFactory } from "../../utils/errors";
import {
  validateCSVStructure,
  validateHeadersMatchMappings,
} from "../../validations";
import { CSVProcessingErrorHandler } from "./logHandler";
import { sendBulkWriteRequest } from "../elasticsearch";
import { updateIndexingProgress } from "./progressBar";
import { createRecordMetadata } from "./metadata";

/**
 * Processes a CSV file and indexes the data into Elasticsearch.
 *
 * @param filePath - Path to the CSV file to process
 * @param config - Configuration object
 * @param client - Elasticsearch client for indexing
 */
export async function processCSVFile(
  filePath: string,
  config: Config,
  client: Client
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

    if (!client) {
      throw ErrorFactory.args("Elasticsearch client is required", [
        "Provide valid Elasticsearch client",
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

    // Get total lines upfront to avoid repeated calls
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
            processedRecords + 1
          );

          if (record) {
            batchedRecords.push(record);
            processedRecords++;

            // Update progress more frequently using centralized indexing function (cyan color)
            if (processedRecords % 10 === 0) {
              updateIndexingProgress(processedRecords, totalLines, startTime);
            }

            if (batchedRecords.length >= config.batchSize) {
              await sendBatchToElasticsearch(
                client,
                batchedRecords,
                config.elasticsearch.index,
                filePath,
                (count) => {
                  failedRecords += count;
                }
              );
              batchedRecords.length = 0;
            }
          }
        } catch (lineError) {
          // Handle individual line processing errors
          Logger.warnString(
            `Error processing line: ${line.substring(0, 50)}...`
          );
          Logger.debugString(`Line error: ${lineError}`);
          failedRecords++;
        }
      }

      // Process final batch
      if (batchedRecords.length > 0) {
        await sendBatchToElasticsearch(
          client,
          batchedRecords,
          config.elasticsearch.index,
          filePath,
          (count) => {
            failedRecords += count;
          }
        );
      }

      // Ensure final progress is displayed using centralized indexing function
      updateIndexingProgress(processedRecords, totalLines, startTime);

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
  client: Client,
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

    Logger.debug`Validating headers against the ${config.elasticsearch.index} mapping`;

    await validateCSVStructure(headers);
    Logger.debug`Headers validated against index mapping`;

    await validateHeadersMatchMappings(
      client,
      headers,
      config.elasticsearch.index
    );

    return headers;
  } catch (error) {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    throw ErrorFactory.validation(
      "Header validation failed",
      { filePath, originalError: error },
      [
        "Check CSV header format and structure",
        "Ensure headers follow naming conventions",
        "Verify Elasticsearch mapping compatibility",
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

    const metadata = createRecordMetadata(
      filePath,
      processingStartTime,
      recordNumber
    );

    const record = {
      submission_metadata: metadata,
      data: Object.fromEntries(headers.map((h, i) => [h, rowValues[i]])),
    };

    return record;
  } catch (error) {
    Logger.debug`Error processing data line ${recordNumber}: ${error}`;
    return null;
  }
}

/**
 * Sends a batch of records to Elasticsearch
 */
async function sendBatchToElasticsearch(
  client: Client,
  records: object[],
  indexName: string,
  filePath: string,
  onFailure: (count: number) => void
): Promise<void> {
  try {
    // Call with 4 parameters as expected by the function
    await sendBulkWriteRequest(client, records, indexName, onFailure);
  } catch (error) {
    // If it's already a specific data validation error, just rethrow it without adding generic suggestions
    if (error instanceof Error && error.name === "ConductorError") {
      const conductorError = error as any;

      // Check if this is a data validation error (from our bulk handler)
      if (
        conductorError.message.includes("Data type validation failed") ||
        conductorError.message.includes("Bulk indexing failed")
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
        "Failed to connect to Elasticsearch",
        {
          filePath,
          indexName,
          originalError: error,
        },
        [
          "Check that Elasticsearch is running",
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
        indexName,
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
