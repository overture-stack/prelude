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
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log the error message
    Logger.error`Failed to connect to Elasticsearch: ${errorMessage}`;

    // Add a warning with the override command info
    Logger.commandValueTip(
      "Check Elasticsearch is running and that the correct URL and auth params are in use",
      "--url <elasticsearch-url> -u <username> -p <password>"
    );

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

    // Use the more reliable get method with a try/catch
    try {
      const { body } = await client.indices.get({ index: indexName });

      // Check if we actually got back information about the requested index
      if (!body || !body[indexName]) {
        Logger.error`Index ${indexName} not found in response`;
        throw new ConductorError(
          `Index ${indexName} not found`,
          ErrorCodes.INDEX_NOT_FOUND
        );
      }

      Logger.info`Index ${indexName} exists`;

      return {
        valid: true,
        errors: [],
        exists: true,
      };
    } catch (indexError: any) {
      // Check if the error is specifically about the index not existing
      if (
        indexError.meta &&
        indexError.meta.body &&
        (indexError.meta.body.error.type === "index_not_found_exception" ||
          indexError.meta.body.status === 404)
      ) {
        Logger.error`Index ${indexName} does not exist`;
        Logger.commandValueTip(
          "Create the index first or use a different index name",
          "-i <index-name>"
        );

        throw new ConductorError(
          `Index ${indexName} does not exist. Create the index first or use a different index name.`,
          ErrorCodes.INDEX_NOT_FOUND,
          indexError
        );
      } else {
        // Some other error occurred
        throw indexError;
      }
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error`Index check failed: ${errorMessage}`;

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
