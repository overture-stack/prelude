export interface ElasticsearchField {
  type:
    | "keyword"
    | "integer"
    | "float"
    | "date"
    | "object"
    | "boolean"
    | "nested"
    | "text";
  null_value?: string;
  properties?: Record<string, ElasticsearchField>;
}

export interface ElasticsearchMapping {
  index_patterns: string[];
  aliases: Record<string, object>;
  mappings: {
    properties: Record<string, ElasticsearchField>;
  };
  settings: {
    number_of_shards: number;
    number_of_replicas: number;
  };
}

export interface ElasticsearchError extends Error {
  name: string;
}
