"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSubmitterId = generateSubmitterId;
exports.processCSVFile = processCSVFile;
const fs = __importStar(require("fs"));
const readline = __importStar(require("readline"));
const os = __importStar(require("os"));
const chalk_1 = __importDefault(require("chalk"));
const uuid_1 = require("uuid");
const csv_1 = require("../utils/csv");
const formatting_1 = require("../utils/formatting");
const elasticsearch_1 = require("../utils/elasticsearch");
const validations_1 = require("./validations");
/**
 * CSV File Processing and Elasticsearch Indexing Utility
 *
 * This function provides a robust, interactive CLI-based solution for:
 * - Reading large CSV files line by line
 * - Parsing CSV data with custom delimiters
 * - Adding metadata to each record
 * - Bulk indexing records into Elasticsearch
 * - Providing real-time processing progress and statistics
 *
 * Key Features:
 * - Interactive header and file path confirmation
 * - Dynamic progress bar and ETA calculation
 * - Batch processing with configurable batch size
 * - Detailed error handling and debugging information
 * - Performance metrics and processing statistics
 *
 * @param filePath Path to the CSV file to be processed
 * @param config Configuration object containing processing settings
 * @param client Elasticsearch client for indexing records
 */
function generateSubmitterId() {
    return (0, uuid_1.v4)();
}
async function processCSVFile(filePath, config, client) {
    // Processing state initialization
    let isFirstLine = true; // Flag to handle header processing
    let headers = []; // Stores CSV headers
    let totalLines = 0; // Total number of lines in the file
    let processedRecords = 0; // Number of successfully processed records
    let failedRecords = 0; // Number of records that failed indexing
    const startTime = Date.now(); // Start time of processing
    const batchedRecords = []; // Batch of records to be indexed
    // Generate unique submission metadata
    const submitterId = generateSubmitterId(); // Unique identifier for this processing session
    const processingStartTime = new Date().toISOString(); // Timestamp of processing start
    // Create a readable stream for the file
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity // Recognize all instances of CR LF as a single line break
    });
    // Function to display read headers for error handling/debugging
    function logHeaders(headers, title = 'Headers found') {
        process.stdout.write(chalk_1.default.yellow(`${title}:\n`));
        headers.forEach((header, index) => {
            process.stdout.write(chalk_1.default.cyan(`├─ ${header}\n`));
        });
    }
    try {
        // Process each line of the CSV file
        for await (const line of rl) {
            try {
                // Handle header row separately
                if (isFirstLine) {
                    const headerResult = (0, csv_1.parseCSVLine)(line, config.delimiter, true);
                    // Ensure headerResult is not empty and contains at least one valid header
                    if (!headerResult || headerResult.length === 0 || headerResult[0].length === 0) {
                        process.stdout.write(chalk_1.default.red('\n❌ Error: Unable to parse CSV headers\n\n'));
                        isFirstLine = false;
                        rl.close();
                        logHeaders(headers);
                        return; // Return instead of throw
                    }
                    headers = headerResult[0];
                    // Validate CSV Structure
                    const structureValid = await (0, validations_1.validateCSVStructure)(headers);
                    if (!structureValid) {
                        // Close readline to prevent further reading
                        rl.close();
                        isFirstLine = false;
                        logHeaders(headers);
                        return; // Return instead of throw
                    }
                    // Validate headers against index mapping
                    const headersMatchIndex = await (0, validations_1.validateHeadersMatchMappings)(client, headers, config.elasticsearch.index);
                    if (!headersMatchIndex) {
                        rl.close();
                        isFirstLine = false;
                        return; // Return instead of throw
                    }
                    // Count total lines in the file
                    totalLines = await (0, csv_1.countFileLines)(filePath);
                    process.stdout.write(`${chalk_1.default.blue.bold('📊 Total records to process:')} ${chalk_1.default.yellow.bold(totalLines.toString())}\n\n`);
                    process.stdout.write(chalk_1.default.blue.bold('🚀 Starting transfer to elasticsearch...\n\n'));
                    isFirstLine = false;
                    continue;
                }
                // Parse CSV line
                const parseResult = (0, csv_1.parseCSVLine)(line, config.delimiter);
                if (!parseResult || !parseResult.length) {
                    process.stdout.write(chalk_1.default.yellow(`\nWarning: Empty or unparseable line: ${line}\n`));
                    continue;
                }
                const rowValues = parseResult[0];
                // Add metadata to each record
                const metadata = {
                    submitter_id: generateSubmitterId(), // Unique for each record
                    processing_started: processingStartTime,
                    processed_at: new Date().toISOString(),
                    source_file: filePath,
                    record_number: processedRecords + 1,
                    hostname: os.hostname(),
                    username: os.userInfo().username
                };
                // Create record and add to batch
                const record = (0, csv_1.createRecordFromRow)(rowValues, headers, metadata);
                batchedRecords.push(record);
                processedRecords++;
                // Update progress and display stats periodically
                if (processedRecords % config.batchSize === 0 || processedRecords === totalLines) {
                    const elapsedMs = Math.max(1, Date.now() - startTime); // Prevent division by zero
                    const progress = Math.min(100, ((processedRecords / totalLines) * 100));
                    const progressBar = (0, formatting_1.createProgressBar)(Math.min(100, progress));
                    const eta = (0, formatting_1.calculateETA)(processedRecords, totalLines, elapsedMs / 1000);
                    // Display dynamic progress information
                    process.stdout.write('\r');
                    process.stdout.write(`${progressBar} ` +
                        `${chalk_1.default.yellow(progress.toFixed(2))}% | ` +
                        `${chalk_1.default.white(processedRecords.toString())}/${chalk_1.default.white(totalLines.toString())} | ` +
                        `⏱ ${chalk_1.default.magenta((0, formatting_1.formatDuration)(elapsedMs))} | ` +
                        `🏁 ${chalk_1.default.white(eta)} | ` +
                        `⚡${chalk_1.default.cyan(Math.round((processedRecords / (elapsedMs / 1000))).toString())} rows/sec`);
                }
                // Send batch to Elasticsearch when batch size is reached
                if (batchedRecords.length >= config.batchSize) {
                    await (0, elasticsearch_1.sendBulkWriteRequest)(client, batchedRecords, config.elasticsearch.index, (count) => { failedRecords += count; });
                    batchedRecords.length = 0;
                }
            }
            catch (error) {
                // Enhanced error handling for individual line processing
                process.stdout.write(chalk_1.default.red(`\nError processing line: ${line}\n`));
                // Log detailed error information
                if (error instanceof Error) {
                    process.stdout.write(chalk_1.default.yellow('Error details:\n'));
                    process.stdout.write(`├─ Error type: ${error.name}\n`);
                    process.stdout.write(`├─ Message: ${error.message}\n`);
                }
                console.error(error);
                continue;
            }
        }
        // Process any remaining records in the batch
        if (batchedRecords.length > 0) {
            await (0, elasticsearch_1.sendBulkWriteRequest)(client, batchedRecords, config.elasticsearch.index, (count) => { failedRecords += count; });
        }
        // Display final statistics
        process.stdout.write('\n\n');
        process.stdout.write(chalk_1.default.green('✓ Processing complete!\n\n'));
        process.stdout.write(`Total records processed: ${processedRecords}\n`);
        if (failedRecords > 0) {
            process.stdout.write(chalk_1.default.yellow(`Failed records: ${failedRecords}\n`));
        }
        process.stdout.write(`Total time: ${(0, formatting_1.formatDuration)(Date.now() - startTime)}\n`);
    }
    catch (error) {
        // Enhanced error logging and diagnostics
        process.stdout.write(chalk_1.default.red('\n❌ Error processing file: \n\n'));
        process.stdout.write(chalk_1.default.yellow('Error details:\n'));
        console.error(error);
        // Detailed error information
        if (error instanceof Error) {
            process.stdout.write(chalk_1.default.yellow('\nDebugging information:\n'));
            process.stdout.write(`├─ Error type: ${error.name}\n`);
            process.stdout.write(`├─ Message: ${error.message}\n`);
            process.stdout.write(`├─ Line number: ${processedRecords + 2}\n`);
            process.stdout.write(`└─ Processing stage: ${isFirstLine ? 'Header validation' : 'Data processing'}\n`);
        }
        // Suggestions for resolving issues
        process.stdout.write(chalk_1.default.cyan('\nPossible solutions:\n'));
        process.stdout.write('1. Check if the file is a valid CSV\n');
        process.stdout.write('2. Verify the delimiter is correct (current: ' + config.delimiter + ')\n');
        process.stdout.write('3. Check for special characters or encoding issues\n');
        process.stdout.write('4. Try opening and resaving the CSV file in a text editor\n');
        throw error;
    }
}
