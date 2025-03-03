/**
 * Elasticsearch Service
 *
 * Main entry point for Elasticsearch functionality.
 * Re-exports functions from specialized modules.
 */

// Re-export client functionality
export {
  createClient,
  createClientFromConfig,
  validateConnection,
  type ESClientOptions,
} from "./client";

// Re-export index operations
export {
  indexExists,
  createIndex,
  deleteIndex,
  updateIndexSettings,
} from "./indices";

// Re-export bulk operations
export {
  sendBulkWriteRequest,
  sendBatchToElasticsearch,
  type BulkOptions,
} from "./bulk";

// Re-export template operations
export {
  templateExists,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "./templates";

// Re-export aliases functionality if implemented
// export { ... } from './aliases';
