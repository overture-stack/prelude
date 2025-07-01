// src/services/postgresql/index.ts
/**
 * PostgreSQL Service
 *
 * Main entry point for PostgreSQL functionality.
 * Provides client creation, connection validation, and bulk operations.
 */

export { createPostgresClient, validateConnection } from "./client";
export { sendBulkInsertRequest } from "./bulk";
