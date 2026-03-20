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
 * Elasticsearch index validation result
 */
export interface IndexValidationResult extends ValidationResult {
  /** Whether the index exists */
  exists?: boolean;

  /** Index mappings if available */
  mappings?: Record<string, unknown>;

  /** Index settings if available */
  settings?: Record<string, unknown>;
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
