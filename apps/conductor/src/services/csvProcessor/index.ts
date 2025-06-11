// src/services/csvProcessor/index.ts - Enhanced with ErrorFactory patterns
import * as fs from "fs";
import * as readline from "readline";
import { Client } from "@elastic/elasticsearch";
import { Config } from "../../types";
import { countFileLines, parseCSVLine } from "./csvParser";
import { Logger } from "../../utils/logger";
import {
  validateCSVStructure,
  validateHeadersMatchMappings,
} from "../../validations";
import { ErrorFactory } from "../../utils/errors";
import { CSVProcessingErrorHandler } from "./logHandler";
import { sendBulkWriteRequest } from "../elasticsearch";
import { formatDuration, calculateETA, createProgressBar } from "./progressBar";
import { createRecordMetadata } from "./metadata";

/**
 * Processes a CSV file and indexes the data into Elasticsearch.
 * Enhanced with ErrorFactory patterns for better error handling.
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

  // Enhanced file validation
  if (!fs.existsSync(filePath)) {
    throw ErrorFactory.file(`CSV file not found: ${filePath}`, filePath, [
      "Check that the file path is correct",
      "Ensure the file exists at the specified location",
      "Verify file permissions allow read access",
      `Current directory: ${process.cwd()}`,
    ]);
  }

  // Get total lines upfront to avoid repeated calls
  let totalLines: number;
  try {
    totalLines = await countFileLines(filePath);
  } catch (error) {
    throw ErrorFactory.file(
      `Failed to count lines in CSV file: ${filePath}`,
      filePath,
      [
        "Check file is not corrupted",
        "Verify file permissions allow read access",
        "Ensure file is not locked by another process",
        "Try copying the file to a different location",
      ]
    );
  }

  if (totalLines === 0) {
    throw ErrorFactory.csv(
      `CSV file is empty: ${filePath}`,
      filePath,
      undefined,
      [
        "Ensure the file contains data",
        "Check if the file was properly created",
        "Verify the file is not corrupted",
        "CSV files must have at least a header row",
      ]
    );
  }

  Logger.info`Processing file: ${filePath}`;

  let fileStream: fs.ReadStream;
  let rl: readline.Interface;

  try {
    fileStream = fs.createReadStream(filePath);
    rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });
  } catch (error) {
    throw ErrorFactory.file(
      `Failed to open CSV file for reading: ${filePath}`,
      filePath,
      [
        "Check file permissions allow read access",
        "Ensure file is not locked by another process",
        "Verify file is not corrupted",
        "Try copying the file to a different location",
      ]
    );
  }

  try {
    for await (const line of rl) {
      try {
        if (isFirstLine) {
          // Enhanced header processing
          try {
            const headerResult = parseCSVLine(line, config.delimiter, true);
            headers = headerResult[0] || [];

            if (headers.length === 0) {
              throw ErrorFactory.csv(
                `No headers found in CSV file: ${filePath}`,
                filePath,
                1,
                [
                  "Ensure the first row contains column headers",
                  "Check that the delimiter is correct",
                  "Verify the file format is valid CSV",
                  `Current delimiter: '${config.delimiter}'`,
                ]
              );
            }

            Logger.info`Validating headers against the ${config.elasticsearch.index} mapping`;
            await validateCSVStructure(headers);
            Logger.info`Headers validated against index mapping`;
            await validateHeadersMatchMappings(
              client,
              headers,
              config.elasticsearch.index
            );
            isFirstLine = false;

            Logger.generic(`\n Processing data into elasticsearch...\n`);
            continue;
          } catch (error) {
            if (error instanceof Error && error.name === "ConductorError") {
              throw error;
            }

            throw ErrorFactory.csv(
              `Failed to process CSV headers: ${
                error instanceof Error ? error.message : String(error)
              }`,
              filePath,
              1,
              [
                "Check that the first row contains valid column headers",
                "Verify the CSV delimiter is correct",
                "Ensure headers follow naming conventions",
                "Check file encoding (should be UTF-8)",
              ]
            );
          }
        }

        // Enhanced row processing
        let rowValues: string[];
        try {
          const parseResult = parseCSVLine(line, config.delimiter);
          rowValues = parseResult[0] || [];
        } catch (error) {
          Logger.warn`Error parsing line ${
            processedRecords + 1
          }: ${line.substring(0, 50)}`;
          failedRecords++;
          continue;
        }

        // Enhanced record creation
        try {
          const metadata = createRecordMetadata(
            filePath,
            processingStartTime,
            processedRecords + 1
          );
          const record = {
            submission_metadata: metadata,
            data: Object.fromEntries(headers.map((h, i) => [h, rowValues[i]])),
          };

          batchedRecords.push(record);
          processedRecords++;

          // Update progress more frequently
          if (processedRecords % 10 === 0) {
            updateProgressDisplay(
              processedRecords,
              totalLines - 1, // Subtract 1 to account for header
              startTime
            );
          }

          if (batchedRecords.length >= config.batchSize) {
            await sendBatchToElasticsearch(
              client,
              batchedRecords,
              config.elasticsearch.index,
              (count) => {
                failedRecords += count;
              }
            );
            batchedRecords.length = 0;
          }
        } catch (error) {
          Logger.warn`Error processing record ${processedRecords + 1}: ${
            error instanceof Error ? error.message : String(error)
          }`;
          failedRecords++;
        }
      } catch (lineError) {
        // Handle individual line processing errors
        Logger.warn`Error processing line: ${line.substring(0, 50)}`;
        failedRecords++;
      }
    }

    // Final batch and progress update
    if (batchedRecords.length > 0) {
      await sendBatchToElasticsearch(
        client,
        batchedRecords,
        config.elasticsearch.index,
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
  } catch (error) {
    // Enhanced cleanup
    try {
      rl.close();
    } catch (closeError) {
      Logger.debug`Error closing readline interface: ${closeError}`;
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
 * Updates the progress display in the console
 *
 * @param processed - Number of processed records
 * @param total - Total number of records
 * @param startTime - When processing started
 */
function updateProgressDisplay(
  processed: number,
  total: number,
  startTime: number
): void {
  const elapsedMs = Math.max(1, Date.now() - startTime);
  const progress = Math.min(100, (processed / total) * 100);
  const progressBar = createProgressBar(progress);
  const eta = calculateETA(processed, total, elapsedMs / 1000);
  const recordsPerSecond = Math.round(processed / (elapsedMs / 1000));

  // Use \r to overwrite previous line
  process.stdout.write("\r");
  process.stdout.write(
    ` ${progressBar} | ` + // Added space before progress bar
      `${processed}/${total} | ` +
      `⏱ ${formatDuration(elapsedMs)} | ` +
      `🏁 ${eta} | ` +
      `⚡${recordsPerSecond} rows/sec` // Added space after rows/sec
  );
}

/**
 * Sends a batch of records to Elasticsearch with enhanced error handling
 *
 * @param client - Elasticsearch client
 * @param records - Records to send
 * @param indexName - Target index
 * @param onFailure - Callback to track failed records
 */
async function sendBatchToElasticsearch(
  client: Client,
  records: object[],
  indexName: string,
  onFailure: (count: number) => void
): Promise<void> {
  if (!client) {
    throw ErrorFactory.args(
      "Elasticsearch client is required for batch processing",
      "sendBatchToElasticsearch",
      [
        "Ensure Elasticsearch client is properly initialized",
        "Check client connection and configuration",
        "Verify Elasticsearch service is running",
      ]
    );
  }

  if (!records || records.length === 0) {
    Logger.debug`No records to send to Elasticsearch`;
    return;
  }

  if (!indexName) {
    throw ErrorFactory.args(
      "Index name is required for Elasticsearch batch operation",
      "sendBatchToElasticsearch",
      [
        "Provide a valid Elasticsearch index name",
        "Check index configuration",
        "Use --index parameter to specify target index",
      ]
    );
  }

  try {
    await sendBulkWriteRequest(client, records, indexName, onFailure);
  } catch (error) {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    throw ErrorFactory.connection(
      `Failed to send batch to Elasticsearch: ${
        error instanceof Error ? error.message : String(error)
      }`,
      "Elasticsearch",
      undefined,
      [
        "Check Elasticsearch service connectivity",
        "Verify index exists and is writable",
        "Ensure sufficient cluster resources",
        "Review batch size settings",
        "Check network connectivity",
      ]
    );
  }
}
