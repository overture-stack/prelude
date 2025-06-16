/**
 * Elasticsearch Validator
 *
 * Validates Elasticsearch connections, indices, and configurations.
 * Enhanced with ErrorFactory patterns for consistent error handling.
 */

import { Client } from "@elastic/elasticsearch";
import {
  ConnectionValidationResult,
  IndexValidationResult,
} from "../types/validations";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";

/**
 * Enhanced Elasticsearch connection validation with detailed error analysis
 */
export async function validateElasticsearchConnection(
  client: Client,
  url: string
): Promise<ConnectionValidationResult> {
  try {
    Logger.debug`Testing Elasticsearch connection to ${url}`;
    const startTime = Date.now();

    const response = await client.info();
    const responseTime = Date.now() - startTime;

    Logger.success`Connected to Elasticsearch cluster: ${response.body.cluster_name}`;
    Logger.debug`Response time: ${responseTime}ms`;

    return {
      valid: true,
      errors: [],
      version: response.body.version?.number,
      clusterName: response.body.cluster_name,
      responseTimeMs: responseTime,
    };
  } catch (error) {
    const enhancedError = createConnectionError(error, url);

    return {
      valid: false,
      errors: [enhancedError.message],
      responseTimeMs: undefined,
    };
  }
}

/**
 * Enhanced index validation with detailed error handling
 */
export async function validateIndex(
  client: Client,
  indexName: string
): Promise<IndexValidationResult> {
  try {
    Logger.debug`Checking if index exists: ${indexName}`;

    const existsResponse = await client.indices.exists({
      index: indexName,
    });

    if (!existsResponse.body) {
      return {
        valid: false,
        exists: false,
        errors: [`Index '${indexName}' does not exist`],
      };
    }

    // Get index details if it exists
    try {
      Logger.debug`Getting index details for: ${indexName}`;

      const [mappingsResponse, settingsResponse] = await Promise.all([
        client.indices.getMapping({ index: indexName }),
        client.indices.getSettings({ index: indexName }),
      ]);

      return {
        valid: true,
        exists: true,
        errors: [],
        mappings: mappingsResponse.body[indexName]?.mappings,
        settings: settingsResponse.body[indexName]?.settings,
      };
    } catch (detailsError) {
      // Enhanced error handling for index details retrieval
      throw ErrorFactory.connection(
        `Failed to get index details: ${
          detailsError instanceof Error
            ? detailsError.message
            : String(detailsError)
        }`,
        "Elasticsearch",
        undefined, // URL not available in this context
        [
          `Check read permissions for index '${indexName}'`,
          "Verify user has necessary cluster privileges",
          "Ensure index is not in a locked state",
          "Check Elasticsearch cluster health",
          "Try accessing index through Kibana or other tools to verify accessibility",
        ]
      );
    }
  } catch (error) {
    // Enhanced error handling for index existence check
    if (error instanceof Error && error.name === "ConductorError") {
      throw error; // Re-throw enhanced errors
    }

    throw ErrorFactory.connection(
      `Failed to check index existence: ${
        error instanceof Error ? error.message : String(error)
      }`,
      "Elasticsearch",
      undefined, // URL not available in this context
      [
        `Verify index name '${indexName}' is correct`,
        "Check Elasticsearch connection is stable",
        "Ensure user has index read permissions",
        "Check if index was recently deleted or renamed",
        "Verify cluster is healthy and responsive",
      ]
    );
  }
}

/**
 * Validates that CSV headers match the Elasticsearch index mapping
 * Enhanced with ErrorFactory patterns for detailed guidance
 */
export async function validateHeadersMatchMappings(
  client: Client,
  headers: string[],
  indexName: string
): Promise<void> {
  try {
    Logger.debug`Validating CSV headers against Elasticsearch index mapping`;
    Logger.debug`Headers: ${headers.join(", ")}`;
    Logger.debug`Index: ${indexName}`;

    // Get index mapping
    let mappingResponse;
    try {
      mappingResponse = await client.indices.getMapping({ index: indexName });
    } catch (mappingError) {
      throw ErrorFactory.index(
        `Failed to retrieve mapping for index '${indexName}'`,
        indexName,
        [
          "Check that the index exists",
          "Verify user has read permissions on the index",
          "Ensure Elasticsearch is accessible",
          `Test manually: GET /${indexName}/_mapping`,
          "Create the index with proper mapping if it doesn't exist",
        ]
      );
    }

    const indexMapping = mappingResponse.body[indexName]?.mappings?.properties;

    if (!indexMapping) {
      Logger.warn`No mapping properties found for index '${indexName}' - proceeding with dynamic mapping`;
      return;
    }

    // Get field names from mapping
    const mappingFields = Object.keys(indexMapping);
    Logger.debug`Index mapping fields: ${mappingFields.join(", ")}`;

    // Clean headers (remove whitespace, handle case sensitivity)
    const cleanHeaders = headers.map((header) => header.trim());

    // Check for missing fields in mapping
    const unmappedHeaders = cleanHeaders.filter((header) => {
      // Check for exact match first
      if (mappingFields.includes(header)) return false;

      // Check for case-insensitive match
      const lowerHeader = header.toLowerCase();
      return !mappingFields.some(
        (field) => field.toLowerCase() === lowerHeader
      );
    });

    // Check for potential field naming issues
    const potentialMismatches: string[] = [];
    unmappedHeaders.forEach((header) => {
      const lowerHeader = header.toLowerCase();
      const similarFields = mappingFields.filter(
        (field) =>
          field.toLowerCase().includes(lowerHeader) ||
          lowerHeader.includes(field.toLowerCase())
      );

      if (similarFields.length > 0) {
        potentialMismatches.push(
          `'${header}' might match: ${similarFields.join(", ")}`
        );
      }
    });

    // Report validation results
    if (unmappedHeaders.length === 0) {
      Logger.success`All CSV headers match index mapping fields`;
      return;
    }

    // Handle unmapped headers
    if (unmappedHeaders.length > headers.length * 0.5) {
      // More than 50% of headers don't match - likely a serious issue
      // UPDATED: Create a directly-visible error message that includes all key information
      const errorMessage = `Many CSV headers don't match index mapping (${unmappedHeaders.length} of ${headers.length})`;

      // Create a more comprehensive list of suggestions with all the details
      const enhancedSuggestions = [
        "Check that you're using the correct index",
        "Verify CSV headers match expected field names",
        "Consider updating index mapping to include new fields",
        "Check for case sensitivity issues in field names",
        // Add CSV headers directly in suggestions so they're always visible
        `CSV headers (${headers.length}): ${headers.join(", ")}`,
        // Add unmapped headers directly in suggestions so they're always visible
        `Unmapped headers (${unmappedHeaders.length}): ${unmappedHeaders.join(
          ", "
        )}`,
        // Add expected fields directly in suggestions so they're always visible
        `Expected fields in mapping (${
          mappingFields.length
        }): ${mappingFields.join(", ")}`,
      ];

      // Add potential matches if available
      if (potentialMismatches.length > 0) {
        enhancedSuggestions.push("Potential matches:");
        potentialMismatches.forEach((match) => {
          enhancedSuggestions.push(`  ${match}`);
        });
      }

      // Add a direct recommendation based on the situation
      if (unmappedHeaders.length === headers.length) {
        enhancedSuggestions.push(
          "All headers are unmapped - you may be using the wrong index or need to create a mapping first"
        );
      }

      throw ErrorFactory.validation(
        errorMessage,
        {
          unmappedHeaders,
          mappingFields,
          indexName,
          potentialMismatches,
        },
        enhancedSuggestions
      );
    } else {
      // Some headers don't match - warn but continue
      Logger.warn`Some CSV headers don't match index mapping:`;
      unmappedHeaders.forEach((header) => {
        Logger.warn`  - ${header}`;
      });

      if (potentialMismatches.length > 0) {
        Logger.info`Potential matches found:`;
        potentialMismatches.slice(0, 3).forEach((match) => {
          Logger.info`  - ${match}`;
        });
      }

      Logger.tipString("Unmapped fields will use dynamic mapping if enabled");
      Logger.tipString(
        "Consider updating your index mapping or CSV headers for better consistency"
      );
    }
  } catch (validateError) {
    if (
      validateError instanceof Error &&
      validateError.name === "ConductorError"
    ) {
      throw validateError;
    }

    throw ErrorFactory.validation(
      `Failed to validate headers against mapping: ${
        validateError instanceof Error
          ? validateError.message
          : String(validateError)
      }`,
      { headers, indexName },
      [
        "Check Elasticsearch connectivity",
        "Verify index exists and is accessible",
        "Ensure proper authentication credentials",
        "Check index permissions",
        "Review network connectivity",
      ]
    );
  }
}

/**
 * Enhanced batch size validation with helpful guidance
 */
export function validateBatchSize(batchSize: number): void {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw ErrorFactory.validation(
      `Invalid batch size: ${batchSize}`,
      { batchSize },
      [
        "Batch size must be a positive integer",
        "Recommended range: 100-1000 for most use cases",
        "Use smaller batch sizes (100-500) for large documents",
        "Use larger batch sizes (500-1000) for small documents",
        "Start with 500 and adjust based on performance",
      ]
    );
  }

  // Provide guidance for suboptimal batch sizes
  if (batchSize < 10) {
    Logger.warn`Batch size ${batchSize} is very small - this may impact performance`;
    Logger.tipString(
      "Consider using batch sizes of 100-1000 for better throughput"
    );
  } else if (batchSize > 5000) {
    Logger.warn`Batch size ${batchSize} is very large - this may cause memory issues`;
    Logger.tipString(
      "Consider using smaller batch sizes (500-2000) to avoid timeouts"
    );
  }

  Logger.debug`Batch size validated: ${batchSize}`;
}

/**
 * Enhanced connection error analysis and categorization
 */
function createConnectionError(error: unknown, url: string): Error {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Authentication errors
  if (
    errorMessage.includes("401") ||
    errorMessage.includes("authentication") ||
    errorMessage.includes("unauthorized")
  ) {
    return ErrorFactory.connection(
      "Elasticsearch authentication failed",
      "Elasticsearch",
      url,
      [
        "Check username and password",
        "Verify API key or token is valid",
        "Ensure authentication method is correct",
        "Check if credentials have expired",
        "Verify service account permissions",
      ]
    );
  }

  // Authorization errors
  if (
    errorMessage.includes("403") ||
    errorMessage.includes("forbidden") ||
    errorMessage.includes("permission")
  ) {
    return ErrorFactory.connection(
      "Elasticsearch search access forbidden - insufficient permissions",
      "Elasticsearch",
      undefined,
      [
        "User lacks necessary cluster or index permissions",
        "Check user roles and privileges in Elasticsearch",
        "Verify cluster-level permissions",
        "Contact Elasticsearch administrator for access",
        "Review security policy and user roles",
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
      undefined,
      [
        "Check SSL certificate validity and trust",
        "Verify TLS configuration matches server settings",
        "Ensure proper SSL/TLS version compatibility",
        "Check if HTTPS is required for this instance",
        "Try HTTP if HTTPS is causing issues (development only)",
        "Verify certificate authority and trust chain",
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
      undefined,
      [
        "Check hostname spelling in the URL",
        "Verify DNS resolution is working",
        "Try using IP address instead of hostname",
        "Check network connectivity and DNS servers",
        "Test with: nslookup <hostname>",
        "Verify hosts file doesn't have conflicting entries",
      ]
    );
  }

  // Connection refused errors
  if (errorMessage.includes("ECONNREFUSED")) {
    return ErrorFactory.connection(
      "Connection refused by Elasticsearch server",
      "Elasticsearch",
      url,
      [
        "Check that Elasticsearch is running",
        "Verify correct port is being used",
        "Ensure firewall is not blocking connection",
        "Check network connectivity",
        "Verify cluster status and health",
      ]
    );
  }

  // Timeout errors
  if (
    errorMessage.includes("ETIMEDOUT") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("ESOCKETTIMEDOUT")
  ) {
    return ErrorFactory.connection(
      "Elasticsearch connection timed out",
      "Elasticsearch",
      url,
      [
        "Check network latency and connectivity",
        "Verify Elasticsearch server is not overloaded",
        "Increase connection timeout settings",
        "Check if the server is responding to other requests",
        "Verify server resource utilization",
      ]
    );
  }

  // Generic connection error
  return ErrorFactory.connection(
    `Failed to connect to Elasticsearch: ${errorMessage}`,
    "Elasticsearch",
    url,
    [
      "Check that Elasticsearch is running and accessible",
      "Verify network connectivity",
      "Check authentication credentials",
      "Ensure correct URL and port",
      "Verify cluster health and status",
    ]
  );
}
