/**
 * Configuration Types
 *
 * Type definitions for application configuration.
 */

/**
 * Elasticsearch configuration
 */
export interface ElasticsearchConfig {
  /** Elasticsearch server URL */
  url: string;

  /** Target index name */
  index: string;

  /** Optional username for authentication */
  user?: string;

  /** Optional password for authentication */
  password?: string;
}

/**
 * Main application configuration
 */
export interface Config {
  /** Elasticsearch-specific configuration */
  elasticsearch: ElasticsearchConfig;

  /** Batch size for processing and sending records */
  batchSize: number;

  /** CSV delimiter character */
  delimiter: string;
}

/**
 * Environment configuration loaded from .env or environment variables
 */
export interface EnvConfig {
  /** Elasticsearch server URL */
  elasticsearchUrl: string;

  /** Default index name if not specified in CLI */
  indexName?: string;

  /** Username for Elasticsearch authentication */
  esUser?: string;

  /** Password for Elasticsearch authentication */
  esPassword?: string;

  /** Logging level (debug, info, warn, error) */
  logLevel: string;
}
