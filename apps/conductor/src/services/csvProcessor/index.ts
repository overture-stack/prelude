// src/services/csvProcessor/index.ts - Enhanced with ErrorFactory patterns
import * as fs from "fs";
import * as readline from "readline";
import { Client } from "@elastic/elasticsearch";
import { Config } from "../../types";
import { countFileLines, parseCSVLine } from "./csvParser";
import { Logger } from "../../utils/logger";
import {
  validateCSVStructure,
  validateCSVHeaders,
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

            Logger.debug`Validating CSV headers and structure`;

            // Validate CSV structure using the available validation function
            await validateCSVStructure(headers);

            Logger.info`Validating headers against the ${config.elasticsearch.index} mapping`;

            // Validate headers match Elasticsearch index mapping
            await validateHeadersMatchMappings(
              client,
              headers,
              config.elasticsearch.index
            );

            Logger.success`Headers validated successfully`;
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
                "Check CSV header format and structure",
                "Ensure headers follow naming conventions",
                "Verify delimiter is correct",
                "Check for special characters in headers",
                "Ensure headers match Elasticsearch index mapping",
              ]
            );
          }
        }

        // Enhanced data row processing
        if (!isFirstLine) {
          try {
            const parsedRow = parseCSVLine(line, config.delimiter, false);
            const rowData = parsedRow[0];

            if (!rowData || rowData.length === 0) {
              Logger.debug`Skipping empty row at line ${processedRecords + 2}`;
              continue;
            }

            // Enhanced row validation
            if (rowData.length !== headers.length) {
              Logger.warn`Row ${processedRecords + 2} has ${
                rowData.length
              } columns, expected ${headers.length} (header count)`;
            }

            // Create record with metadata and data
            const metadata = createRecordMetadata(
              filePath,
              processingStartTime,
              processedRecords + 1
            );

            // Create the final record structure
            const record = {
              submission_metadata: metadata,
              ...Object.fromEntries(
                headers.map((header, index) => [header, rowData[index] || null])
              ),
            };

            batchedRecords.push(record);
            processedRecords++;

            // Enhanced batch processing with progress tracking
            if (batchedRecords.length >= config.batchSize) {
              await processBatch(
                client,
                batchedRecords,
                config,
                processedRecords,
                totalLines
              );
              batchedRecords.length = 0; // Clear the array
            }

            // Enhanced progress reporting
            if (processedRecords % 1000 === 0) {
              const progress = ((processedRecords / totalLines) * 100).toFixed(
                1
              );
              Logger.info`Processed ${processedRecords.toLocaleString()} records (${progress}%)`;
            }
          } catch (rowError) {
            failedRecords++;
            CSVProcessingErrorHandler.handleProcessingError(
              rowError,
              processedRecords,
              false,
              config.delimiter
            );
          }
        }
      } catch (lineError) {
        // Handle line-level errors
        if (isFirstLine) {
          throw lineError; // Re-throw header errors
        }

        failedRecords++;
        Logger.error`Error processing line ${processedRecords + 2}: ${
          lineError instanceof Error ? lineError.message : String(lineError)
        }`;

        // Continue processing other lines for data errors
        if (failedRecords > processedRecords * 0.1) {
          // Stop if more than 10% of records fail
          throw ErrorFactory.csv(
            `Too many failed records (${failedRecords} failures in ${processedRecords} processed)`,
            filePath,
            processedRecords + 2,
            [
              "Check CSV data format and consistency",
              "Verify data types match expected format",
              "Review failed records for common patterns",
              "Consider fixing source data before reprocessing",
            ]
          );
        }
      }
    }

    // Process any remaining records in the final batch
    if (batchedRecords.length > 0) {
      await processBatch(
        client,
        batchedRecords,
        config,
        processedRecords,
        totalLines
      );
    }

    // Enhanced completion logging
    const duration = Date.now() - startTime;
    const recordsPerSecond = Math.round(processedRecords / (duration / 1000));

    Logger.success`CSV processing completed successfully`;
    Logger.info`Processed ${processedRecords.toLocaleString()} records in ${formatDuration(
      duration
    )}`;
    Logger.info`Average rate: ${recordsPerSecond.toLocaleString()} records/second`;

    if (failedRecords > 0) {
      Logger.warn`${failedRecords} records failed to process`;
      Logger.tipString(
        "Review error messages above for details on failed records"
      );
    }
  } catch (error) {
    // Enhanced error handling for the entire processing operation
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    throw ErrorFactory.csv(
      `CSV processing failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      filePath,
      undefined,
      [
        "Check CSV file format and structure",
        "Verify all required fields are present",
        "Ensure data types are consistent",
        "Check file permissions and accessibility",
        "Review Elasticsearch connectivity and settings",
      ]
    );
  } finally {
    // Ensure resources are properly cleaned up
    try {
      if (rl) rl.close();
      if (fileStream) fileStream.destroy();
    } catch (cleanupError) {
      Logger.debug`Error during cleanup: ${cleanupError}`;
    }
  }
}

/**
 * Enhanced batch processing with comprehensive error handling
 */
async function processBatch(
  client: Client,
  records: object[],
  config: Config,
  processedRecords: number,
  totalLines: number
): Promise<void> {
  try {
    Logger.debug`Processing batch of ${records.length} records`;

    // Enhanced progress calculation
    const progress = Math.min((processedRecords / totalLines) * 100, 100);
    const eta = calculateETA(Date.now(), processedRecords, totalLines);

    Logger.info`${createProgressBar(progress, 30)} ${progress.toFixed(
      1
    )}% ${eta}`;

    // Enhanced bulk write with proper function signature
    await sendBulkWriteRequest(
      client,
      records,
      config.elasticsearch.index,
      (failureCount: number) => {
        if (failureCount > 0) {
          Logger.warn`${failureCount} records failed to index in this batch`;
        }
      },
      {
        maxRetries: 3,
        refresh: true,
      }
    );

    Logger.debug`Successfully processed batch of ${records.length} records`;
  } catch (batchError) {
    throw ErrorFactory.connection(
      `Batch processing failed: ${
        batchError instanceof Error ? batchError.message : String(batchError)
      }`,
      "Elasticsearch",
      config.elasticsearch.url,
      [
        "Check Elasticsearch connectivity and health",
        "Verify index exists and has proper permissions",
        "Review batch size - try reducing if too large",
        "Check cluster resources (disk space, memory)",
        "Ensure proper authentication credentials",
      ]
    );
  }
}
