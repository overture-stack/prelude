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
  type: 'keyword' | 'integer' | 'float' | 'date' | 'object';
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
