import { Client } from "@elastic/elasticsearch";
import { ErrorFactory } from "../utils/errors";
import { Logger } from "../utils/logger";
import { ConnectionValidationResult, IndexValidationResult } from "../types";

/**
 * Validates Elasticsearch connection by making a ping request.
 */
export async function validateElasticsearchConnection(
  client: Client,
  config: any
): Promise<ConnectionValidationResult> {
  try {
    Logger.info`Testing connection to Elasticsearch at ${config.elasticsearch.url}`;
    Logger.debug`Elasticsearch config: ${JSON.stringify(config.elasticsearch, null, 2)}`;

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

    Logger.debug`Connection error details: ${JSON.stringify(error, null, 2)}`;
    Logger.debug`Error message: ${errorMessage}`;

    // Don't log error here - let calling code handle it
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
 * Fetches a list of user-defined (non-system) indices from Elasticsearch.
 */
async function getAvailableIndices(client: Client): Promise<string[]> {
  try {
    const response = await client.cat.indices({
      format: "json",
      h: "index",
    });

    if (Array.isArray(response.body)) {
      return response.body
        .map((idx: any) => idx.index)
        .filter((index: string) => index && !index.startsWith("."))
        .sort();
    }

    return [];
  } catch (error) {
    Logger.debugString(`Could not fetch available indices: ${error}`);
    return [];
  }
}

/**
 * Validates that a given index exists in Elasticsearch.
 */
export async function validateIndex(
  client: Client,
  indexName: string
): Promise<IndexValidationResult> {
  Logger.debug`Checking if index ${indexName} exists`;

  try {
    const { body } = await client.indices.get({ index: indexName });

    if (!body || !body[indexName]) {
      // Get available indices for helpful display
      const availableIndices = await getAvailableIndices(client);

      // Log the main error message
      Logger.errorString(`Index '${indexName}' not found`);

      // Display available indices if they exist
      if (availableIndices.length > 0) {
        Logger.suggestion("Available indices in Elasticsearch");
        availableIndices.forEach((index: string) => {
          Logger.generic(`   ▸ ${index}`);
        });
      } else {
        Logger.suggestion("No user indices found in Elasticsearch");
        Logger.generic("   ▸ You may need to create your first index");
      }

      // Create error but mark as already logged to prevent duplicate display
      const error = ErrorFactory.validation(
        `Index '${indexName}' not found`,
        {
          indexName,
          responseBody: body,
          availableIndices,
          alreadyLogged: true,
        },
        [] // Empty suggestions since we already displayed them above
      );

      (error as any).isLogged = true;
      throw error;
    }

    Logger.debug`Index ${indexName} exists`;
    return {
      valid: true,
      errors: [],
      exists: true,
    };
  } catch (indexError: any) {
    // If it's already our formatted error, rethrow it
    if (
      indexError instanceof Error &&
      indexError.name === "ConductorError" &&
      (indexError as any).isLogged
    ) {
      throw indexError;
    }

    if (
      indexError.meta?.body?.error?.type === "index_not_found_exception" ||
      indexError.meta?.body?.status === 404
    ) {
      // Get available indices for helpful display
      const availableIndices = await getAvailableIndices(client);

      // Log the main error message
      Logger.debug`Index '${indexName}' does not exist`;

      // Display available indices if they exist
      if (availableIndices.length > 0) {
        Logger.suggestion("Available indices in Elasticsearch");
        availableIndices.forEach((index: string) => {
          Logger.generic(`   ▸ ${index}`);
        });
      } else {
        Logger.suggestion("No user indices found in Elasticsearch");
        Logger.generic("   ▸ You may need to create your first index");
      }

      // Create error but mark as already logged
      const error = ErrorFactory.validation(
        `Index '${indexName}' does not exist`,
        {
          indexName,
          errorType: "index_not_found_exception",
          availableIndices,
          originalError: indexError,
          alreadyLogged: true,
        },
        [
          "Check the index name spelling and case sensitivity",
          "Use -i <index-name> to specify a different index",
          "Create the index in Elasticsearch first",
        ]
      );

      (error as any).isLogged = true;
      throw error;
    }

    const errorMessage =
      indexError instanceof Error ? indexError.message : String(indexError);

    throw ErrorFactory.connection(
      `Failed to check if index ${indexName} exists`,
      {
        indexName,
        originalError: indexError,
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
 * Validates that batch size is a positive number and warns about excessive size.
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
        "Recommended range: 100–5000",
        "Example: --batch-size 1000",
      ]
    );
  }

  if (batchSize > 10000) {
    Logger.warnString(
      `Batch size ${batchSize} is quite large and may cause performance issues`
    );
    Logger.tipString(
      "Consider using a smaller batch size (1000–5000) for better performance"
    );
  } else {
    Logger.debug`Batch size validated: ${batchSize}`;
  }
}
