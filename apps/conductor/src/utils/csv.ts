import * as fs from "fs"; // File system operations
import * as readline from "readline"; // Reading files line by line
import { parse as csvParse } from "csv-parse/sync"; // CSV parsing functionality
import chalk from "chalk";

/**
 * CSV Processing utility
 *
 * This module provides core functionality for processing CSV files:
 * - Counting lines in CSV files (excluding headers)
 * - Parsing individual CSV lines into arrays
 * - Converting CSV rows into structured records with proper type conversion
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
  process.stdout.write(chalk.blue.bold("🧮 Calculating records to upload\n\n"));

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
  return lines - 1; // Subtract header line from total count
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
      const result = csvParse(line, parseOptions);
      return result[0] ? [result[0]] : [];
    }

    // For data rows, parse normally
    return csvParse(line, parseOptions);
  } catch (error) {
    process.stdout.write(chalk.red(`\nError parsing CSV line: ${error}\n`));
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

export function createRecordFromRow(
  rowValues: any[],
  headers: string[],
  metadata: any
): Record<string, any> {
  // Initialize record with metadata
  const record: Record<string, any> = {
    submission_metadata: metadata,
  };

  // Process each value in the row
  headers.forEach((header, index) => {
    const rowValue = rowValues[index];

    // Handle null/empty values
    if (
      rowValue === undefined ||
      rowValue === null ||
      rowValue === "" ||
      (typeof rowValue === "string" && rowValue.trim() === "")
    ) {
      record[header] = null;
    }
    // Convert numeric strings to numbers
    else if (!isNaN(Number(rowValue)) && rowValue.toString().trim() !== "") {
      record[header] = Number(rowValue);
    }
    // Clean and store string values
    else {
      record[header] = rowValue.toString().trim();
    }
  });

  return record;
}
