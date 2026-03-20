/**
 * Elasticsearch Service
 *
 * Main entry point for Elasticsearch functionality.
 * Re-exports functions from specialized modules.
 */

// Re-export client functionality
export { createClientFromConfig, validateConnection } from "./client";

// Re-export bulk operations
export { sendBulkWriteRequest } from "./bulk";
