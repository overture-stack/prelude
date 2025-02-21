import { Client } from "@elastic/elasticsearch";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { Config } from "../types";

/**
 * Validates connection to Elasticsearch cluster.
 * Tests connectivity and authentication.
 *
 * @param client - Elasticsearch client instance
 * @param config - Configuration object with connection details
 * @returns Promise resolving to true if connection is successful
 * @throws ConductorError if connection fails
 */
export async function validateElasticsearchConnection(
  client: Client,
  config: Config
): Promise<boolean> {
  try {
    await client.cluster.health();
    console.log(chalk.green("✓ Connection to Elasticsearch successful"));
    return true;
  } catch (error: any) {
    if (error?.name === "ConnectionError") {
      throw new ConductorError(
        "Could not connect to Elasticsearch",
        ErrorCodes.CONNECTION_ERROR,
        {
          url: config.elasticsearch.url,
          suggestion: "Check if Elasticsearch is running and URL is correct",
        }
      );
    } else if (error?.name === "AuthenticationException") {
      throw new ConductorError("Authentication failed", ErrorCodes.AUTH_ERROR, {
        suggestion: "Verify username, password and permissions",
      });
    }

    throw new ConductorError(
      "Error connecting to Elasticsearch",
      ErrorCodes.CONNECTION_ERROR,
      {
        originalError: error,
        message: error.message,
        name: error.name,
      }
    );
  }
}

/**
 * Validates existence and accessibility of Elasticsearch index.
 * Also retrieves and validates index settings if present.
 *
 * @param client - Elasticsearch client instance
 * @param indexName - Name of the index to validate
 * @returns Promise resolving to true if index is valid
 * @throws ConductorError if validation fails
 */
export async function validateIndex(
  client: Client,
  indexName: string
): Promise<boolean> {
  try {
    // Check index existence using modern ES7 method
    const { body: exists } = await client.indices.exists({ index: indexName });

    if (!exists) {
      // Fetch available indices
      const { body } = await client.cat.indices({ format: "json", v: true });
      const availableIndices = body
        .filter((idx: any) => {
          const name = idx.index;
          return !name.startsWith(".") && !name.endsWith("_arranger_set");
        })
        .map((idx: any) => idx.index)
        .sort();

      throw new ConductorError(
        `Index '${indexName}' does not exist`,
        ErrorCodes.INDEX_NOT_FOUND,
        { availableIndices }
      );
    }

    // Retrieve index information without type-specific parameters
    const { body: indexInfo } = await client.indices.get({
      index: indexName,
    });

    console.log(chalk.green(`✓ Index '${indexName}' exists and is valid`));
    return true;
  } catch (error: any) {
    // Handle different types of errors
    if (error instanceof ConductorError) {
      throw error;
    }

    // Log the full error for debugging
    console.error(chalk.red("Index validation error:"), error);

    throw new ConductorError(
      "Error validating index",
      ErrorCodes.VALIDATION_FAILED,
      {
        message: error.message,
        errorName: error.name,
        errorCode: error.statusCode,
        originalError: error,
      }
    );
  }
}

/**
 * Validates batch size configuration for Elasticsearch operations.
 * Checks for positive numbers and warns about large batch sizes.
 *
 * @param batchSize - Batch size to validate
 * @returns true if batch size is valid
 * @throws ConductorError if validation fails
 */
export function validateBatchSize(batchSize: number): boolean {
  if (isNaN(batchSize) || batchSize < 1) {
    throw new ConductorError(
      "Batch size must be a positive number",
      ErrorCodes.INVALID_ARGS
    );
  }

  if (batchSize > 10000) {
    console.log(
      chalk.yellow(
        "\n⚠️  Warning: Large batch size may cause memory issues or timeouts"
      )
    );
    console.log("Recommended batch size is between 500 and 5000");
  }

  return true;
}
