/**
 * Validation Constants
 *
 * Shared constants used throughout the validation system.
 */

/**
 * Allowed file extensions for processing
 */
export const ALLOWED_EXTENSIONS = [".csv", ".tsv"];

export const VALIDATION_CONSTANTS = {
  INVALID_CHARS: ["$", "%", "^", "&"],
  MAX_HEADER_LENGTH: 50,
  RESERVED_WORDS: ["null", "undefined", "class", "function"],
  GRAPHQL_NAME_PATTERN: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
};
