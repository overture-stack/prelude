"use strict";
// src/services/csvProcessor/postgresProcessor.ts
/**
 * PostgreSQL CSV Processing Module
 *
 * Processes CSV files for PostgreSQL upload, similar to the Elasticsearch processor
 * but optimized for PostgreSQL bulk inserts.
 * FIXED: Proper error handling to stop processing on header validation failures.
 */
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
exports.processCSVFileForPostgres = void 0;
const fs = __importStar(require("fs"));
const readline = __importStar(require("readline"));
const csvParser_1 = require("./csvParser");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const logHandler_1 = require("./logHandler");
const bulk_1 = require("../postgresql/bulk");
const progressBar_1 = require("./progressBar");
const metadata_1 = require("./metadata");
/**
 * Processes a CSV file and inserts the data into PostgreSQL.
 *
 * @param filePath - Path to the CSV file to process
 * @param config - Configuration object
 * @param client - PostgreSQL Pool for database operations
 */
async function processCSVFileForPostgres(filePath, config, client) {
    var _a, _b, _c;
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
        if (!config.postgresql) {
            throw errors_1.ErrorFactory.args("PostgreSQL configuration is required", [
                "Provide valid PostgreSQL configuration",
                "Check postgresql config in your configuration object",
            ]);
        }
        if (!client) {
            throw errors_1.ErrorFactory.args("PostgreSQL client is required", [
                "Provide valid PostgreSQL client",
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
        // Get total lines upfront
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
                        // FIXED: If header processing fails, throw immediately - don't continue
                        headers = await processHeaderLine(line, config, client, filePath);
                        // Add submission_metadata to headers if metadata is enabled
                        if ((_a = config.postgresql) === null || _a === void 0 ? void 0 : _a.addMetadata) {
                            headers = [...headers, 'submission_metadata'];
                        }
                        isFirstLine = false;
                        continue;
                    }
                    // Rest of processing only happens if headers were validated successfully
                    const record = await processDataLine(line, headers, config, filePath, processingStartTime, processedRecords + 1);
                    if (record) {
                        batchedRecords.push(record);
                        processedRecords++;
                        // Update progress more frequently
                        if (processedRecords % 10 === 0) {
                            updateProgressDisplay(processedRecords, totalLines, startTime);
                        }
                        if (batchedRecords.length >= config.batchSize) {
                            await sendBatchToPostgreSQL(client, batchedRecords, config.postgresql.table, // Use non-null assertion since we validated above
                            headers, filePath, (count) => {
                                failedRecords += count;
                            });
                            batchedRecords.length = 0;
                        }
                    }
                }
                catch (lineError) {
                    // FIXED: If this is a header validation error, don't treat it as a line processing error
                    if (isFirstLine) {
                        // Header validation failed - rethrow to stop processing entirely
                        throw lineError;
                    }
                    // Handle individual line processing errors (not header errors)
                    logger_1.Logger.warnString(`Error processing line: ${line.substring(0, 50)}...`);
                    logger_1.Logger.debugString(`Line error: ${lineError}`);
                    failedRecords++;
                }
            }
            // Process final batch
            if (batchedRecords.length > 0) {
                await sendBatchToPostgreSQL(client, batchedRecords, config.postgresql.table, // Use non-null assertion since we validated above
                headers, filePath, (count) => {
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
        // FIXED: If it's a header validation error, don't proceed with CSV processing error handler
        if (error instanceof Error && error.name === "ConductorError") {
            const conductorError = error;
            // Check if this is a header validation error by examining the error details
            if (((_b = conductorError.details) === null || _b === void 0 ? void 0 : _b.extraHeaders) ||
                ((_c = conductorError.details) === null || _c === void 0 ? void 0 : _c.missingHeaders)) {
                // This is a header validation error - rethrow it directly
                throw error;
            }
        }
        // Use the error handler for other processing errors
        logHandler_1.CSVProcessingErrorHandler.handleProcessingError(error, processedRecords, isFirstLine, config.delimiter);
    }
}
exports.processCSVFileForPostgres = processCSVFileForPostgres;
/**
 * Process the header line of the CSV file
 * FIXED: Proper error handling to stop processing on validation failures
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
        logger_1.Logger.debug `Validating headers against table schema`;
        // FIXED: This validation should throw and stop processing if it fails
        await validateHeadersAgainstTable(client, headers, config.postgresql.table);
        logger_1.Logger.debug `Headers validated against table schema`;
        return headers;
    }
    catch (error) {
        // FIXED: Don't wrap header validation errors - let them bubble up to stop processing
        if (error instanceof Error && error.name === "ConductorError") {
            throw error;
        }
        throw errors_1.ErrorFactory.validation("Header validation failed", { filePath, originalError: error }, [
            "Check CSV header format and structure",
            "Ensure headers follow naming conventions",
            "Verify table schema compatibility",
        ]);
    }
}
/**
 * Process a data line of the CSV file
 */
async function processDataLine(line, headers, config, filePath, processingStartTime, recordNumber) {
    var _a;
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
        // Create a simple record object mapping headers to values
        const record = {};
        headers.forEach((header, index) => {
            record[header] = rowValues[index] || null;
        });
        // Add metadata if configured
        if ((_a = config.postgresql) === null || _a === void 0 ? void 0 : _a.addMetadata) {
            const metadata = (0, metadata_1.createRecordMetadata)(filePath, processingStartTime, recordNumber);
            record.submission_metadata = JSON.stringify(metadata);
        }
        return record;
    }
    catch (error) {
        logger_1.Logger.debug `Error processing data line ${recordNumber}: ${error}`;
        return null;
    }
}
/**
 * Validates CSV headers against PostgreSQL table structure
 */
async function validateHeadersAgainstTable(client, headers, tableName) {
    try {
        // Get table columns
        const result = await client.query(`SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
       AND table_name = $1
       ORDER BY ordinal_position`, [tableName]);
        const tableColumns = result.rows.map((row) => row.column_name);
        logger_1.Logger.debug `Table columns: ${tableColumns.join(", ")}`;
        logger_1.Logger.debug `CSV headers: ${headers.join(", ")}`;
        // Filter out metadata columns from comparison
        const requiredColumns = tableColumns.filter((col) => col !== "submission_metadata" && col !== "id");
        // Check for missing headers
        const missingHeaders = requiredColumns.filter((col) => !headers.includes(col));
        // Check for extra headers
        const extraHeaders = headers.filter((header) => !tableColumns.includes(header));
        if (missingHeaders.length > 0 || extraHeaders.length > 0) {
            logger_1.Logger.errorString("CSV headers do not match table structure");
            if (extraHeaders.length > 0) {
                logger_1.Logger.suggestion("Extra headers (in CSV, not in table)");
                extraHeaders.forEach((header) => {
                    logger_1.Logger.generic(`   ▸ ${header}`);
                });
            }
            if (missingHeaders.length > 0) {
                logger_1.Logger.suggestion("Missing headers (required by table, missing from CSV)");
                missingHeaders.forEach((header) => {
                    logger_1.Logger.generic(`   ▸ ${header}`);
                });
            }
            logger_1.Logger.suggestion("Expected table columns");
            tableColumns.forEach((col) => {
                logger_1.Logger.generic(`   ▸ ${col}`);
            });
            throw errors_1.ErrorFactory.validation("Header validation failed - CSV headers do not match table structure", {
                tableName,
                tableColumns,
                csvHeaders: headers,
                missingHeaders,
                extraHeaders,
            }, [] // Empty suggestions since we already displayed them above
            );
        }
        logger_1.Logger.debug `Headers match table structure perfectly`;
    }
    catch (error) {
        if (error instanceof Error && error.name === "ConductorError") {
            throw error;
        }
        throw errors_1.ErrorFactory.connection("Error validating headers against table structure", {
            tableName,
            originalError: error,
        }, [
            "Check PostgreSQL connection and availability",
            "Verify table exists and you have access",
            "Ensure PostgreSQL service is running",
        ]);
    }
}
/**
 * Updates the progress display in the console
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
    process.stdout.write(`   └─ ${progressBar} | ` +
        `${processed}/${total} | ` +
        `⏱ ${(0, progressBar_1.formatDuration)(elapsedMs)} | ` +
        `🏁 ${eta} | ` +
        `⚡${recordsPerSecond} rows/sec`);
}
/**
 * Sends a batch of records to PostgreSQL
 */
async function sendBatchToPostgreSQL(client, records, tableName, headers, filePath, onFailure) {
    try {
        await (0, bulk_1.sendBulkInsertRequest)(client, records, tableName, headers, onFailure);
    }
    catch (error) {
        // If it's already a specific validation error, just rethrow it
        if (error instanceof Error && error.name === "ConductorError") {
            const conductorError = error;
            // Check if this is a data validation error (from our bulk handler)
            if (conductorError.message.includes("constraint violation") ||
                conductorError.message.includes("Bulk insert failed")) {
                // Rethrow without additional wrapping - the user already has specific info
                throw error;
            }
        }
        // For other unexpected errors, provide more appropriate suggestions
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("ECONNREFUSED") ||
            errorMessage.includes("ETIMEDOUT")) {
            throw errors_1.ErrorFactory.connection("Failed to connect to PostgreSQL", {
                filePath,
                tableName,
                originalError: error,
            }, [
                "Check that PostgreSQL is running",
                "Verify the connection details",
                "Check network connectivity",
            ]);
        }
        // For data validation errors, don't provide generic connection suggestions
        throw errors_1.ErrorFactory.validation("Data validation failed during upload", {
            filePath,
            tableName,
            originalError: error,
        }, [
            "Check the data constraint issues shown above",
            "Fix your CSV data to match the table schema",
            "Review the error log for detailed information",
        ]);
    }
}
