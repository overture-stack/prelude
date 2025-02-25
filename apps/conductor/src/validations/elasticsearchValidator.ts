/**
 * Elasticsearch Validation Module
 *
 * Validators for Elasticsearch operations, connections, and configurations.
 */

import { Client } from "@elastic/elasticsearch";
import {
  ConductorError,
  ErrorCodes,
  createValidationError,
} from "../utils/errors";
import { Logger } from "../utils/logger";
import { ConnectionValidationResult, IndexValidationResult } from "../types";

/**
 * Validates Elasticsearch connection by making a ping request
 */
export async function validateElasticsearchConnection(
  client: Client,
  config: any
): Promise<ConnectionValidationResult> {
  try {
    Logger.info`Testing connection to Elasticsearch at ${config.elasticsearch.url}`;

    const startTime = Date.now();
    const response = await client.ping();
    const responseTime = Date.now() - startTime;

    Logger.info`Connected to Elasticsearch successfully in ${responseTime}ms`;

    return {
      valid: true,
      errors: [],
      responseTimeMs: responseTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error`Failed to connect to Elasticsearch: ${errorMessage}`;

    throw new ConductorError(
      `Failed to connect to Elasticsearch at ${config.elasticsearch.url}`,
      ErrorCodes.CONNECTION_ERROR,
      error
    );
  }
}

/**
 * Validates that an index exists
 */
export async function validateIndex(
  client: Client,
  indexName: string
): Promise<IndexValidationResult> {
  try {
    Logger.info`Checking if index ${indexName} exists`;

    const exists = await client.indices.exists({
      index: indexName,
    });

    if (!exists) {
      Logger.warn`Index ${indexName} does not exist. Will be created automatically.`;
    } else {
      Logger.info`Index ${indexName} exists`;
    }

    return {
      valid: true,
      errors: [],
      exists: !!exists,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error`Failed to check index existence: ${errorMessage}`;

    throw new ConductorError(
      `Failed to check if index ${indexName} exists`,
      ErrorCodes.INDEX_NOT_FOUND,
      error
    );
  }
}

/**
 * Validates that batch size is a positive number
 */
export function validateBatchSize(batchSize: number): void {
  if (!batchSize || isNaN(batchSize) || batchSize <= 0) {
    throw createValidationError("Batch size must be a positive number", {
      provided: batchSize,
    });
  }

  if (batchSize > 10000) {
    Logger.warn`Batch size ${batchSize} is quite large and may cause performance issues`;
  } else {
    Logger.debug`Batch size validated: ${batchSize}`;
  }
}
