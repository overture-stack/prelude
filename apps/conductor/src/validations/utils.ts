/**
 * Common Validation Utilities
 *
 * Validators for common primitive values and shared parsing helpers.
 */

import { ErrorFactory } from "../utils/errors";
import { Logger } from "../utils/logger";

/**
 * Parses a "host:port" string into its components.
 * Returns the host and port as separate values; falls back to `defaultPort`
 * when no port is present in the string.
 */
export function parseHostPort(
  hostPort: string,
  defaultPort: string
): { host: string; port: number } {
  if (hostPort.includes(":")) {
    const [host, port] = hostPort.split(":");
    return { host, port: parseInt(port) || parseInt(defaultPort) };
  }
  return { host: hostPort, port: parseInt(defaultPort) };
}

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
