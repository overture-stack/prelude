/**
 * Elasticsearch Types
 *
 * Type definitions for Elasticsearch operations and responses.
 */

/**
 * Elasticsearch bulk operation response item
 */
export interface ESBulkResponseItem {
  index?: {
    _index: string;
    _type?: string;
    _id: string;
    _version?: number;
    result?: string;
    _shards?: {
      total: number;
      successful: number;
      failed: number;
    };
    status: number;
    error?: {
      type: string;
      reason: string;
      index_uuid?: string;
      shard?: string;
      index?: string;
    };
  };
}

/**
 * Elasticsearch bulk operation response
 */
export interface ESBulkResponse {
  took: number;
  errors: boolean;
  items: ESBulkResponseItem[];
}

/**
 * Elasticsearch index mapping property
 */
export interface ESMappingProperty {
  type: string;
  fields?: {
    [key: string]: {
      type: string;
      ignore_above?: number;
    };
  };
  properties?: {
    [key: string]: ESMappingProperty;
  };
}

/**
 * Elasticsearch index mapping
 */
export interface ESIndexMapping {
  properties: {
    [key: string]: ESMappingProperty;
  };
}

/**
 * Elasticsearch index settings
 */
export interface ESIndexSettings {
  number_of_shards: number;
  number_of_replicas: number;
  [key: string]: any;
}

/**
 * Elasticsearch index information response
 */
export interface ESIndexInfo {
  [indexName: string]: {
    aliases: Record<string, any>;
    mappings: ESIndexMapping;
    settings: {
      index: ESIndexSettings;
    };
  };
}
