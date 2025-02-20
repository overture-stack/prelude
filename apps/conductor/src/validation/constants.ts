/**
 * Validation Constants
 *
 * Centralized constants used across validation functions.
 * Includes character restrictions, size limits, and naming patterns.
 */

export const VALIDATION_CONSTANTS = {
  /**
   * Characters not allowed in field names
   */
  INVALID_CHARS: [
    ":",
    ">",
    "<",
    ".",
    " ",
    ",",
    "/",
    "\\",
    "?",
    "#",
    "[",
    "]",
    "{",
    "}",
    '"',
    "*",
    "|",
    "+",
    "@",
    "&",
    "(",
    ")",
    "!",
    "^",
  ],

  /**
   * Maximum length for header names in bytes
   */
  MAX_HEADER_LENGTH: 255,

  /**
   * Reserved words that cannot be used as field names
   * Includes both Elasticsearch and GraphQL reserved words
   */
  RESERVED_WORDS: [
    // Elasticsearch reserved fields
    "_type",
    "_id",
    "_source",
    "_all",
    "_parent",
    "_field_names",
    "_routing",
    "_index",
    "_size",
    "_timestamp",
    "_ttl",
    "_meta",
    "_doc",

    // GraphQL reserved fields
    "__typename",
    "__schema",
    "__type",
  ],

  /**
   * Pattern for valid GraphQL-compliant field names
   * Must start with letter/underscore, contain only letters/numbers/underscores
   */
  GRAPHQL_NAME_PATTERN: /^[A-Za-z_][A-Za-z0-9_]*$/,

  /**
   * Recommended limits for batch processing
   */
  BATCH_SIZE: {
    MIN: 1,
    MAX: 10000,
    RECOMMENDED: {
      MIN: 500,
      MAX: 5000,
    },
  },
};
