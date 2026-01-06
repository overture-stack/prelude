import * as fs from "fs"; // File system operations
import * as readline from "readline"; // Reading files line by line
import { parse as csvParse } from "csv-parse/sync"; // CSV parsing functionality
import { Logger } from "../../utils/logger";
import { ErrorFactory } from "../../utils/errors";

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
export async function countFileLines(filePath: string): Promise<number> {
  try {
    // Notify user that counting is in progress
    Logger.debug`csvParser: Beginning data transfer`;
    Logger.debug`csvParser: Calculating records to upload`;

    // Validate file exists first
    if (!fs.existsSync(filePath)) {
      throw ErrorFactory.file("Cannot count lines in file", filePath, [
        "Check that the file exists",
        "Verify the file path is correct",
        "Ensure you have read permissions",
      ]);
    }

    // Check file is readable
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (error) {
      throw ErrorFactory.file("File is not readable", filePath, [
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
      throw ErrorFactory.invalidFile("File appears to be empty", filePath, [
        "Ensure the file contains data",
        "Check if the file has at least a header row",
        "Verify the file wasn't truncated",
      ]);
    }

    Logger.debug`Found ${recordCount} data records in ${filePath}`;
    return recordCount;
  } catch (error) {
    // If it's already a ConductorError, rethrow it
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    // Handle file system errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("ENOENT")) {
      throw ErrorFactory.file("File not found", filePath, [
        "Check that the file exists",
        "Verify the file path spelling",
        "Ensure the file hasn't been moved or deleted",
      ]);
    }

    if (errorMessage.includes("EACCES")) {
      throw ErrorFactory.file("Permission denied", filePath, [
        "Check file permissions",
        "Ensure you have read access to the file",
        "Try running with appropriate privileges",
      ]);
    }

    if (errorMessage.includes("EISDIR")) {
      throw ErrorFactory.invalidFile(
        "Path is a directory, not a file",
        filePath,
        ["Specify a file path, not a directory", "Check the path and try again"]
      );
    }

    // Generic file error
    throw ErrorFactory.file("Error counting file lines", filePath, [
      "Check file integrity and format",
      "Ensure the file is not corrupted",
      "Try with a different file",
    ]);
  }
}

/**
 * Parses a single line of CSV data into an array of values
 * @param line - Raw CSV line string
 * @param delimiter - CSV delimiter character
 * @param isHeaderRow - Whether this is a header row (for logging)
 * @returns Array of parsed values from the CSV line
 */
export function parseCSVLine(
  line: string,
  delimiter: string,
  isHeaderRow: boolean = false
): any[] {
  try {
    // Validate inputs
    if (typeof line !== "string") {
      throw ErrorFactory.parsing(
        "Invalid line data type",
        { lineType: typeof line, isHeaderRow },
        ["Line must be a string", "Check data input format"]
      );
    }

    if (typeof delimiter !== "string" || delimiter.length !== 1) {
      throw ErrorFactory.parsing(
        "Invalid delimiter",
        { delimiter, delimiterType: typeof delimiter, isHeaderRow },
        [
          "Delimiter must be a single character",
          "Common delimiters: , ; | \\t",
          "Use --delimiter option to specify delimiter",
        ]
      );
    }

    // Check for empty line
    if (line.trim() === "") {
      Logger.debug`Skipping empty line`;
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
      Logger.debug`Parsing header row with delimiter '${delimiter}'`;
    } else {
      Logger.debug`Parsing data row with delimiter '${delimiter}'`;
    }

    // Parse the line
    const result = csvParse(line, parseOptions);

    // Validate result
    if (!Array.isArray(result)) {
      throw ErrorFactory.parsing(
        "CSV parsing returned invalid result",
        { line: line.substring(0, 100), delimiter, isHeaderRow },
        [
          "Check CSV format and structure",
          "Verify delimiter is correct",
          "Ensure proper quoting of fields",
        ]
      );
    }

    // For header rows, return wrapped in array for consistency
    if (isHeaderRow) {
      return result.length > 0 ? [result[0]] : [];
    }

    // For data rows, return normally
    return result;
  } catch (error) {
    // If it's already a ConductorError, rethrow it
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    // Handle CSV parsing errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    Logger.errorString(`Error parsing CSV line: ${errorMessage}`);
    Logger.debug`Failed line content: ${line.substring(0, 100)}${
      line.length > 100 ? "..." : ""
    }`;

    // Categorize parsing errors
    if (errorMessage.includes("quote") || errorMessage.includes("escape")) {
      throw ErrorFactory.parsing(
        "CSV quoting or escaping error",
        {
          line: line.substring(0, 100),
          delimiter,
          isHeaderRow,
          originalError: error,
        },
        [
          "Check for unmatched quotes in CSV data",
          "Ensure proper escaping of special characters",
          "Verify CSV format follows standards",
        ]
      );
    }

    if (errorMessage.includes("column") || errorMessage.includes("field")) {
      throw ErrorFactory.parsing(
        "CSV column parsing error",
        {
          line: line.substring(0, 100),
          delimiter,
          isHeaderRow,
          originalError: error,
        },
        [
          "Check for inconsistent column counts",
          "Ensure all rows have the same structure",
          `Verify '${delimiter}' is the correct delimiter`,
        ]
      );
    }

    // Generic parsing error
    throw ErrorFactory.parsing(
      "Failed to parse CSV line",
      {
        line: line.substring(0, 100),
        delimiter,
        isHeaderRow,
        originalError: error,
      },
      [
        "Check CSV format and structure",
        `Verify '${delimiter}' is the correct delimiter`,
        "Ensure data follows CSV standards",
        "Try with a different delimiter if needed",
      ]
    );
  }
}
