/**
 * Validation Constants
 *
 * Shared constants used throughout the validation system.
 */

/**
 * Allowed file extensions for processing
 */
export const ALLOWED_EXTENSIONS = [".csv", ".tsv"];

/**
 * Maximum number of rows to sample when validating CSV files
 */
export const CSV_SAMPLE_SIZE = 1000;

/**
 * Timeout in milliseconds for Elasticsearch connection tests
 */
export const ES_CONNECTION_TIMEOUT = 5000; // 5 seconds

/**
 * Maximum number of CSV header columns allowed
 */
export const MAX_HEADER_COLUMNS = 1000;

/**
 * Minimum number of CSV header columns required
 */
export const MIN_HEADER_COLUMNS = 1;

export const VALIDATION_CONSTANTS = {
  INVALID_CHARS: ["$", "%", "^", "&"],
  MAX_HEADER_LENGTH: 50,
  RESERVED_WORDS: ["null", "undefined", "class", "function"],
  GRAPHQL_NAME_PATTERN: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
};
