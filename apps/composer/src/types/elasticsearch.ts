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
