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

// Export from main validators
export * from "./csvValidator";
export * from "./elasticsearchValidator";
export * from "./fileValidator";
export * from "./environment";

// Export specific utilities
export { validateDelimiter } from "./utils";

// Export types and constants
export * from "../types/validations";
export * from "./constants";

// Re-export specific types for convenience
export type {
  ValidationResult,
  HeaderValidation,
  CSVValidationResult,
  IndexValidationResult,
  ConnectionValidationResult,
} from "../types/validations";
