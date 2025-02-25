/**
 * CLI Validation Module
 *
 * Validates CLI options and arguments before processing.
 */

import { createValidationError } from "../utils/errors";
import { Logger } from "../utils/logger";

/**
 * Validates that required CLI options are provided and have valid values
 */
export function validateCliOptions(options: any): void {
  Logger.debug("CLI Options Validation");

  // Validate that files are provided
  if (!options.files || options.files.length === 0) {
    throw createValidationError(
      "No input files specified. Use the --files option to specify input files.",
      { parameter: "files", expected: "at least one file path" }
    );
  }

  // Log the number of files
  Logger.debug`Input files specified: ${options.files.length} file(s)`;

  // List all input files
  if (options.files.length > 0) {
    Logger.debug("Input files", options.files);
  }

  // Validate batch size if provided
  if (options.batchSize) {
    const batchSize = parseInt(options.batchSize, 10);
    if (isNaN(batchSize) || batchSize <= 0) {
      throw createValidationError("Batch size must be a positive number", {
        parameter: "batchSize",
        provided: options.batchSize,
        expected: "positive number",
      });
    }
    Logger.info`Batch size is valid: ${batchSize}`;
  }

  // Validate delimiter if provided
  if (options.delimiter && options.delimiter.length !== 1) {
    throw createValidationError("Delimiter must be a single character", {
      parameter: "delimiter",
      provided: options.delimiter,
      expected: "single character",
    });
  }

  // Log all validated options
  Logger.debug`All CLI options are valid`;
  Logger.debugObject("Validated CLI options", options);
}
