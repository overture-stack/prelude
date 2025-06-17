import { Client } from "@elastic/elasticsearch";
import { ErrorFactory } from "../utils/errors";
import { Logger } from "../utils/logger";
import { ConnectionValidationResult, IndexValidationResult } from "../types";

/**
 * Elasticsearch validation utilities
 * Updated to use error factory pattern for consistent error handling
 */

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
    Logger.errorString(`Failed to connect to Elasticsearch: ${errorMessage}`);

    // Add a warning with the override command info
    Logger.tipString(
      "Check Elasticsearch is running and that the correct URL and auth params are in use"
    );

    throw ErrorFactory.connection(
      `Failed to connect to Elasticsearch`,
      {
        elasticsearchUrl: config.elasticsearch.url,
        originalError: error,
        errorMessage,
      },
      [
        "Check that Elasticsearch is running and accessible",
        `Verify the URL: ${config.elasticsearch.url}`,
        "Check authentication credentials if required",
        "Review network connectivity and firewall settings",
        "Use --url <elasticsearch-url> to specify a different URL",
      ]
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
    Logger.debug`Checking if index ${indexName} exists`;

    // Use the more reliable get method with a try/catch
    try {
      const { body } = await client.indices.get({ index: indexName });

      // Check if we actually got back information about the requested index
      if (!body || !body[indexName]) {
        Logger.errorString(`Index ${indexName} not found in response`);
        throw ErrorFactory.validation(
          `Index ${indexName} not found`,
          {
            indexName,
            responseBody: body,
            availableIndices: body ? Object.keys(body) : [],
          },
          [
            "Check that the index name is spelled correctly",
            "Verify the index exists in Elasticsearch",
            "Create the index first if it doesn't exist",
            "Use -i <index-name> to specify a different index",
          ]
        );
      }

      Logger.debug`Index ${indexName} exists`;

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
        Logger.errorString(`Index ${indexName} does not exist`);
        Logger.tipString(
          "Create the index first or use a different index name"
        );

        throw ErrorFactory.validation(
          `Index ${indexName} does not exist`,
          {
            indexName,
            errorType: "index_not_found_exception",
            originalError: indexError,
          },
          [
            "Create the index in Elasticsearch first",
            "Use a different existing index name",
            "Check index name spelling and case sensitivity",
            "Use -i <index-name> to specify a different index",
          ]
        );
      } else {
        // Some other error occurred - rethrow it
        throw indexError;
      }
    }
  } catch (error: any) {
    // If it's already a ConductorError, rethrow it
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.errorString(`Index check failed: ${errorMessage}`);

    throw ErrorFactory.connection(
      `Failed to check if index ${indexName} exists`,
      {
        indexName,
        originalError: error,
        errorMessage,
      },
      [
        "Check Elasticsearch connection and availability",
        "Verify you have permissions to access the index",
        "Ensure Elasticsearch service is running",
        "Review Elasticsearch logs for errors",
      ]
    );
  }
}

/**
 * Validates that batch size is a positive number
 */
export function validateBatchSize(batchSize: number): void {
  if (!batchSize || isNaN(batchSize) || batchSize <= 0) {
    throw ErrorFactory.validation(
      "Batch size must be a positive number",
      {
        provided: batchSize,
        type: typeof batchSize,
      },
      [
        "Provide a positive number for batch size",
        "Recommended range: 100-5000",
        "Example: --batch-size 1000",
      ]
    );
  }

  if (batchSize > 10000) {
    Logger.warnString(
      `Batch size ${batchSize} is quite large and may cause performance issues`
    );
    Logger.tipString(
      "Consider using a smaller batch size (1000-5000) for better performance"
    );
  } else {
    Logger.debug`Batch size validated: ${batchSize}`;
  }
}
