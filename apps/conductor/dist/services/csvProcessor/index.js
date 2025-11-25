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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processCSVFile = void 0;
const fs = __importStar(require("fs"));
const readline = __importStar(require("readline"));
const csvParser_1 = require("./csvParser");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const validations_1 = require("../../validations");
const logHandler_1 = require("./logHandler");
const elasticsearch_1 = require("../elasticsearch");
const progressBar_1 = require("./progressBar");
const metadata_1 = require("./metadata");
/**
 * Processes a CSV file and indexes the data into Elasticsearch.
 * Updated to use error factory pattern for consistent error handling.
 *
 * @param filePath - Path to the CSV file to process
 * @param config - Configuration object
 * @param client - Elasticsearch client for indexing
 */
async function processCSVFile(filePath, config, client) {
    let isFirstLine = true;
    let headers = [];
    let processedRecords = 0;
    let failedRecords = 0;
    const startTime = Date.now();
    const batchedRecords = [];
    const processingStartTime = new Date().toISOString();
    try {
        // Validate inputs
        if (!filePath || typeof filePath !== "string") {
            throw errors_1.ErrorFactory.args("Invalid file path provided", [
                "Provide a valid file path",
                "Check file path parameter",
            ]);
        }
        if (!config) {
            throw errors_1.ErrorFactory.args("Configuration is required", [
                "Provide valid configuration object",
                "Check configuration setup",
            ]);
        }
        if (!client) {
            throw errors_1.ErrorFactory.args("Elasticsearch client is required", [
                "Provide valid Elasticsearch client",
                "Check client initialization",
            ]);
        }
        // Check file exists and is accessible
        if (!fs.existsSync(filePath)) {
            throw errors_1.ErrorFactory.file("CSV file not found", filePath, [
                "Check that the file exists",
                "Verify the file path is correct",
                "Ensure the file hasn't been moved or deleted",
            ]);
        }
        // Check file permissions
        try {
            fs.accessSync(filePath, fs.constants.R_OK);
        }
        catch (error) {
            throw errors_1.ErrorFactory.file("Cannot read CSV file", filePath, [
                "Check file permissions",
                "Ensure you have read access",
                "Try running with appropriate privileges",
            ]);
        }
        // Get total lines upfront to avoid repeated calls
        const totalLines = await (0, csvParser_1.countFileLines)(filePath);
        if (totalLines === 0) {
            throw errors_1.ErrorFactory.invalidFile("CSV file contains no data rows", filePath, [
                "Ensure the file contains data beyond headers",
                "Check if the file has at least one data row",
                "Verify the file format is correct",
            ]);
        }
        logger_1.Logger.debug `Processing file: ${filePath}`;
        logger_1.Logger.debugString(`Total data rows to process: ${totalLines}`);
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
                    const record = await processDataLine(line, headers, config, filePath, processingStartTime, processedRecords + 1);
                    if (record) {
                        batchedRecords.push(record);
                        processedRecords++;
                        // Update progress more frequently
                        if (processedRecords % 10 === 0) {
                            updateProgressDisplay(processedRecords, totalLines, startTime);
                        }
                        if (batchedRecords.length >= config.batchSize) {
                            await sendBatchToElasticsearch(client, batchedRecords, config.elasticsearch.index, filePath, (count) => {
                                failedRecords += count;
                            });
                            batchedRecords.length = 0;
                        }
                    }
                }
                catch (lineError) {
                    // Handle individual line processing errors
                    logger_1.Logger.warnString(`Error processing line: ${line.substring(0, 50)}...`);
                    logger_1.Logger.debugString(`Line error: ${lineError}`);
                    failedRecords++;
                }
            }
            // Process final batch
            if (batchedRecords.length > 0) {
                await sendBatchToElasticsearch(client, batchedRecords, config.elasticsearch.index, filePath, (count) => {
                    failedRecords += count;
                });
            }
            // Ensure final progress is displayed
            updateProgressDisplay(processedRecords, totalLines, startTime);
            // Display final summary
            logHandler_1.CSVProcessingErrorHandler.displaySummary(processedRecords, failedRecords, startTime);
        }
        finally {
            rl.close();
        }
    }
    catch (error) {
        // If it's already a ConductorError, rethrow it
        if (error instanceof Error && error.name === "ConductorError") {
            throw error;
        }
        // Use the error handler to process and throw the error
        logHandler_1.CSVProcessingErrorHandler.handleProcessingError(error, processedRecords, isFirstLine, config.delimiter);
    }
}
exports.processCSVFile = processCSVFile;
/**
 * Process the header line of the CSV file
 */
async function processHeaderLine(line, config, client, filePath) {
    try {
        const headerResult = (0, csvParser_1.parseCSVLine)(line, config.delimiter, true);
        const headers = headerResult[0] || [];
        if (!headers || headers.length === 0) {
            throw errors_1.ErrorFactory.parsing("Failed to parse CSV headers", { line: line.substring(0, 100), delimiter: config.delimiter, filePath }, [
                "Check if the first line contains valid headers",
                `Verify '${config.delimiter}' is the correct delimiter`,
                "Ensure headers are properly formatted",
            ]);
        }
        logger_1.Logger.debug `Validating headers against the ${config.elasticsearch.index} mapping`;
        await (0, validations_1.validateCSVStructure)(headers);
        logger_1.Logger.debug `Headers validated against index mapping`;
        await (0, validations_1.validateHeadersMatchMappings)(client, headers, config.elasticsearch.index);
        return headers;
    }
    catch (error) {
        if (error instanceof Error && error.name === "ConductorError") {
            throw error;
        }
        throw errors_1.ErrorFactory.validation("Header validation failed", { filePath, originalError: error }, [
            "Check CSV header format and structure",
            "Ensure headers follow naming conventions",
            "Verify Elasticsearch mapping compatibility",
        ]);
    }
}
/**
 * Process a data line of the CSV file
 */
async function processDataLine(line, headers, config, filePath, processingStartTime, recordNumber) {
    try {
        if (line.trim() === "") {
            logger_1.Logger.debug `Skipping empty line ${recordNumber}`;
            return null;
        }
        const rowValues = (0, csvParser_1.parseCSVLine)(line, config.delimiter)[0] || [];
        if (rowValues.length === 0) {
            logger_1.Logger.debug `Skipping line ${recordNumber} - no data parsed`;
            return null;
        }
        const metadata = (0, metadata_1.createRecordMetadata)(filePath, processingStartTime, recordNumber);
        const record = {
            submission_metadata: metadata,
            data: Object.fromEntries(headers.map((h, i) => [h, rowValues[i]])),
        };
        return record;
    }
    catch (error) {
        logger_1.Logger.debug `Error processing data line ${recordNumber}: ${error}`;
        return null;
    }
}
/**
 * Updates the progress display in the console
 *
 * @param processed - Number of processed records
 * @param total - Total number of records
 * @param startTime - When processing started
 */
function updateProgressDisplay(processed, total, startTime) {
    const elapsedMs = Math.max(1, Date.now() - startTime);
    const progress = Math.min(100, (processed / total) * 100);
    const progressBar = (0, progressBar_1.createProgressBar)(progress);
    const eta = (0, progressBar_1.calculateETA)(processed, total, elapsedMs / 1000);
    const recordsPerSecond = Math.round(processed / (elapsedMs / 1000));
    if (processed === 10) {
        logger_1.Logger.generic("");
    }
    // Use \r to overwrite previous line
    process.stdout.write("\r");
    process.stdout.write(` ${progressBar} | ` + // Added space before progress bar
        `${processed}/${total} | ` +
        `⏱ ${(0, progressBar_1.formatDuration)(elapsedMs)} | ` +
        `🏁 ${eta} | ` +
        `⚡${recordsPerSecond} rows/sec` // Added space after rows/sec
    );
}
/**
 * Sends a batch of records to Elasticsearch
 */
async function sendBatchToElasticsearch(client, records, indexName, filePath, onFailure) {
    try {
        // Call with 4 parameters as expected by the function
        await (0, elasticsearch_1.sendBulkWriteRequest)(client, records, indexName, onFailure);
    }
    catch (error) {
        // If it's already a specific data validation error, just rethrow it without adding generic suggestions
        if (error instanceof Error && error.name === "ConductorError") {
            const conductorError = error;
            // Check if this is a data validation error (from our bulk handler)
            if (conductorError.message.includes("Data type validation failed") ||
                conductorError.message.includes("Bulk indexing failed")) {
                // Rethrow without additional wrapping - the user already has specific info
                throw error;
            }
        }
        // For other unexpected errors, provide more appropriate suggestions
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("ECONNREFUSED") ||
            errorMessage.includes("ETIMEDOUT")) {
            throw errors_1.ErrorFactory.connection("Failed to connect to Elasticsearch", {
                filePath,
                indexName,
                originalError: error,
            }, [
                "Check that Elasticsearch is running",
                "Verify the service URL and port",
                "Check network connectivity",
            ]);
        }
        // For data validation errors, don't provide generic connection suggestions
        throw errors_1.ErrorFactory.validation("Data validation failed during upload", {
            filePath,
            indexName,
            originalError: error,
        }, [
            "Check the data type issues shown above",
            "Fix your CSV data to match the expected types",
            "Review the error log for detailed information",
        ]);
    }
}
