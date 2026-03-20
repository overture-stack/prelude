import * as fs from "fs";
import * as readline from "readline";
import { Client } from "@elastic/elasticsearch";
import { Config } from "../../types";
import { validateAndCountCSVFile, parseCSVLine } from "./csvParser";
import { Logger } from "../../utils/logger";
import { ConductorError, ErrorFactory } from "../../utils/errors";
import {
  validateCSVStructure,
  validateHeadersMatchMappings,
} from "../../validations";
import { CSVProcessingErrorHandler } from "./logHandler";
import { sendBulkWriteRequest } from "../elasticsearch";
import { updateProgressDisplay } from "./progressBar";
import { createRecordMetadata } from "./metadata";

/**
 * Processes a CSV file and indexes the data into Elasticsearch.
 * Updated to use error factory pattern for consistent error handling.
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
            headers = await processHeaderLine(line, config, client, filePath);
            isFirstLine = false;
            continue;
          }

          const record = await processDataLine(
            line,
            headers,
            config,
            filePath,
            processedRecords + 1
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
                await sendBatchToElasticsearch(
                  client,
                  batchedRecords,
                  config.elasticsearch.index,
                  filePath,
                  (count) => {
                    failedRecords += count;
                  }
                );
              } catch (batchError) {
                const msg =
                  batchError instanceof Error
                    ? batchError.message
                    : String(batchError);
                Logger.warn`Elasticsearch indexing — Batch ${batchNum} failed (${batchedRecords.length} records skipped)`;
                Logger.warnString(`  Reason: ${msg}`);
                failedRecords += batchedRecords.length;
              } finally {
                batchedRecords.length = 0;
              }
            }
          }
        } catch (lineError) {
          const msg =
            lineError instanceof Error ? lineError.message : String(lineError);
          Logger.warn`Record ${processedRecords + 1} skipped: ${msg}`;
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

      // Ensure final progress is displayed
      updateProgressDisplay(processedRecords, totalLines, startTime);

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
    if (error instanceof ConductorError) {
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
    if (error instanceof ConductorError) {
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

    const metadata = createRecordMetadata(filePath);

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
    await sendBulkWriteRequest(client, records as Record<string, unknown>[], indexName, onFailure);
  } catch (error) {
    // If it's already a specific data validation error, just rethrow it without adding generic suggestions
    if (error instanceof ConductorError) {
      if (
        error.message.includes("Data type validation failed") ||
        error.message.includes("Bulk indexing failed")
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
