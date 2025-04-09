/**
 * Common Validation Utilities
 *
 * Simple validators for common primitive values and configurations.
 */

import { createValidationError } from "../utils/errors";
import { Logger } from "../utils/logger";

/**
 * Validates that a delimiter is a single character
 */
export function validateDelimiter(delimiter: string): void {
  if (!delimiter || delimiter.length !== 1) {
    throw createValidationError("Delimiter must be a single character", {
      provided: delimiter,
    });
  }
  Logger.debug`Delimiter validated: '${delimiter}'`;
}
