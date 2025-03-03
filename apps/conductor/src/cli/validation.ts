/**
 * CLI Validation Module
 *
 * Validates CLI options and arguments before processing.
 */

import { createValidationError } from "../utils/errors";
import { Logger } from "../utils/logger";
import { CLIprofile } from "./index";

/**
 * Validates that required CLI options are provided and have valid values
 * @param options The CLI options to validate
 * @param profile The command profile being executed
 */
export function validateCliOptions(
  options: any,
  profile: CLIprofile = "upload"
): void {
  Logger.debug("CLI Options Validation");

  // Validate based on command profile
  switch (profile) {
    case "upload":
      validateUploadOptions(options);
      break;
    case "indexManagement":
      validateSetupIndicesOptions(options);
      break;
    default:
      // By default, use upload validation for backward compatibility
      validateUploadOptions(options);
  }

  // Log all validated options
  Logger.debug`All CLI options are valid`;
  Logger.debugObject("Validated CLI options", options);
}

/**
 * Validates options specific to the upload command
 */
function validateUploadOptions(options: any): void {
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
}

/**
 * Validates options specific to the setupIndices command
 */
function validateSetupIndicesOptions(options: any): void {
  // No template file validation here - we'll check existence in the command
  // Just log the options for debugging purposes
  if (options.templateFile) {
    Logger.debug`Template file specified: ${options.templateFile}`;
  }

  if (options.templateName) {
    Logger.debug`Template name specified: ${options.templateName}`;
  }

  if (options.indexName) {
    Logger.debug`Index name specified: ${options.indexName}`;
  }

  if (options.aliasName) {
    Logger.debug`Alias name specified: ${options.aliasName}`;
  }
}
