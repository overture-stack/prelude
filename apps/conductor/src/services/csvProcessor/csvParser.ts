import * as fs from "fs"; // File system operations
import * as readline from "readline"; // Reading files line by line
import { parse as csvParse } from "csv-parse/sync"; // CSV parsing functionality
import { Logger } from "../../utils/logger";

/**
 * CSV Processing utility
 *
 * This module provides core functionality for processing CSV files:
 * - Counting lines in CSV files (excluding headers)
 * - Parsing individual CSV lines into arrays
 *
 * Used by the Conductor to prepare data for Elasticsearch ingestion.
 * Handles type conversion, null values, and submitter metadata.
 */

/**
 * Counts the total number of lines in a file, excluding the header
 * @param filePath - Path to the CSV file
 * @returns Promise resolving to number of data lines (excluding header)
 */

export async function countFileLines(filePath: string): Promise<number> {
  // Notify user that counting is in progress

  Logger.debug(`csvParser: Beginning data transfer`);
  Logger.debug(`csvParser: Calculating records to upload`);

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
  Logger.debug`Found ${recordCount} data records in ${filePath}`;
  return recordCount;
}

/**
 * Parses a single line of CSV data into an array of values
 * @param line - Raw CSV line string
 * @param delimiter - CSV delimiter character
 * @returns Array of parsed values from the CSV line
 */

export function parseCSVLine(
  line: string,
  delimiter: string,
  isHeaderRow: boolean = true
): any[] {
  try {
    const parseOptions = {
      delimiter: delimiter,
      trim: true,
      skipEmptyLines: true,
      relax_column_count: true,
    };

    // If it's a header row, only parse the first line
    if (isHeaderRow) {
      Logger.debug`Parsing header row with delimiter '${delimiter}'`;
      const result = csvParse(line, parseOptions);
      return result[0] ? [result[0]] : [];
    }

    // For data rows, parse normally
    Logger.debug`Parsing data row with delimiter '${delimiter}'`;
    return csvParse(line, parseOptions);
  } catch (error) {
    Logger.error`Error parsing CSV line: ${
      error instanceof Error ? error.message : String(error)
    }`;
    Logger.debug`Failed line content: ${line.substring(0, 100)}${
      line.length > 100 ? "..." : ""
    }`;
    return [];
  }
}
