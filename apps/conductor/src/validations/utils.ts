/**
 * Common Validation Utilities
 *
 * Simple validators for common primitive values and configurations.
 * Updated to use error factory pattern for consistent error handling.
 */

import { ErrorFactory } from "../utils/errors";
import { Logger } from "../utils/logger";

/**
 * Validates that a delimiter is a single character
 */
export function validateDelimiter(delimiter: string): void {
  if (!delimiter || delimiter.length !== 1) {
    throw ErrorFactory.validation(
      "Delimiter must be a single character",
      {
        provided: delimiter,
        length: delimiter?.length || 0,
        type: typeof delimiter,
      },
      [
        "Use a single character as delimiter",
        "Common delimiters: , (comma), ; (semicolon), \\t (tab)",
        "Example: --delimiter ,",
      ]
    );
  }
  Logger.debug`Delimiter validated: '${delimiter}'`;
}
