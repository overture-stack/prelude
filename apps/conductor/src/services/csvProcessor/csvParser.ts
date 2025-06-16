// src/services/csvProcessor/csvParser.ts - Enhanced with ErrorFactory patterns
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
 * Enhanced with ErrorFactory patterns for consistent error handling.
 */

/**
 * Counts the total number of lines in a file, excluding the header
 * Enhanced with comprehensive error handling
 *
 * @param filePath - Path to the CSV file
 * @returns Promise resolving to number of data lines (excluding header)
 */
export async function countFileLines(filePath: string): Promise<number> {
  // Notify user that counting is in progress
  Logger.debug`csvParser: Beginning data transfer`;
  Logger.debug`csvParser: Calculating records to upload`;

  // Enhanced file validation
  if (!filePath || typeof filePath !== "string") {
    throw ErrorFactory.args(
      "File path is required for line counting",
      "countFileLines",
      [
        "Provide a valid file path",
        "Ensure path is a non-empty string",
        "Check file path parameter",
      ]
    );
  }

  if (!fs.existsSync(filePath)) {
    throw ErrorFactory.file(
      `CSV file not found for line counting: ${filePath}`,
      filePath,
      [
        "Check that the file path is correct",
        "Ensure the file exists at the specified location",
        "Verify file permissions allow read access",
        `Current directory: ${process.cwd()}`,
      ]
    );
  }

  // Check file readability
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch (error) {
    throw ErrorFactory.file(`CSV file is not readable: ${filePath}`, filePath, [
      "Check file permissions",
      "Ensure the file is not locked by another process",
      "Verify you have read access to the file",
      "Try copying the file to a different location",
    ]);
  }

  // Check file size
  let fileStats: fs.Stats;
  try {
    fileStats = fs.statSync(filePath);
  } catch (error) {
    throw ErrorFactory.file(
      `Cannot read file statistics: ${filePath}`,
      filePath,
      [
        "Check file exists and is accessible",
        "Verify file permissions",
        "Ensure file is not corrupted",
        "Try using absolute path if relative path fails",
      ]
    );
  }

  if (fileStats.size === 0) {
    throw ErrorFactory.file(`CSV file is empty: ${filePath}`, filePath, [
      "Ensure the file contains data",
      "Check if the file was properly created",
      "Verify the file is not corrupted",
      "CSV files must have at least a header row",
    ]);
  }

  let rl: readline.Interface;

  try {
    // Create a readline interface to read file line by line
    rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity, // Handle different line endings
    });
  } catch (error) {
    throw ErrorFactory.file(
      `Failed to open CSV file for reading: ${filePath}`,
      filePath,
      [
        "Check file permissions allow read access",
        "Ensure file is not locked by another process",
        "Verify file encoding is supported",
        "Try copying the file to a different location",
      ]
    );
  }

  let lines = 0;

  try {
    // Count each line in file
    for await (const _ of rl) {
      lines++;
    }
  } catch (error) {
    // Ensure readline interface is closed
    try {
      rl.close();
    } catch (closeError) {
      Logger.debug`Error closing readline interface: ${closeError}`;
    }

    throw ErrorFactory.file(
      `Error reading CSV file during line counting: ${
        error instanceof Error ? error.message : String(error)
      }`,
      filePath,
      [
        "Check file is not corrupted",
        "Verify file encoding (should be UTF-8)",
        "Ensure file is complete and not truncated",
        "Try opening the file in a text editor to verify content",
      ]
    );
  }

  // Ensure readline interface is properly closed
  try {
    rl.close();
  } catch (closeError) {
    Logger.debug`Error closing readline interface: ${closeError}`;
  }

  if (lines === 0) {
    throw ErrorFactory.csv(
      `CSV file contains no lines: ${filePath}`,
      filePath,
      undefined,
      [
        "Ensure the file contains data",
        "Check if the file was properly created",
        "Verify the file is not empty",
        "CSV files must have at least a header row",
      ]
    );
  }

  const recordCount = lines - 1; // Subtract header line from total count

  if (recordCount < 0) {
    throw ErrorFactory.csv(
      `CSV file has no data rows: ${filePath}`,
      filePath,
      undefined,
      [
        "Ensure the file contains data beyond the header row",
        "Check if data was properly written to the file",
        "Verify the CSV format is correct",
        "CSV files need both headers and data rows",
      ]
    );
  }

  Logger.debug`Found ${recordCount} data records in ${filePath}`;
  return recordCount;
}

/**
 * Parses a single line of CSV data into an array of values
 * Enhanced with comprehensive error handling and validation
 *
 * @param line - Raw CSV line string
 * @param delimiter - CSV delimiter character
 * @param isHeaderRow - Whether this is a header row (for enhanced logging)
 * @returns Array of parsed values from the CSV line
 */
export function parseCSVLine(
  line: string,
  delimiter: string,
  isHeaderRow: boolean = false
): any[] {
  // Enhanced parameter validation
  if (typeof line !== "string") {
    throw ErrorFactory.args(
      "CSV line must be a string for parsing",
      "parseCSVLine",
      [
        "Ensure line parameter is a string",
        "Check data source for correct format",
        "Verify file reading process",
      ]
    );
  }

  if (!delimiter || typeof delimiter !== "string") {
    throw ErrorFactory.args(
      "CSV delimiter is required for parsing",
      "parseCSVLine",
      [
        "Provide a valid delimiter character",
        "Common delimiters: ',' (comma), '\\t' (tab), ';' (semicolon)",
        "Check configuration settings",
      ]
    );
  }

  if (delimiter.length !== 1) {
    throw ErrorFactory.args(
      `Invalid delimiter length: '${delimiter}' (must be exactly 1 character)`,
      "parseCSVLine",
      [
        "Delimiter must be exactly one character",
        "Common delimiters: ',' (comma), ';' (semicolon), '\\t' (tab)",
        "Check delimiter configuration",
      ]
    );
  }

  // Handle empty lines
  if (line.trim() === "") {
    if (isHeaderRow) {
      throw ErrorFactory.csv("Header row is empty", undefined, 1, [
        "Ensure the first row contains column headers",
        "Check CSV file format",
        "Verify file is not corrupted",
      ]);
    }
    Logger.debug`Skipping empty line during CSV parsing`;
    return [];
  }

  try {
    const parseOptions = {
      delimiter: delimiter,
      trim: true,
      skipEmptyLines: true,
      relax_column_count: true,
      relaxQuotes: true, // Handle improperly quoted fields
    };

    // Enhanced logging based on row type
    if (isHeaderRow) {
      Logger.debug`Parsing header row with delimiter '${delimiter.replace(
        "\t",
        "\\t"
      )}'`;
    } else {
      Logger.debug`Parsing data row with delimiter '${delimiter.replace(
        "\t",
        "\\t"
      )}'`;
    }

    // Parse the line
    const result = csvParse(line, parseOptions);

    if (!result || !Array.isArray(result)) {
      throw ErrorFactory.csv(
        "CSV parsing returned invalid result",
        undefined,
        isHeaderRow ? 1 : undefined,
        [
          "Check CSV line format and structure",
          "Verify delimiter is correct for this file",
          "Ensure proper CSV escaping for special characters",
          "Check for malformed CSV syntax",
          `Current delimiter: '${delimiter.replace("\t", "\\t")}'`,
        ]
      );
    }

    if (result.length === 0) {
      if (isHeaderRow) {
        throw ErrorFactory.csv("No data found in header row", undefined, 1, [
          "Ensure the header row contains column names",
          "Check CSV format and delimiter",
          "Verify file is not corrupted",
        ]);
      }
      Logger.debug`CSV line produced no data after parsing`;
      return [];
    }

    const parsedData = result[0];

    if (!Array.isArray(parsedData)) {
      throw ErrorFactory.csv(
        "Parsed CSV data is not in expected array format",
        undefined,
        isHeaderRow ? 1 : undefined,
        [
          "Check CSV parsing library compatibility",
          "Verify CSV line structure is valid",
          "Ensure delimiter matches file format",
          "Check for unusual CSV formatting",
          `Current delimiter: '${delimiter.replace("\t", "\\t")}'`,
        ]
      );
    }

    // Enhanced validation for header rows
    if (isHeaderRow) {
      const emptyHeaders = parsedData.filter(
        (header, index) => !header || header.trim() === ""
      );

      if (emptyHeaders.length > 0) {
        throw ErrorFactory.csv(
          `Empty headers detected in CSV (${emptyHeaders.length} of ${parsedData.length})`,
          undefined,
          1,
          [
            "Ensure all columns have header names",
            "Remove empty columns from the CSV",
            "Check for extra delimiters in the header row",
            "Verify CSV format is correct",
          ]
        );
      }

      Logger.debug`Successfully parsed ${parsedData.length} headers`;
    }

    return [parsedData];
  } catch (error) {
    // Enhanced error handling with context
    const rowType = isHeaderRow ? "header" : "data";
    const linePreview =
      line.length > 100 ? `${line.substring(0, 100)}...` : line;

    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    // Handle CSV parsing specific errors
    if (error instanceof Error) {
      if (error.message.includes("Invalid")) {
        throw ErrorFactory.csv(
          `Invalid CSV format in ${rowType} row: ${error.message}`,
          undefined,
          isHeaderRow ? 1 : undefined,
          [
            `Check ${rowType} row format and structure`,
            `Verify delimiter '${delimiter.replace("\t", "\\t")}' is correct`,
            "Ensure proper CSV escaping for special characters",
            "Check for unmatched quotes or malformed fields",
            `Problem line: ${linePreview}`,
          ]
        );
      }
    }

    Logger.error`Error parsing CSV ${rowType} row: ${
      error instanceof Error ? error.message : String(error)
    }`;
    Logger.debug`Failed line content: ${linePreview}`;

    throw ErrorFactory.csv(
      `Failed to parse CSV ${rowType} row`,
      undefined,
      isHeaderRow ? 1 : undefined,
      [
        `Check ${rowType} row format and delimiter`,
        `Verify delimiter '${delimiter.replace(
          "\t",
          "\\t"
        )}' is correct for this file`,
        "Ensure proper CSV format and escaping",
        "Check file encoding (should be UTF-8)",
        `Problem line: ${linePreview}`,
      ]
    );
  }
}
