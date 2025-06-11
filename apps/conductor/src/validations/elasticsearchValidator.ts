import { Client } from "@elastic/elasticsearch";
import { ErrorFactory } from "../utils/errors";
import { Logger } from "../utils/logger";
import { ConnectionValidationResult, IndexValidationResult } from "../types";

/**
 * Enhanced Elasticsearch validation with ErrorFactory patterns
 * Provides detailed, actionable feedback for connection and index issues
 */

/**
 * Validates Elasticsearch connection with enhanced error handling
 */
export async function validateElasticsearchConnection(
  client: Client,
  config: any
): Promise<ConnectionValidationResult> {
  const elasticsearchUrl = config.elasticsearch?.url || "unknown";

  try {
    Logger.info`Testing connection to Elasticsearch at ${elasticsearchUrl}`;

    const startTime = Date.now();

    // Enhanced ping with timeout
    const response = await Promise.race([
      client.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout")), 10000)
      ),
    ]);

    const responseTime = Date.now() - startTime;

    // Enhanced connection info gathering
    try {
      const info = await client.info();
      const clusterHealth = await client.cluster.health();

      Logger.success`Connected to Elasticsearch successfully (${responseTime}ms)`;
      Logger.debug`Cluster: ${info.body.cluster_name}, Version: ${info.body.version.number}`;
      Logger.debug`Cluster Status: ${clusterHealth.body.status}`;

      return {
        valid: true,
        errors: [],
        responseTimeMs: responseTime,
        version: info.body.version.number,
        clusterName: info.body.cluster_name,
      };
    } catch (infoError) {
      // Connection works but info gathering failed
      Logger.warn`Connected but could not gather cluster information`;

      return {
        valid: true,
        errors: [],
        responseTimeMs: responseTime,
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - Date.now(); // Reset timer for error case

    // Enhanced error analysis and suggestions
    const connectionError = analyzeConnectionError(
      error,
      elasticsearchUrl,
      config
    );

    Logger.error`Failed to connect to Elasticsearch at ${elasticsearchUrl}`;

    throw connectionError;
  }
}

/**
 * Enhanced index validation with detailed feedback
 */
export async function validateIndex(
  client: Client,
  indexName: string
): Promise<IndexValidationResult> {
  try {
    Logger.info`Checking if index '${indexName}' exists and is accessible`;

    // Enhanced index validation with detailed information
    const indexExists = await checkIndexExists(client, indexName);

    if (!indexExists.exists) {
      throw ErrorFactory.index(
        `Index '${indexName}' does not exist`,
        indexName,
        [
          `Create the index first: PUT /${indexName}`,
          "Check index name spelling and case sensitivity",
          "List available indices: GET /_cat/indices",
          "Use a different index name with --index parameter",
          `Example: conductor upload -f data.csv --index my-data-index`,
          `Current indices: ${indexExists.availableIndices
            .slice(0, 3)
            .join(", ")}${
            indexExists.availableIndices.length > 3 ? "..." : ""
          }`,
        ]
      );
    }

    // Get detailed index information
    const indexInfo = await getIndexDetails(client, indexName);

    // Check index health and status
    await validateIndexHealth(client, indexName, indexInfo);

    Logger.success`Index '${indexName}' is accessible and healthy`;

    return {
      valid: true,
      errors: [],
      exists: true,
      mappings: indexInfo.mappings,
      settings: indexInfo.settings,
    };
  } catch (error: any) {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    // Handle unexpected index validation errors
    throw ErrorFactory.index(
      `Failed to validate index '${indexName}': ${
        error.message || String(error)
      }`,
      indexName,
      [
        "Check Elasticsearch connectivity",
        "Verify index permissions",
        "Confirm authentication credentials",
        "Check cluster health status",
        `Test manually: GET /${indexName}`,
      ]
    );
  }
}

/**
 * Enhanced batch size validation with performance guidance
 */
export function validateBatchSize(batchSize: number): void {
  if (!batchSize || isNaN(batchSize) || batchSize <= 0) {
    throw ErrorFactory.config("Invalid batch size specified", "batchSize", [
      "Batch size must be a positive number",
      "Recommended range: 100-5000 depending on document size",
      "Smaller batches for large documents (100-500)",
      "Larger batches for small documents (1000-5000)",
      "Example: conductor upload -f data.csv --batch-size 1000",
    ]);
  }

  // Performance guidance based on batch size
  if (batchSize > 10000) {
    Logger.warn`Batch size ${batchSize} is very large and may cause performance issues`;
    Logger.tipString(
      "Consider using a smaller batch size (1000-5000) for better performance"
    );
  } else if (batchSize < 10) {
    Logger.warn`Batch size ${batchSize} is very small and may slow down uploads`;
    Logger.tipString(
      "Consider using a larger batch size (100-1000) for better throughput"
    );
  } else if (batchSize > 5000) {
    Logger.info`Using large batch size: ${batchSize}`;
    Logger.tipString("Monitor memory usage and reduce if you encounter issues");
  }

  Logger.debug`Batch size validated: ${batchSize}`;
}

/**
 * Analyze connection errors and provide specific suggestions
 */
function analyzeConnectionError(error: any, url: string, config: any): Error {
  const errorMessage = error.message || String(error);

  // Connection refused
  if (
    errorMessage.includes("ECONNREFUSED") ||
    errorMessage.includes("connect ECONNREFUSED")
  ) {
    return ErrorFactory.connection(
      "Cannot connect to Elasticsearch - connection refused",
      "Elasticsearch",
      url,
      [
        "Check that Elasticsearch is running",
        `Verify service URL: ${url}`,
        "Confirm Elasticsearch is listening on the specified port",
        "Check firewall settings and network connectivity",
        `Test manually: curl ${url}`,
        "Verify Docker containers are running if using Docker",
      ]
    );
  }

  // Timeout errors
  if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
    return ErrorFactory.connection(
      "Elasticsearch connection timed out",
      "Elasticsearch",
      url,
      [
        "Elasticsearch may be starting up or overloaded",
        "Check Elasticsearch service health and logs",
        "Verify network latency is acceptable",
        "Consider increasing timeout settings",
        "Check system resources (CPU, memory, disk space)",
      ]
    );
  }

  // Authentication errors
  if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
    return ErrorFactory.connection(
      "Elasticsearch authentication failed",
      "Elasticsearch",
      url,
      [
        "Check username and password are correct",
        "Verify authentication credentials",
        `Current user: ${config.elasticsearch?.user || "not specified"}`,
        "Ensure user has proper permissions",
        "Check if authentication is required for this Elasticsearch instance",
      ]
    );
  }

  // Permission errors
  if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
    return ErrorFactory.connection(
      "Elasticsearch access forbidden",
      "Elasticsearch",
      url,
      [
        "User lacks necessary permissions",
        "Check user roles and privileges",
        "Verify cluster and index permissions",
        "Contact Elasticsearch administrator",
        "Review security configuration",
      ]
    );
  }

  // SSL/TLS errors
  if (
    errorMessage.includes("SSL") ||
    errorMessage.includes("certificate") ||
    errorMessage.includes("CERT")
  ) {
    return ErrorFactory.connection(
      "Elasticsearch SSL/TLS connection error",
      "Elasticsearch",
      url,
      [
        "Check SSL certificate validity",
        "Verify TLS configuration",
        "Ensure proper SSL/TLS settings",
        "Check if HTTPS is required",
        "Try HTTP if HTTPS is causing issues (non-production only)",
      ]
    );
  }

  // DNS resolution errors
  if (
    errorMessage.includes("ENOTFOUND") ||
    errorMessage.includes("getaddrinfo")
  ) {
    return ErrorFactory.connection(
      "Cannot resolve Elasticsearch hostname",
      "Elasticsearch",
      url,
      [
        "Check hostname spelling in URL",
        "Verify DNS resolution works",
        "Try using IP address instead of hostname",
        "Check network connectivity",
        `Test DNS: nslookup ${new URL(url).hostname}`,
      ]
    );
  }

  // Version compatibility errors
  if (
    errorMessage.includes("version") ||
    errorMessage.includes("compatibility")
  ) {
    return ErrorFactory.connection(
      "Elasticsearch version compatibility issue",
      "Elasticsearch",
      url,
      [
        "Check Elasticsearch version compatibility",
        "Verify client library version",
        "Update client library if needed",
        "Check Elasticsearch version: GET /",
        "Review compatibility documentation",
      ]
    );
  }

  // Generic connection error
  return ErrorFactory.connection(
    `Elasticsearch connection failed: ${errorMessage}`,
    "Elasticsearch",
    url,
    [
      "Check Elasticsearch service status",
      "Verify connection parameters",
      "Review network connectivity",
      "Check service logs for errors",
      `Test connection: curl ${url}`,
    ]
  );
}

/**
 * Check if index exists and get available indices
 */
async function checkIndexExists(
  client: Client,
  indexName: string
): Promise<{
  exists: boolean;
  availableIndices: string[];
}> {
  try {
    // Check if specific index exists
    const existsResponse = await client.indices.exists({ index: indexName });

    // Get list of available indices for helpful suggestions
    let availableIndices: string[] = [];
    try {
      const catResponse = await client.cat.indices({ format: "json" });
      availableIndices = catResponse.body
        .map((idx: any) => idx.index || idx["index"])
        .filter(Boolean);
    } catch (catError) {
      Logger.debug`Could not retrieve available indices: ${catError}`;
    }

    return {
      exists: existsResponse.body === true,
      availableIndices,
    };
  } catch (error) {
    throw new Error(`Failed to check index existence: ${error}`);
  }
}

/**
 * Get detailed index information
 */
async function getIndexDetails(
  client: Client,
  indexName: string
): Promise<{
  mappings: any;
  settings: any;
  stats?: any;
}> {
  try {
    const [mappingResponse, settingsResponse] = await Promise.all([
      client.indices.getMapping({ index: indexName }),
      client.indices.getSettings({ index: indexName }),
    ]);

    // Optionally get index stats for health information
    let stats;
    try {
      const statsResponse = await client.indices.stats({ index: indexName });
      stats = statsResponse.body.indices[indexName];
    } catch (statsError) {
      Logger.debug`Could not retrieve index stats: ${statsError}`;
    }

    return {
      mappings: mappingResponse.body[indexName]?.mappings,
      settings: settingsResponse.body[indexName]?.settings,
      stats,
    };
  } catch (error) {
    throw new Error(`Failed to get index details: ${error}`);
  }
}

/**
 * Validate index health and provide warnings
 */
async function validateIndexHealth(
  client: Client,
  indexName: string,
  indexInfo: any
): Promise<void> {
  try {
    // Check cluster health for this index
    const healthResponse = await client.cluster.health({
      index: indexName,
      level: "indices",
    });

    const indexHealth = healthResponse.body.indices?.[indexName];

    if (indexHealth) {
      const status = indexHealth.status;

      if (status === "red") {
        Logger.warn`Index '${indexName}' has RED status - some data may be unavailable`;
        Logger.tipString("Check index shards and cluster health");
      } else if (status === "yellow") {
        Logger.warn`Index '${indexName}' has YELLOW status - replicas may be missing`;
        Logger.tipString("This is often normal for single-node clusters");
      } else {
        Logger.debug`Index '${indexName}' has GREEN status - healthy`;
      }
    }

    // Check for mapping issues
    if (
      indexInfo.mappings &&
      Object.keys(indexInfo.mappings.properties || {}).length === 0
    ) {
      Logger.warn`Index '${indexName}' has no field mappings`;
      Logger.tipString(
        "Mappings will be created automatically when data is indexed"
      );
    }

    // Check shard count for performance
    if (indexInfo.stats) {
      const shardCount = indexInfo.stats.primaries?.shards_count;
      if (shardCount > 50) {
        Logger.warn`Index '${indexName}' has many shards (${shardCount}) which may impact performance`;
        Logger.tipString("Consider using fewer shards for better performance");
      }
    }
  } catch (error) {
    Logger.debug`Could not validate index health: ${error}`;
    // Don't throw - health validation is informational
  }
}
