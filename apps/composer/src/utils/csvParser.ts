import * as fs from "fs";
import { parse as csvParse } from "csv-parse/sync";
import { ComposerError, ErrorCodes } from "./errors";
import { CSVParseOptions } from "../types/validations";

/**
 * Core CSV parsing utilities for processing CSV files.
 * Handles basic CSV operations like parsing lines, reading headers,
 * and inferring data types.
 */

/**
 * Parses a single line of CSV data into an array of values.
 * Used for both header rows and data rows with special handling for headers.
 *
 * @param line - The CSV line to parse
 * @param delimiter - Character separating values (e.g., ',' or ';')
 * @param isHeaderRow - Whether this line contains column headers
 * @returns Array of string arrays (usually with just one inner array)
 * @throws ComposerError if parsing fails
 */
export function parseCSVLine(
  line: string,
  delimiter: string,
  isHeaderRow: boolean = false
): string[][] {
  try {
    const parseOptions: CSVParseOptions = {
      delimiter,
      trim: true,
      skipEmptyLines: true,
      relax_column_count: true,
    };

    // Parse the CSV line using csv-parse library
    const result = csvParse(line, parseOptions);

    // For header rows, we only need the first line
    if (isHeaderRow) {
      return result[0] ? [result[0]] : [];
    }

    return result;
  } catch (error) {
    throw new ComposerError(
      "Error parsing CSV line",
      ErrorCodes.PARSING_ERROR,
      { line, error }
    );
  }
}

/**
 * Reads and processes the headers and first data line from a CSV file.
 * This is useful for understanding the structure of the CSV and inferring data types.
 *
 * @param filePath - Path to the CSV file
 * @param delimiter - Character separating values
 * @returns Object containing headers array and sample data object
 * @throws ComposerError if file reading or parsing fails
 */
export function readCSVHeadersAndSample(
  filePath: string,
  delimiter: string
): { headers: string[]; sampleData: Record<string, string> } {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const [headerLine, sampleLine] = fileContent.split("\n");

    if (!headerLine) {
      throw new ComposerError(
        "CSV file is empty or has no headers",
        ErrorCodes.INVALID_FILE
      );
    }

    const headers = parseCSVLine(headerLine, delimiter, true)[0];
    if (!headers) {
      throw new ComposerError(
        "Failed to parse CSV headers",
        ErrorCodes.PARSING_ERROR
      );
    }

    const sampleData: Record<string, string> = {};
    if (sampleLine) {
      const sampleValues = parseCSVLine(sampleLine, delimiter, false)[0];
      if (sampleValues) {
        headers.forEach((header: string, index: number) => {
          sampleData[header] = sampleValues[index] || "";
        });
      }
    }

    return { headers, sampleData };
  } catch (error) {
    if (error instanceof ComposerError) {
      throw error;
    }
    throw new ComposerError(
      "Error reading CSV headers and sample",
      ErrorCodes.FILE_ERROR,
      error
    );
  }
}

/**
 * Determines the most appropriate data type for a given value.
 * Handles common data types found in CSV files:
 * - Boolean: true/false, yes/no, 1/0
 * - Number: Any valid numeric value
 * - Date: Any valid date string
 * - String: Default type for all other values
 *
 * @param value - String value to analyze
 * @returns Inferred type as a string
 */
export function inferValueType(
  value: string
): "string" | "number" | "boolean" | "date" {
  // Check for boolean values (includes common boolean representations)
  const lowerValue = value.toLowerCase().trim();
  if (["true", "false", "yes", "no", "1", "0"].includes(lowerValue)) {
    return "boolean";
  }

  // Check for numeric values (ensures non-empty string)
  if (!isNaN(Number(value)) && value.toString().trim() !== "") {
    return "number";
  }

  // Check for valid date values
  if (isValidDate(value)) {
    return "date";
  }

  // Default to string type if no other type matches
  return "string";
}

/**
 * Validates if a string represents a valid date.
 * Tests the string by attempting to create a Date object
 * and checking if it results in a valid timestamp.
 *
 * @param dateString - String to validate as a date
 * @returns boolean indicating if the string is a valid date
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
