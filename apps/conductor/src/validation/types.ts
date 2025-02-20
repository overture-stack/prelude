/**
 * Types used across validation functions
 */

/**
 * Result of validation operations
 */
export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Structure representing header validation details
 */
export interface HeaderValidation {
  header: string;
  isValid: boolean;
  issues?: string[];
}

/**
 * Detailed validation results for CSV structure
 */
export interface CSVValidationResult extends ValidationResult {
  invalidHeaders?: HeaderValidation[];
  duplicateHeaders?: string[];
  genericHeaders?: string[];
}

/**
 * Elasticsearch index validation results
 */
export interface IndexValidationResult extends ValidationResult {
  exists: boolean;
  availableIndices?: string[];
  mappingValid?: boolean;
}

/**
 * Connection validation results
 */
export interface ConnectionValidationResult extends ValidationResult {
  connected: boolean;
  clusterHealth?: {
    status: string;
    nodeCount: number;
    unassignedShards: number;
  };
}
