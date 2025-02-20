/**
 * Validation Module
 *
 * A comprehensive set of validation utilities for ensuring data integrity,
 * system readiness, and configuration correctness before processing CSV
 * files into Elasticsearch.
 *
 * Key Features:
 * - File system validation
 * - CSV structure and content validation
 * - Elasticsearch connection and index validation
 * - Detailed error reporting with actionable feedback
 * - Type-safe validation results
 *
 * @module validation
 */

export * from "./csvValidator";
export * from "./elasticsearchValidator";
export * from "./fileValidator";
export * from "./types";
export * from "./constants";

// Re-export specific types for convenience
export type {
  ValidationResult,
  HeaderValidation,
  CSVValidationResult,
  IndexValidationResult,
  ConnectionValidationResult,
} from "./types";
