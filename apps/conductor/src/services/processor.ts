import * as fs from "fs";
import * as readline from "readline";
import * as os from "os";
import chalk from "chalk";
import { Client } from "@elastic/elasticsearch";
import { v4 as uuidv4 } from "uuid";

import { Config } from "../types";
import { countFileLines, parseCSVLine } from "../utils/csvParser";
import {
  createProgressBar,
  calculateETA,
  formatDuration,
} from "../utils/formatting";
import { sendBulkWriteRequest } from "../utils/elasticsearch";
import { ConductorError, ErrorCodes } from "../utils/errors";
import {
  validateCSVStructure,
  validateHeadersMatchMappings,
} from "../validations";

/**
 * Generates a unique submission ID for record tracking.
 * Uses UUID v4 for guaranteed uniqueness.
 *
 * @returns A string containing the unique identifier
 */
export function generateSubmitterId(): string {
  return uuidv4();
}

/**
 * Creates metadata object for a CSV record
 *
 * @param filePath - Source file path
 * @param processingStartTime - When the overall process started
 * @param recordNumber - Current record number
 * @returns Record metadata object
 */
function createRecordMetadata(
  filePath: string,
  processingStartTime: string,
  recordNumber: number
): Record<string, any> {
  return {
    submitter_id: generateSubmitterId(),
    processing_started: processingStartTime,
    processed_at: new Date().toISOString(),
    source_file: filePath,
    record_number: recordNumber,
    hostname: os.hostname(),
    username: os.userInfo().username,
  };
}

/**
 * Processes a CSV file and indexes the data into Elasticsearch.
 *
 * Reads the CSV file line-by-line, validates headers, enriches each row with metadata,
 * nests CSV fields under a "data" object (with submission_metadata at the root),
 * and sends batches of records to Elasticsearch.
 *
 * @param filePath - Path to the CSV file to process
 * @param config - Configuration object containing processing settings
 * @param client - Elasticsearch client for indexing
 * @throws ConductorError for various processing failures
 */
export async function processCSVFile(
  filePath: string,
  config: Config,
  client: Client
): Promise<void> {
  let isFirstLine = true; // Flag for header row processing
  let headers: string[] = []; // CSV headers array
  let totalLines = 0; // Total lines in the file
  let processedRecords = 0; // Count of processed records
  let failedRecords = 0; // Count of failed records
  const startTime = Date.now(); // Processing start time
  const batchedRecords: object[] = []; // Records to be sent in bulk

  // Generate submission metadata for this processing session
  const processingStartTime = new Date().toISOString();

  // Create a readable stream for the file
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  // Function to log headers
  function logHeaders(
    headers: string[],
    title: string = "Headers found"
  ): void {
    process.stdout.write(chalk.yellow(`${title}:\n`));
    headers.forEach((header) => {
      process.stdout.write(chalk.cyan(`├─ ${header}\n`));
    });
  }

  try {
    for await (const line of rl) {
      try {
        // Process header row separately
        if (isFirstLine) {
          const headerResult = parseCSVLine(line, config.delimiter, true);

          if (
            !headerResult ||
            headerResult.length === 0 ||
            headerResult[0].length === 0
          ) {
            rl.close();
            throw new ConductorError(
              "Unable to parse CSV headers",
              ErrorCodes.PARSING_ERROR
            );
          }

          headers = headerResult[0];

          // Validate CSV structure
          await validateCSVStructure(headers);

          // Validate headers against the index mapping
          await validateHeadersMatchMappings(
            client,
            headers,
            config.elasticsearch.index
          );

          totalLines = await countFileLines(filePath);
          process.stdout.write(
            `${chalk.blue.bold(
              "📊 Total records to process:"
            )} ${chalk.yellow.bold(totalLines.toString())}\n\n`
          );
          process.stdout.write(
            chalk.blue.bold("🚀 Starting transfer to Elasticsearch...\n\n")
          );

          isFirstLine = false;
          continue;
        }

        // Parse CSV line
        const parseResult = parseCSVLine(line, config.delimiter);
        if (!parseResult || !parseResult.length) {
          process.stdout.write(
            chalk.yellow(`\nWarning: Empty or unparseable line: ${line}\n`)
          );
          continue;
        }

        const rowValues = parseResult[0];

        // Create metadata for this record
        const metadata = createRecordMetadata(
          filePath,
          processingStartTime,
          processedRecords + 1
        );

        // Nest all CSV fields under a "data" object,
        // while keeping submission_metadata at the root
        const dataFields: Record<string, any> = {};
        headers.forEach((header, index) => {
          dataFields[header] = rowValues[index];
        });

        const record = {
          submission_metadata: metadata,
          data: dataFields,
        };

        batchedRecords.push(record);
        processedRecords++;

        // Update progress every batch or at the end of file
        if (
          processedRecords % config.batchSize === 0 ||
          processedRecords === totalLines - 1 // Account for header row
        ) {
          updateProgressDisplay(
            processedRecords,
            totalLines - 1, // Exclude header from count
            startTime
          );
        }

        // When batch size is reached, send the batch
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
        if (error instanceof ConductorError) {
          throw error;
        }

        process.stdout.write(chalk.red(`\nError processing line: ${line}\n`));
        if (error instanceof Error) {
          process.stdout.write(chalk.yellow("Error details:\n"));
          process.stdout.write(`├─ Error type: ${error.name}\n`);
          process.stdout.write(`├─ Message: ${error.message}\n`);
        }
        continue;
      }
    }

    // Process remaining records
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

    displaySummary(processedRecords, failedRecords, startTime);
  } catch (error) {
    rl.close();
    handleProcessingError(
      error,
      processedRecords,
      isFirstLine,
      config.delimiter
    );
  }
}

/**
 * Sends a batch of records to Elasticsearch
 *
 * @param client - Elasticsearch client
 * @param records - Records to send
 * @param indexName - Target index
 * @param onFailure - Callback for failed records
 */
async function sendBatchToElasticsearch(
  client: Client,
  records: object[],
  indexName: string,
  onFailure: (count: number) => void
): Promise<void> {
  try {
    await sendBulkWriteRequest(client, records, indexName, onFailure);
  } catch (error) {
    throw new ConductorError(
      "Failed to send batch to Elasticsearch",
      ErrorCodes.CONNECTION_ERROR,
      error
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
  const progressBar = createProgressBar(Math.min(100, progress));
  const eta = calculateETA(processed, total, elapsedMs / 1000);

  process.stdout.write("\r");
  process.stdout.write(
    `${progressBar} ${chalk.yellow(progress.toFixed(2))}% | ` +
      `${chalk.white(processed.toString())}/${chalk.white(
        total.toString()
      )} | ` +
      `⏱ ${chalk.magenta(formatDuration(elapsedMs))} | ` +
      `🏁 ${chalk.white(eta)} | ` +
      `⚡${chalk.cyan(
        Math.round(processed / (elapsedMs / 1000)).toString()
      )} rows/sec`
  );
}

/**
 * Displays processing summary
 *
 * @param processed - Number of processed records
 * @param failed - Number of failed records
 * @param startTime - When processing started
 */
function displaySummary(
  processed: number,
  failed: number,
  startTime: number
): void {
  process.stdout.write("\n\n");
  process.stdout.write(chalk.green("✓ Processing complete!\n\n"));
  process.stdout.write(`Total records processed: ${processed}\n`);

  if (failed > 0) {
    process.stdout.write(chalk.yellow(`Failed records: ${failed}\n`));
  }

  process.stdout.write(
    `Total time: ${formatDuration(Date.now() - startTime)}\n`
  );
}

/**
 * Handles and reports processing errors
 *
 * @param error - The error that occurred
 * @param processedRecords - Number of records processed before error
 * @param isFirstLine - Whether error occurred during header processing
 * @param delimiter - CSV delimiter being used
 * @throws Original error after formatting
 */
function handleProcessingError(
  error: unknown,
  processedRecords: number,
  isFirstLine: boolean,
  delimiter: string
): void {
  process.stdout.write(chalk.red("\n❌ Error processing file: \n\n"));

  if (error instanceof Error) {
    process.stdout.write(chalk.yellow("Error details:\n"));
    process.stdout.write(`├─ Error type: ${error.name}\n`);
    process.stdout.write(`├─ Message: ${error.message}\n`);
    process.stdout.write(`├─ Line number: ${processedRecords + 2}\n`);
    process.stdout.write(
      `└─ Processing stage: ${
        isFirstLine ? "Header validation" : "Data processing"
      }\n`
    );
  } else {
    console.error(error);
  }

  process.stdout.write(chalk.cyan("\nPossible solutions:\n"));
  process.stdout.write("1. Check if the file is a valid CSV\n");
  process.stdout.write(
    `2. Verify the delimiter is correct (current: ${delimiter})\n`
  );
  process.stdout.write("3. Check for special characters or encoding issues\n");
  process.stdout.write(
    "4. Try opening and resaving the CSV file in a text editor\n"
  );

  if (error instanceof ConductorError) {
    throw error;
  } else {
    throw new ConductorError(
      "CSV processing failed",
      ErrorCodes.PARSING_ERROR,
      error
    );
  }
}
