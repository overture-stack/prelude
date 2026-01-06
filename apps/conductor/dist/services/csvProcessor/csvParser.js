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
exports.parseCSVLine = exports.countFileLines = void 0;
const fs = __importStar(require("fs")); // File system operations
const readline = __importStar(require("readline")); // Reading files line by line
const sync_1 = require("csv-parse/sync"); // CSV parsing functionality
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
/**
 * CSV Processing utility
 *
 * This module provides core functionality for processing CSV files:
 * - Counting lines in CSV files (excluding headers)
 * - Parsing individual CSV lines into arrays
 *
 * Used by the Conductor to prepare data for Elasticsearch ingestion.
 * Handles type conversion, null values, and submitter metadata.
 * Updated to use error factory pattern for consistent error handling.
 */
/**
 * Counts the total number of lines in a file, excluding the header
 * @param filePath - Path to the CSV file
 * @returns Promise resolving to number of data lines (excluding header)
 */
async function countFileLines(filePath) {
    try {
        // Notify user that counting is in progress
        logger_1.Logger.debug `csvParser: Beginning data transfer`;
        logger_1.Logger.debug `csvParser: Calculating records to upload`;
        // Validate file exists first
        if (!fs.existsSync(filePath)) {
            throw errors_1.ErrorFactory.file("Cannot count lines in file", filePath, [
                "Check that the file exists",
                "Verify the file path is correct",
                "Ensure you have read permissions",
            ]);
        }
        // Check file is readable
        try {
            fs.accessSync(filePath, fs.constants.R_OK);
        }
        catch (error) {
            throw errors_1.ErrorFactory.file("File is not readable", filePath, [
                "Check file permissions",
                "Ensure you have read access",
                "Try running with appropriate privileges",
            ]);
        }
        // Create a readline interface to read file line by line
        const rl = readline.createInterface({
            input: fs.createReadStream(filePath),
            crlfDelay: Infinity, // Handle different line endings
        });
        let lines = 0;
        // Count each line in file
        for await (const _ of rl) {
            lines++;
        }
        const recordCount = lines - 1; // Subtract header line from total count
        if (recordCount < 0) {
            throw errors_1.ErrorFactory.invalidFile("File appears to be empty", filePath, [
                "Ensure the file contains data",
                "Check if the file has at least a header row",
                "Verify the file wasn't truncated",
            ]);
        }
        logger_1.Logger.debug `Found ${recordCount} data records in ${filePath}`;
        return recordCount;
    }
    catch (error) {
        // If it's already a ConductorError, rethrow it
        if (error instanceof Error && error.name === "ConductorError") {
            throw error;
        }
        // Handle file system errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("ENOENT")) {
            throw errors_1.ErrorFactory.file("File not found", filePath, [
                "Check that the file exists",
                "Verify the file path spelling",
                "Ensure the file hasn't been moved or deleted",
            ]);
        }
        if (errorMessage.includes("EACCES")) {
            throw errors_1.ErrorFactory.file("Permission denied", filePath, [
                "Check file permissions",
                "Ensure you have read access to the file",
                "Try running with appropriate privileges",
            ]);
        }
        if (errorMessage.includes("EISDIR")) {
            throw errors_1.ErrorFactory.invalidFile("Path is a directory, not a file", filePath, ["Specify a file path, not a directory", "Check the path and try again"]);
        }
        // Generic file error
        throw errors_1.ErrorFactory.file("Error counting file lines", filePath, [
            "Check file integrity and format",
            "Ensure the file is not corrupted",
            "Try with a different file",
        ]);
    }
}
exports.countFileLines = countFileLines;
/**
 * Parses a single line of CSV data into an array of values
 * @param line - Raw CSV line string
 * @param delimiter - CSV delimiter character
 * @param isHeaderRow - Whether this is a header row (for logging)
 * @returns Array of parsed values from the CSV line
 */
function parseCSVLine(line, delimiter, isHeaderRow = false) {
    try {
        // Validate inputs
        if (typeof line !== "string") {
            throw errors_1.ErrorFactory.parsing("Invalid line data type", { lineType: typeof line, isHeaderRow }, ["Line must be a string", "Check data input format"]);
        }
        if (typeof delimiter !== "string" || delimiter.length !== 1) {
            throw errors_1.ErrorFactory.parsing("Invalid delimiter", { delimiter, delimiterType: typeof delimiter, isHeaderRow }, [
                "Delimiter must be a single character",
                "Common delimiters: , ; | \\t",
                "Use --delimiter option to specify delimiter",
            ]);
        }
        // Check for empty line
        if (line.trim() === "") {
            logger_1.Logger.debug `Skipping empty line`;
            return [];
        }
        const parseOptions = {
            delimiter: delimiter,
            trim: true,
            skipEmptyLines: true,
            relax_column_count: true,
        };
        // Log parsing attempt
        if (isHeaderRow) {
            logger_1.Logger.debug `Parsing header row with delimiter '${delimiter}'`;
        }
        else {
            logger_1.Logger.debug `Parsing data row with delimiter '${delimiter}'`;
        }
        // Parse the line
        const result = (0, sync_1.parse)(line, parseOptions);
        // Validate result
        if (!Array.isArray(result)) {
            throw errors_1.ErrorFactory.parsing("CSV parsing returned invalid result", { line: line.substring(0, 100), delimiter, isHeaderRow }, [
                "Check CSV format and structure",
                "Verify delimiter is correct",
                "Ensure proper quoting of fields",
            ]);
        }
        // For header rows, return wrapped in array for consistency
        if (isHeaderRow) {
            return result.length > 0 ? [result[0]] : [];
        }
        // For data rows, return normally
        return result;
    }
    catch (error) {
        // If it's already a ConductorError, rethrow it
        if (error instanceof Error && error.name === "ConductorError") {
            throw error;
        }
        // Handle CSV parsing errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.Logger.errorString(`Error parsing CSV line: ${errorMessage}`);
        logger_1.Logger.debug `Failed line content: ${line.substring(0, 100)}${line.length > 100 ? "..." : ""}`;
        // Categorize parsing errors
        if (errorMessage.includes("quote") || errorMessage.includes("escape")) {
            throw errors_1.ErrorFactory.parsing("CSV quoting or escaping error", {
                line: line.substring(0, 100),
                delimiter,
                isHeaderRow,
                originalError: error,
            }, [
                "Check for unmatched quotes in CSV data",
                "Ensure proper escaping of special characters",
                "Verify CSV format follows standards",
            ]);
        }
        if (errorMessage.includes("column") || errorMessage.includes("field")) {
            throw errors_1.ErrorFactory.parsing("CSV column parsing error", {
                line: line.substring(0, 100),
                delimiter,
                isHeaderRow,
                originalError: error,
            }, [
                "Check for inconsistent column counts",
                "Ensure all rows have the same structure",
                `Verify '${delimiter}' is the correct delimiter`,
            ]);
        }
        // Generic parsing error
        throw errors_1.ErrorFactory.parsing("Failed to parse CSV line", {
            line: line.substring(0, 100),
            delimiter,
            isHeaderRow,
            originalError: error,
        }, [
            "Check CSV format and structure",
            `Verify '${delimiter}' is the correct delimiter`,
            "Ensure data follows CSV standards",
            "Try with a different delimiter if needed",
        ]);
    }
}
exports.parseCSVLine = parseCSVLine;
