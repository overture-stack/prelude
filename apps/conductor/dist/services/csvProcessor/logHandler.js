"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSVProcessingErrorHandler = void 0;
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
const progressBar_1 = require("./progressBar");
/**
 * Error handler for CSV processing operations.
 * Manages CSV-specific errors and generates appropriate error logs.
 * Updated to use error factory pattern for consistent error handling.
 */
class CSVProcessingErrorHandler {
    /**
     * Handles errors during CSV processing with enhanced error categorization
     *
     * @param error - The error that occurred
     * @param processedRecords - Number of records processed before error
     * @param isFirstLine - Whether the error occurred on the first line (headers)
     * @param delimiter - CSV delimiter character
     * @throws ConductorError with appropriate error code and helpful suggestions
     */
    static handleProcessingError(error, processedRecords, isFirstLine, delimiter) {
        // If it's already a ConductorError, preserve it
        if (error instanceof Error && error.name === "ConductorError") {
            throw error;
        }
        // Convert to string for guaranteed safe output
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (isFirstLine) {
            // First line errors are usually header parsing issues
            logger_1.Logger.errorString(`CSV header parsing failed: ${errorMessage}`);
            logger_1.Logger.tipString(`Make sure your CSV file uses '${delimiter}' as a delimiter`);
            throw errors_1.ErrorFactory.parsing("Failed to parse CSV headers", {
                delimiter,
                errorMessage,
                originalError: error,
            }, [
                `Verify '${delimiter}' is the correct delimiter`,
                "Check that the first line contains valid column headers",
                "Ensure headers don't contain special characters",
                "Verify the file encoding is UTF-8",
                "Common delimiters: , (comma), ; (semicolon), \\t (tab)",
            ]);
        }
        else {
            // General processing errors - categorize based on error content
            logger_1.Logger.errorString(`CSV processing failed after ${processedRecords} records: ${errorMessage}`);
            // Categorize errors based on content for better suggestions
            if (errorMessage.includes("ECONNREFUSED") ||
                errorMessage.includes("connection")) {
                throw errors_1.ErrorFactory.connection("Connection to Elasticsearch failed during CSV processing", {
                    recordsProcessed: processedRecords,
                    originalError: error,
                }, [
                    "Check Elasticsearch connection",
                    "Verify Elasticsearch is running and accessible",
                    "Check network connectivity",
                    "Review connection configuration",
                ]);
            }
            if (errorMessage.includes("index_not_found") ||
                errorMessage.includes("mapping")) {
                throw errors_1.ErrorFactory.validation("Elasticsearch index or mapping issue during CSV processing", {
                    recordsProcessed: processedRecords,
                    originalError: error,
                }, [
                    "Check that the target index exists",
                    "Verify index mapping is compatible with CSV structure",
                    "Create the index if it doesn't exist",
                    "Update mapping to accommodate CSV fields",
                ]);
            }
            if (errorMessage.includes("parse") ||
                errorMessage.includes("delimiter")) {
                throw errors_1.ErrorFactory.parsing("CSV parsing error during data processing", {
                    recordsProcessed: processedRecords,
                    delimiter,
                    originalError: error,
                }, [
                    `Verify '${delimiter}' is the correct delimiter`,
                    "Check for inconsistent column counts in data rows",
                    "Look for unescaped quotes or special characters",
                    "Ensure data format is consistent throughout the file",
                ]);
            }
            if (errorMessage.includes("memory") || errorMessage.includes("heap")) {
                throw errors_1.ErrorFactory.csv("Memory error during CSV processing", {
                    recordsProcessed: processedRecords,
                    originalError: error,
                }, [
                    "Reduce batch size to use less memory",
                    "Process smaller files or split large files",
                    "Increase available memory for the process",
                    "Check for memory leaks in processing logic",
                ]);
            }
            if (errorMessage.includes("permission") ||
                errorMessage.includes("EACCES")) {
                throw errors_1.ErrorFactory.file("File permission error during CSV processing", undefined, [
                    "Check file and directory permissions",
                    "Ensure read access to input files",
                    "Verify write access to output directories",
                    "Run with appropriate privileges if needed",
                ]);
            }
            // Generic CSV processing error
            throw errors_1.ErrorFactory.csv("CSV processing failed", {
                recordsProcessed: processedRecords,
                originalError: error,
            }, [
                "Check CSV file format and structure",
                "Verify file is not corrupted",
                "Ensure sufficient disk space and memory",
                "Use --debug for detailed error information",
                `Processing stopped after ${processedRecords} records`,
            ]);
        }
    }
    /**
     * Displays a summary of the CSV processing operation with enhanced formatting
     *
     * @param processed - Total number of processed records
     * @param failed - Number of failed records
     * @param startTime - When the processing started
     */
    static displaySummary(processed, failed, startTime) {
        try {
            const elapsedMs = Date.now() - startTime;
            const recordsPerSecond = Math.max(0.1, processed / Math.max(1, elapsedMs / 1000));
            const successfulRecords = Math.max(0, processed - failed); // Ensure it's never negative
            // Clear the current line
            process.stdout.write("\n");
            // Determine overall success status
            if (failed > 0) {
                if (successfulRecords > 0) {
                    logger_1.Logger.warnString(`Transfer to elasticsearch completed with partial errors`);
                }
                else {
                    logger_1.Logger.errorString(`Transfer to elasticsearch failed - no records processed successfully`);
                }
            }
            else if (processed === 0) {
                logger_1.Logger.warnString(`No records were processed`);
            }
            else {
                // Success message handled by postgresFullPipelineCommand
                logger_1.Logger.debug `Transfer to elasticsearch complete`;
            }
            // Print detailed summary - simplified for postgresFullPipelineCommand
            logger_1.Logger.debug `Total Records processed: ${processed}`;
            logger_1.Logger.debug `Records Successfully transferred: ${successfulRecords}`;
            if (failed > 0) {
                logger_1.Logger.debug `Records Failed to transfer: ${failed}`;
                logger_1.Logger.debug `Error logs available in debug output`;
                // Calculate failure rate
                const failureRate = ((failed / processed) * 100).toFixed(1);
                logger_1.Logger.debug `Failure rate: ${failureRate}%`;
                if (parseFloat(failureRate) > 10) {
                    logger_1.Logger.tipString("High failure rate detected - check data format and Elasticsearch configuration");
                }
            }
            logger_1.Logger.debug `Processing speed: ${Math.round(recordsPerSecond)} rows/sec`;
            logger_1.Logger.debug `Total processing time: ${(0, progressBar_1.formatDuration)(elapsedMs)}`;
            // Success rate insights
            if (processed > 0) {
                const successRate = ((successfulRecords / processed) * 100).toFixed(1);
                logger_1.Logger.debugString(`Success rate: ${successRate}%`);
            }
        }
        catch (error) {
            // Don't let summary display errors crash the application
            logger_1.Logger.debugString(`Error displaying processing summary: ${error}`);
            logger_1.Logger.infoString("Processing completed (summary display error)");
        }
    }
    /**
     * Logs detailed error information for debugging
     *
     * @param error - The error to log
     * @param context - Additional context information
     */
    static logDetailedError(error, context = {}) {
        try {
            logger_1.Logger.debugString("=== Detailed Error Information ===");
            if (error instanceof Error) {
                logger_1.Logger.debugString(`Error Type: ${error.name}`);
                logger_1.Logger.debugString(`Error Message: ${error.message}`);
                if (error.stack) {
                    logger_1.Logger.debugString(error.stack);
                }
            }
            else {
                logger_1.Logger.debugString(`Error: ${String(error)}`);
            }
            if (Object.keys(context).length > 0) {
                logger_1.Logger.debugString("Context Information:");
                for (const [key, value] of Object.entries(context)) {
                    logger_1.Logger.debugString(`  ${key}: ${JSON.stringify(value)}`);
                }
            }
            logger_1.Logger.debugString("=== End Error Information ===");
        }
        catch (logError) {
            // Prevent recursive errors in error logging
            console.error("Error logging detailed error information:", logError);
        }
    }
    /**
     * Provides suggestions based on common CSV processing issues
     *
     * @param errorType - Type of error encountered
     * @param context - Error context
     * @returns Array of helpful suggestions
     */
    static getErrorSuggestions(errorType, context = {}) {
        const suggestions = [];
        switch (errorType.toLowerCase()) {
            case "parsing":
                suggestions.push("Check CSV format and delimiter", "Verify quotes and escape characters", "Ensure consistent column counts");
                break;
            case "connection":
                suggestions.push("Verify Elasticsearch is running", "Check network connectivity", "Review connection configuration");
                break;
            case "validation":
                suggestions.push("Check data format and types", "Verify field mappings", "Ensure required fields are present");
                break;
            case "memory":
                suggestions.push("Reduce batch size", "Process smaller files", "Increase available memory");
                break;
            default:
                suggestions.push("Use --debug for detailed error information", "Check file format and permissions", "Verify configuration settings");
        }
        return suggestions;
    }
}
exports.CSVProcessingErrorHandler = CSVProcessingErrorHandler;
