/**
 * Validation Types
 *
 * Type definitions for the validation system.
 * Only export what's used by external modules.
 */

/**
 * Basic validation result returned by all validators
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** List of validation errors */
  errors: string[];

  /** Optional warnings that don't fail validation */
  warnings?: string[];
}

/**
 * Header validation result with field information - Keep internal if not used externally
 */
interface HeaderValidation extends ValidationResult {
  /** List of valid fields */
  fields?: string[];

  /** List of invalid fields */
  invalidFields?: string[];
}

/**
 * Detailed CSV validation result - Keep internal if not used externally
 */
interface CSVValidationResult extends ValidationResult {
  /** Header validation result */
  header?: HeaderValidation;

  /** Number of rows in the CSV */
  rowCount?: number;

  /** Number of rows sampled for validation */
  sampleSize?: number;

  /** Detected or used delimiter */
  delimiter?: string;
}

/**
 * Elasticsearch index validation result
 */
export interface IndexValidationResult extends ValidationResult {
  /** Whether the index exists */
  exists?: boolean;

  /** Index mappings if available */
  mappings?: any;

  /** Index settings if available */
  settings?: any;
}

/**
 * Elasticsearch connection validation result
 */
export interface ConnectionValidationResult extends ValidationResult {
  /** Elasticsearch version */
  version?: string;

  /** Cluster name */
  clusterName?: string;

  /** Response time in milliseconds */
  responseTimeMs?: number;
}
