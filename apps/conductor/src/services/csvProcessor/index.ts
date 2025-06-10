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
import { ConductorError, ErrorCodes } from "../../utils/errors";
import { CSVProcessingErrorHandler } from "./logHandler";
import { sendBulkWriteRequest } from "../elasticsearch";
import { formatDuration, calculateETA, createProgressBar } from "./progressBar";
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

  // Get total lines upfront to avoid repeated calls
  const totalLines = await countFileLines(filePath);

  Logger.info`Processing file: ${filePath}`;

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  try {
    for await (const line of rl) {
      try {
        if (isFirstLine) {
          headers = parseCSVLine(line, config.delimiter, true)[0] || [];
          Logger.info`Validating headers against the ${config.elasticsearch.index} mapping`;
          await validateCSVStructure(headers);
          Logger.info("Headers validated against index mapping");
          await validateHeadersMatchMappings(
            client,
            headers,
            config.elasticsearch.index
          );
          isFirstLine = false;

          Logger.generic(`\n Processing data into elasticsearch...\n`);
          continue;
        }

        const rowValues = parseCSVLine(line, config.delimiter)[0] || [];
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
    rl.close();

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
 * Sends a batch of records to Elasticsearch
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
