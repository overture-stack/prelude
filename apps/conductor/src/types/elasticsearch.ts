/**
 * Elasticsearch Types
 *
 * Type definitions for Elasticsearch operations and responses.
 * Only export types that are used by external modules.
 */

/**
 * Elasticsearch bulk operation response item - Keep internal
 */
interface ESBulkResponseItem {
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
 * Elasticsearch bulk operation response - Keep internal
 */
interface ESBulkResponse {
  took: number;
  errors: boolean;
  items: ESBulkResponseItem[];
}

/**
 * Elasticsearch index mapping property - Keep internal
 */
interface ESMappingProperty {
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
 * Elasticsearch index mapping - Keep internal
 */
interface ESIndexMapping {
  properties: {
    [key: string]: ESMappingProperty;
  };
}

/**
 * Elasticsearch index settings - Keep internal
 */
interface ESIndexSettings {
  number_of_shards: number;
  number_of_replicas: number;
  [key: string]: any;
}

/**
 * Elasticsearch index information response - Keep internal
 */
interface ESIndexInfo {
  [indexName: string]: {
    aliases: Record<string, any>;
    mappings: ESIndexMapping;
    settings: {
      index: ESIndexSettings;
    };
  };
}

export {};
