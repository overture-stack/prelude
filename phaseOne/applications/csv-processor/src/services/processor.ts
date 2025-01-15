import * as fs from 'fs';
import * as readline from 'readline';
import * as os from 'os';
import chalk from 'chalk';
import { Client } from '@elastic/elasticsearch';
import { v4 as uuidv4 } from 'uuid';

import { Config } from '../types';
import { countFileLines, parseCSVLine, createRecordFromRow } from '../utils/csv';
import { createProgressBar, calculateETA, formatDuration } from '../utils/formatting';
import { sendBulkWriteRequest } from '../utils/elasticsearch';
import { validateCSVStructure, validateHeadersMatchMappings  } from './validations'; 

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

export function generateSubmitterId(): string {
    return uuidv4();
}

export async function processCSVFile(filePath: string, config: Config, client: Client) {
    // Processing state initialization
    let isFirstLine = true;  // Flag to handle header processing
    let headers: string[] = [];  // Stores CSV headers
    let totalLines = 0;  // Total number of lines in the file
    let processedRecords = 0;  // Number of successfully processed records
    let failedRecords = 0;  // Number of records that failed indexing
    const startTime = Date.now();  // Start time of processing
    const batchedRecords: object[] = [];  // Batch of records to be indexed
    
    // Generate unique submission metadata
    const submitterId = generateSubmitterId();  // Unique identifier for this processing session
    const processingStartTime = new Date().toISOString();  // Timestamp of processing start

    // Create a readable stream for the file
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity  // Recognize all instances of CR LF as a single line break
    });

    // Function to display read headers for error handling/debugging
    function logHeaders(headers: string[], title: string = 'Headers found') {
        process.stdout.write(chalk.yellow(`${title}:\n`));
        headers.forEach((header, index) => {
            process.stdout.write(chalk.cyan(`├─ ${header}\n`));
        });
    }
    
    try {
        // Process each line of the CSV file
        for await (const line of rl) {
            try {
                // Handle header row separately
                if (isFirstLine) {
                    const headerResult = parseCSVLine(line, config.delimiter, true);
                    
                    // Ensure headerResult is not empty and contains at least one valid header
                    if (!headerResult || headerResult.length === 0 || headerResult[0].length === 0) {
                        process.stdout.write(chalk.red('\n❌ Error: Unable to parse CSV headers\n\n'));
                        isFirstLine = false;
                        rl.close();
                        logHeaders(headers);
                        return; // Return instead of throw
                    }

                    headers = headerResult[0];
            
                    // Validate CSV Structure
                    const structureValid = await validateCSVStructure(headers);
                    if (!structureValid) {
                        // Close readline to prevent further reading
                        rl.close();
                        isFirstLine = false;
                        logHeaders(headers);
                        return; // Return instead of throw
                    }
                    
                    // Validate headers against index mapping
                    const headersMatchIndex = await validateHeadersMatchMappings(
                        client, 
                        headers, 
                        config.elasticsearch.index
                    );
                    if (!headersMatchIndex) {
                        rl.close();
                        isFirstLine = false;
                        return; // Return instead of throw
                    }

                    // Count total lines in the file
                    totalLines = await countFileLines(filePath);
                    process.stdout.write(`${chalk.blue.bold('📊 Total records to process:')} ${chalk.yellow.bold(totalLines.toString())}\n\n`);

                    process.stdout.write(chalk.blue.bold('🚀 Starting transfer to elasticsearch...\n\n'));

                    isFirstLine = false;
                    continue;
                }

                // Parse CSV line
                const parseResult = parseCSVLine(line, config.delimiter);
                if (!parseResult || !parseResult.length) {
                    process.stdout.write(chalk.yellow(`\nWarning: Empty or unparseable line: ${line}\n`));
                    continue;
                }

                const rowValues = parseResult[0];
                
                // Add metadata to each record
                const metadata = {
                    submitter_id: generateSubmitterId(),  // Unique for each record
                    processing_started: processingStartTime,
                    processed_at: new Date().toISOString(),
                    source_file: filePath,
                    record_number: processedRecords + 1,
                    hostname: os.hostname(),
                    username: os.userInfo().username
                };

                // Create record and add to batch
                const record = createRecordFromRow(rowValues, headers, metadata);
                batchedRecords.push(record);
                processedRecords++;

                // Update progress and display stats periodically
                if (processedRecords % config.batchSize === 0 || processedRecords === totalLines) {
                    const elapsedMs = Math.max(1, Date.now() - startTime); // Prevent division by zero
                    const progress = Math.min(100, ((processedRecords / totalLines) * 100));
                    const progressBar = createProgressBar(Math.min(100, progress));
                    const eta = calculateETA(processedRecords, totalLines, elapsedMs / 1000);
                    
                    // Display dynamic progress information
                    process.stdout.write('\r');
                    process.stdout.write(
                        `${progressBar} ` +
                        `${chalk.yellow(progress.toFixed(2))}% | ` +
                        `${chalk.white(processedRecords.toString())}/${chalk.white(totalLines.toString())} | ` +
                        `⏱ ${chalk.magenta(formatDuration(elapsedMs))} | ` +
                        `🏁 ${chalk.white(eta)} | ` +
                        `⚡${chalk.cyan(Math.round((processedRecords / (elapsedMs / 1000))).toString())} rows/sec`
                    );
                }

                // Send batch to Elasticsearch when batch size is reached
                if (batchedRecords.length >= config.batchSize) {
                    await sendBulkWriteRequest(
                        client,
                        batchedRecords,
                        config.elasticsearch.index,
                        (count) => { failedRecords += count; }
                    );
                    batchedRecords.length = 0;
                }
            } catch (error) {
                // Enhanced error handling for individual line processing
                process.stdout.write(chalk.red(`\nError processing line: ${line}\n`));
                
                // Log detailed error information
                if (error instanceof Error) {
                    process.stdout.write(chalk.yellow('Error details:\n'));
                    process.stdout.write(`├─ Error type: ${error.name}\n`);
                    process.stdout.write(`├─ Message: ${error.message}\n`);
                }
                
                console.error(error);
                continue;
            }
        }

        // Process any remaining records in the batch
        if (batchedRecords.length > 0) {
            await sendBulkWriteRequest(
                client,
                batchedRecords,
                config.elasticsearch.index,
                (count) => { failedRecords += count; }
            );
        }

        // Display final statistics
        process.stdout.write('\n\n');
        process.stdout.write(chalk.green('✓ Processing complete!\n\n'));
        process.stdout.write(`Total records processed: ${processedRecords}\n`);
        if (failedRecords > 0) {
            process.stdout.write(chalk.yellow(`Failed records: ${failedRecords}\n`));
        }
        process.stdout.write(`Total time: ${formatDuration(Date.now() - startTime)}\n`);

    } catch (error) {
        // Enhanced error logging and diagnostics
        process.stdout.write(chalk.red('\n❌ Error processing file: \n\n'));
        process.stdout.write(chalk.yellow('Error details:\n'));
        console.error(error);
        
        // Detailed error information
        if (error instanceof Error) {
            process.stdout.write(chalk.yellow('\nDebugging information:\n'));
            process.stdout.write(`├─ Error type: ${error.name}\n`);
            process.stdout.write(`├─ Message: ${error.message}\n`);
            process.stdout.write(`├─ Line number: ${processedRecords + 2}\n`);
            process.stdout.write(`└─ Processing stage: ${isFirstLine ? 'Header validation' : 'Data processing'}\n`);
        }

        // Suggestions for resolving issues
        process.stdout.write(chalk.cyan('\nPossible solutions:\n'));
        process.stdout.write('1. Check if the file is a valid CSV\n');
        process.stdout.write('2. Verify the delimiter is correct (current: ' + config.delimiter + ')\n');
        process.stdout.write('3. Check for special characters or encoding issues\n');
        process.stdout.write('4. Try opening and resaving the CSV file in a text editor\n');
        
        throw error;
    }
}