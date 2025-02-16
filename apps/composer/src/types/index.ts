export interface SubmissionMetadata {
  submitter_id: string;
  processing_started: string;
  processed_at: string;
  source_file: string;
  record_number: number;
  hostname: string;
  username: string;
}

// Renamed from Record to DataRecord to avoid conflict with TypeScript's Record type
export interface DataRecord {
  submission_metadata: SubmissionMetadata;
  [key: string]: any; // Allow any string key with any value type
}

export interface Config {
  elasticsearch: {
    url: string;
    index: string;
    user: string;
    password: string;
  };
  batchSize: number;
  delimiter: string;
}

export interface ElasticsearchError extends Error {
  name: string;
}

/**
 * Elasticsearch field type definition
 */
export interface ElasticsearchField {
  type: 'keyword' | 'integer' | 'float' | 'date' | 'object' | 'boolean';
  null_value?: string;
  properties?: Record<string, ElasticsearchField>; // Using TypeScript's Record utility type
}

/**
 * Elasticsearch mapping definition
 */
export interface ElasticsearchMapping {
  index_patterns: string[];
  aliases: Record<string, object>; // Using TypeScript's Record utility type
  mappings: {
    properties: Record<string, ElasticsearchField>; // Using TypeScript's Record utility type
  };
  settings: {
    number_of_shards: number;
    number_of_replicas: number;
  };
}

// Basic value types
export type ValueType = 'string' | 'integer' | 'number' | 'boolean';
export type MatchCase = 'all' | 'any' | 'none';

// Range rule for numeric restrictions
export interface RangeRule {
  min?: number;
  max?: number;
  exclusiveMin?: number;
  exclusiveMax?: number;
}

// Field restriction types
export interface FieldRestrictions {
  required?: boolean;
  regex?: string;
  codeList?: any[];
  range?: RangeRule;
  compare?: ComparedFieldsRule;
  count?: number | RangeRule;
  empty?: boolean;
}

// Comparison relations for fields
export type CompareRelation =
  | 'equal'
  | 'notEqual'
  | 'contains'
  | 'containedIn'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lesserThan'
  | 'lesserThanOrEqual';

// Rule for comparing field values
export interface ComparedFieldsRule {
  fields: string | string[];
  relation: CompareRelation;
  case?: MatchCase;
}

// Base structure for meta data
export interface MetaData {
  [key: string]: string | number | boolean | string[] | number[] | MetaData;
}

// Conditional restriction structure
export interface ConditionalRestriction {
  if: {
    conditions: Array<{
      fields: string[];
      match: {
        value?: any;
        codeList?: any[];
        regex?: string;
        range?: RangeRule;
        count?: number | RangeRule;
        exists?: boolean;
      };
      arrayFieldCase?: MatchCase;
      case?: MatchCase;
    }>;
    case?: MatchCase;
  };
  then: FieldRestrictions | FieldRestrictions[];
  else?: FieldRestrictions | FieldRestrictions[];
}

// Field definition
export interface LecternField {
  name: string;
  description?: string;
  valueType: ValueType;
  meta?: MetaData;
  isArray?: boolean;
  delimiter?: string;
  restrictions?:
    | FieldRestrictions
    | ConditionalRestriction
    | Array<FieldRestrictions | ConditionalRestriction>;
  unique?: boolean;
}

// Schema definition
export interface LecternSchema {
  name: string;
  description?: string;
  meta?: MetaData;
  fields: LecternField[];
}

// Main dictionary interface
export interface LecternDictionary {
  name: string;
  version: string;
  description?: string;
  meta?: MetaData;
  schemas: LecternSchema[];
  references?: {
    [key: string]: any;
  };
}

/**
 * Arranger config definitions
 */

export interface ArrangerBaseConfig {
  documentType: 'file' | 'analysis';
  index: string;
}

export interface ExtendedField {
  displayName: string;
  fieldName: string;
}

export interface ArrangerExtendedConfig {
  extended: ExtendedField[];
}

export interface TableColumn {
  canChangeShow: boolean;
  fieldName: string;
  show: boolean;
  sortable: boolean;
  jsonPath?: string;
  query?: string;
}

export interface ArrangerTableConfig {
  table: {
    columns: TableColumn[];
  };
}

export interface FacetAggregation {
  active: boolean;
  fieldName: string;
  show: boolean;
}

export interface ArrangerFacetsConfig {
  facets: {
    aggregations: FacetAggregation[];
  };
}
