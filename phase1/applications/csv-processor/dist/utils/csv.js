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
exports.countFileLines = countFileLines;
exports.parseCSVLine = parseCSVLine;
exports.createRecordFromRow = createRecordFromRow;
const fs = __importStar(require("fs")); // File system operations
const readline = __importStar(require("readline")); // Reading files line by line
const sync_1 = require("csv-parse/sync"); // CSV parsing functionality
const chalk_1 = __importDefault(require("chalk"));
/**
* CSV Processing utility
*
* This module provides core functionality for processing CSV files:
* - Counting lines in CSV files (excluding headers)
* - Parsing individual CSV lines into arrays
* - Converting CSV rows into structured records with proper type conversion
*
* Used by the CSV processor to prepare data for Elasticsearch ingestion.
* Handles type conversion, null values, and submitter metadata.
*/
/**
* Counts the total number of lines in a file, excluding the header
* @param filePath - Path to the CSV file
* @returns Promise resolving to number of data lines (excluding header)
*/
async function countFileLines(filePath) {
    // Notify user that counting is in progress
    process.stdout.write(chalk_1.default.blue.bold('🧮 Calculating records to upload\n\n'));
    // Create a readline interface to read file line by line
    const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity // Handle different line endings
    });
    let lines = 0;
    // Count each line in file
    for await (const _ of rl) {
        lines++;
    }
    return lines - 1; // Subtract header line from total count
}
/**
* Parses a single line of CSV data into an array of values
* @param line - Raw CSV line string
* @param delimiter - CSV delimiter character
* @returns Array of parsed values from the CSV line
*/
function parseCSVLine(line, delimiter, isHeaderRow = true) {
    try {
        const parseOptions = {
            delimiter: delimiter,
            trim: true,
            skipEmptyLines: true,
            relax_column_count: true
        };
        // If it's a header row, only parse the first line
        if (isHeaderRow) {
            const result = (0, sync_1.parse)(line, parseOptions);
            return result[0] ? [result[0]] : [];
        }
        // For data rows, parse normally
        return (0, sync_1.parse)(line, parseOptions);
    }
    catch (error) {
        process.stdout.write(chalk_1.default.red(`\nError parsing CSV line: ${error}\n`));
        return [];
    }
}
/**
* Creates a record object from CSV row data with proper type conversion
* @param rowValues - Array of values from CSV row
* @param headers - Array of column headers
* @param metadata - Additional metadata to include in record
* @returns Record object with processed values and metadata
*/
function createRecordFromRow(rowValues, headers, metadata) {
    // Initialize record with metadata
    const record = {
        submission_metadata: metadata
    };
    // Process each value in the row
    headers.forEach((header, index) => {
        const rowValue = rowValues[index];
        // Handle null/empty values
        if (rowValue === undefined || rowValue === null ||
            rowValue === '' || (typeof rowValue === 'string' && rowValue.trim() === '')) {
            record[header] = null;
        }
        // Convert numeric strings to numbers
        else if (!isNaN(Number(rowValue)) && rowValue.toString().trim() !== '') {
            record[header] = Number(rowValue);
        }
        // Clean and store string values
        else {
            record[header] = rowValue.toString().trim();
        }
    });
    return record;
}
