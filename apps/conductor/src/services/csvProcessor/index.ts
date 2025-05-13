import * as fs from "fs";
import * as readline from "readline";
import * as path from "path";
import { Client } from "@elastic/elasticsearch";
import { Config } from "../../types";
import { countFileLines, parseCSVLine } from "./csvParser";
import { Logger } from "../../utils/logger";
import { validateCSVStructure, validateHeadersMatchMappings } from "../../validations";
import { ConductorError, ErrorCodes } from "../../utils/errors";
import { sendBulkWriteRequest } from "../elasticsearch/bulk";
import { formatDuration, calculateETA, createProgressBar } from "./progressBar";
import { createRecordMetadata } from "./metadata";

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

  // Use \r to overwrite previous line without adding a newline
  process.stdout.write("\r");
  process.stdout.write(
    ` ${progressBar} | ` +
    `${processed}/${total} | ` +
    `⏱ ${formatDuration(elapsedMs)} | ` +
    `🏁 ${eta} | ` +
    `⚡${recordsPerSecond} rows/sec`
  );
}

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
  const fileName = path.basename(filePath);

  // Get total lines upfront to avoid repeated calls
  const totalLines = await countFileLines(filePath);

  Logger.info(`Processing file: ${fileName}`);

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
          await validateCSVStructure(headers);
          await validateHeadersMatchMappings(
            client,
            headers,
            config.elasticsearch.index
          );
          isFirstLine = false;

          Logger.generic(`\nProcessing data into elasticsearch...\n`);
          continue;
        }

        const rowValues = parseCSVLine(line, config.delimiter, false)[0] || [];
        const metadata = createRecordMetadata(
          filePath,
          processingStartTime,
          processedRecords + 1
        );
        
        // Create a record with proper structure
        const record = {
          submission_metadata: metadata,
          data: Object.fromEntries(
            headers.map((h, i) => {
              let value = rowValues[i];
              
              // Basic data type conversion
              if (value === undefined || value === null || value === "") {
                return [h, null];
              } else if (!isNaN(Number(value)) && value.toString().trim() !== "") {
                return [h, Number(value)];
              } else {
                return [h, value.toString().trim()];
              }
            })
          ),
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
          try {
            await sendBulkWriteRequest(
              client,
              batchedRecords,
              config.elasticsearch.index,
              (count) => {
                failedRecords += count;
              },
              { maxRetries: 1 }
            );
          } catch (error) {
            throw error;
          }
          batchedRecords.length = 0;
        }
      } catch (lineError) {
        // Handle individual line processing errors
        Logger.debug(`Error processing line: ${line.substring(0, 50)}...`);
        failedRecords++;
      }
    }

    // Final batch and progress update
    if (batchedRecords.length > 0) {
      try {
        await sendBulkWriteRequest(
          client,
          batchedRecords,
          config.elasticsearch.index,
          (count) => {
            failedRecords += count;
          },
          { maxRetries: 1 }
        );
      } catch (error) {
        throw error;
      }
    }

    // Ensure final progress is displayed
    updateProgressDisplay(processedRecords, totalLines - 1, startTime);
    
    // NOW add the newlines after we're done with all progress updates
    console.log(`\n`);
    
    // Display summary statistics
    displayProcessingSummary(processedRecords, failedRecords, startTime);
    
  } catch (error) {
    rl.close();
    
    // Ensure we're on a new line after progress bar before any error messages
    process.stdout.write("\n\n");
    
    // Let the error propagate up
    throw error;
  }
}

/**
 * Displays a summary of the CSV processing operation
 *
 * @param processed - Total number of processed records
 * @param failed - Number of failed records
 * @param startTime - When the processing started
 */
function displayProcessingSummary(
  processed: number,
  failed: number,
  startTime: number
): void {
  const elapsedMs = Date.now() - startTime;
  const recordsPerSecond = Math.max(
    0.1,
    processed / Math.max(1, elapsedMs / 1000)
  );
  const successfulRecords = Math.max(0, processed - failed);

  if (failed > 0) {
    Logger.warn(`Transfer to elasticsearch completed with partial errors`);
  } else if (processed === 0) {
    Logger.warn(`No records were processed`);
  } else {
    Logger.success(`Transfer to elasticsearch completed successfully`);
  }

  // Print summary
  Logger.generic(` ▸ Total Records processed: ${processed}`);
  Logger.generic(` ▸ Records Successfully transferred: ${successfulRecords}`);

  if (failed > 0) {
    Logger.warn(`  ▸ Records Unsuccessfully transferred: ${failed}`);
    Logger.generic(` ▸ Error logs outputted to: /logs/`);
  }

  Logger.generic(
    ` ▸ Processing speed: ${Math.round(recordsPerSecond)} rows/sec`
  );
  Logger.generic(` ⏱ Total processing time: ${formatDuration(elapsedMs)}`);
}