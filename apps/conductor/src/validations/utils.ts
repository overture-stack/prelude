/**
 * Common Validation Utilities
 *
 * Simple validators for common primitive values and configurations.
 * Enhanced with ErrorFactory patterns for consistent error handling.
 */

import { ErrorFactory } from "../utils/errors";
import { Logger } from "../utils/logger";

/**
 * Validates that a delimiter is a single character with enhanced error handling
 */
export function validateDelimiter(delimiter: string): void {
  if (!delimiter) {
    throw ErrorFactory.config("CSV delimiter not specified", "delimiter", [
      "Provide a delimiter: conductor upload -f data.csv --delimiter ';'",
      "Use common delimiters: ',' (comma), '\\t' (tab), ';' (semicolon)",
      "Set CSV_DELIMITER environment variable",
    ]);
  }

  if (typeof delimiter !== "string") {
    throw ErrorFactory.config(
      `Invalid delimiter type: ${typeof delimiter}`,
      "delimiter",
      [
        "Delimiter must be a string",
        "Use a single character like ',' or ';'",
        "Check command line argument format",
      ]
    );
  }

  if (delimiter.length !== 1) {
    throw ErrorFactory.config(
      `Invalid delimiter length: '${delimiter}' (${delimiter.length} characters)`,
      "delimiter",
      [
        "Delimiter must be exactly one character",
        "Common delimiters: ',' (comma), ';' (semicolon), '\\t' (tab)",
        "For tab delimiter, use: --delimiter $'\\t'",
        "Check for extra spaces or quotes around the delimiter",
      ]
    );
  }

  Logger.debug`Delimiter validated: '${delimiter.replace("\t", "\\t")}'`;
}
