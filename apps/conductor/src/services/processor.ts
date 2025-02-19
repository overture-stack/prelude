import * as fs from "fs";
import * as readline from "readline";
import * as os from "os";
import chalk from "chalk";
import { Client } from "@elastic/elasticsearch";
import { v4 as uuidv4 } from "uuid";

import { Config } from "../types";
import { countFileLines, parseCSVLine } from "../utils/csv";
import {
  createProgressBar,
  calculateETA,
  formatDuration,
} from "../utils/formatting";
import { sendBulkWriteRequest } from "../utils/elasticsearch";
import {
  validateCSVStructure,
  validateHeadersMatchMappings,
} from "./validations";

/**
 * Generates a unique submission ID.
 */
export function generateSubmitterId(): string {
  return uuidv4();
}

/**
 * Processes a CSV file and indexes the data into Elasticsearch.
 *
 * Reads the CSV file line-by-line, validates headers, enriches each row with metadata,
 * nests CSV fields under a "data" object (with submission_metadata at the root),
 * and sends batches of records to Elasticsearch.
 *
 * @param filePath Path to the CSV file to process.
 * @param config Configuration object containing processing settings.
 * @param client Elasticsearch client for indexing.
 */
export async function processCSVFile(
  filePath: string,
  config: Config,
  client: Client
) {
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
  function logHeaders(headers: string[], title: string = "Headers found") {
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
            process.stdout.write(
              chalk.red("\n❌ Error: Unable to parse CSV headers\n\n")
            );
            isFirstLine = false;
            rl.close();
            logHeaders(headers);
            return;
          }

          headers = headerResult[0];

          // Validate CSV structure
          const structureValid = await validateCSVStructure(headers);
          if (!structureValid) {
            rl.close();
            isFirstLine = false;
            logHeaders(headers);
            return;
          }

          // Validate headers against the index mapping
          const headersMatchIndex = await validateHeadersMatchMappings(
            client,
            headers,
            config.elasticsearch.index
          );
          if (!headersMatchIndex) {
            rl.close();
            isFirstLine = false;
            return;
          }

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
        const metadata = {
          submitter_id: generateSubmitterId(), // Unique per record
          processing_started: processingStartTime,
          processed_at: new Date().toISOString(),
          source_file: filePath,
          record_number: processedRecords + 1,
          hostname: os.hostname(),
          username: os.userInfo().username,
        };

        // Nest all CSV fields under a "data" object,
        // while keeping submission_metadata at the root.
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
          processedRecords === totalLines
        ) {
          const elapsedMs = Math.max(1, Date.now() - startTime);
          const progress = Math.min(100, (processedRecords / totalLines) * 100);
          const progressBar = createProgressBar(Math.min(100, progress));
          const eta = calculateETA(
            processedRecords,
            totalLines,
            elapsedMs / 1000
          );

          process.stdout.write("\r");
          process.stdout.write(
            `${progressBar} ${chalk.yellow(progress.toFixed(2))}% | ` +
              `${chalk.white(processedRecords.toString())}/${chalk.white(
                totalLines.toString()
              )} | ` +
              `⏱ ${chalk.magenta(formatDuration(elapsedMs))} | ` +
              `🏁 ${chalk.white(eta)} | ` +
              `⚡${chalk.cyan(
                Math.round(processedRecords / (elapsedMs / 1000)).toString()
              )} rows/sec`
          );
        }

        // When batch size is reached, send the batch
        if (batchedRecords.length >= config.batchSize) {
          await sendBulkWriteRequest(
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
        process.stdout.write(chalk.red(`\nError processing line: ${line}\n`));
        if (error instanceof Error) {
          process.stdout.write(chalk.yellow("Error details:\n"));
          process.stdout.write(`├─ Error type: ${error.name}\n`);
          process.stdout.write(`├─ Message: ${error.message}\n`);
        }
        console.error(error);
        continue;
      }
    }

    // Process remaining records
    if (batchedRecords.length > 0) {
      await sendBulkWriteRequest(
        client,
        batchedRecords,
        config.elasticsearch.index,
        (count) => {
          failedRecords += count;
        }
      );
    }

    process.stdout.write("\n\n");
    process.stdout.write(chalk.green("✓ Processing complete!\n\n"));
    process.stdout.write(`Total records processed: ${processedRecords}\n`);
    if (failedRecords > 0) {
      process.stdout.write(chalk.yellow(`Failed records: ${failedRecords}\n`));
    }
    process.stdout.write(
      `Total time: ${formatDuration(Date.now() - startTime)}\n`
    );
  } catch (error) {
    process.stdout.write(chalk.red("\n❌ Error processing file: \n\n"));
    process.stdout.write(chalk.yellow("Error details:\n"));
    console.error(error);
    if (error instanceof Error) {
      process.stdout.write(chalk.yellow("\nDebugging information:\n"));
      process.stdout.write(`├─ Error type: ${error.name}\n`);
      process.stdout.write(`├─ Message: ${error.message}\n`);
      process.stdout.write(`├─ Line number: ${processedRecords + 2}\n`);
      process.stdout.write(
        `└─ Processing stage: ${
          isFirstLine ? "Header validation" : "Data processing"
        }\n`
      );
    }
    process.stdout.write(chalk.cyan("\nPossible solutions:\n"));
    process.stdout.write("1. Check if the file is a valid CSV\n");
    process.stdout.write(
      `2. Verify the delimiter is correct (current: ${config.delimiter})\n`
    );
    process.stdout.write(
      "3. Check for special characters or encoding issues\n"
    );
    process.stdout.write(
      "4. Try opening and resaving the CSV file in a text editor\n"
    );
    throw error;
  }
}
