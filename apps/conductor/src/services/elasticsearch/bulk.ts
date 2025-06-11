/**
 * Elasticsearch Bulk Operations Module
 *
 * Provides functions for bulk indexing operations in Elasticsearch.
 * Enhanced with ErrorFactory patterns for consistent error handling.
 */

import { Client } from "@elastic/elasticsearch";
import { ErrorFactory, ErrorCodes } from "../../utils/errors";
import { Logger } from "../../utils/logger";

/**
 * Interface for bulk operation options
 */
interface BulkOptions {
  /** Maximum number of retries for failed bulk operations */
  maxRetries?: number;

  /** Whether to refresh the index after the operation */
  refresh?: boolean;
}

/**
 * Sends a bulk write request to Elasticsearch.
 * Enhanced with ErrorFactory patterns for better error handling.
 *
 * @param client - The Elasticsearch client instance
 * @param records - An array of records to be indexed
 * @param indexName - The name of the Elasticsearch index
 * @param onFailure - Callback function to handle failed records
 * @param options - Optional configuration for bulk operations
 * @throws Enhanced ConductorError with specific guidance if bulk operation fails
 */
export async function sendBulkWriteRequest(
  client: Client,
  records: object[],
  indexName: string,
  onFailure: (count: number) => void,
  options: BulkOptions = {}
): Promise<void> {
  const maxRetries = options.maxRetries || 3;
  const refresh = options.refresh !== undefined ? options.refresh : true;

  // Enhanced parameter validation
  if (!client) {
    throw ErrorFactory.args(
      "Elasticsearch client is required for bulk operations",
      "bulk",
      [
        "Ensure Elasticsearch client is properly initialized",
        "Check client connection and configuration",
        "Verify Elasticsearch service is running",
      ]
    );
  }

  if (!records || records.length === 0) {
    throw ErrorFactory.args("No records provided for bulk indexing", "bulk", [
      "Ensure records array is not empty",
      "Check data processing pipeline",
      "Verify CSV file contains data",
    ]);
  }

  if (!indexName || typeof indexName !== "string") {
    throw ErrorFactory.args(
      "Valid index name is required for bulk operations",
      "bulk",
      [
        "Provide a valid Elasticsearch index name",
        "Check index name configuration",
        "Use --index parameter to specify target index",
      ]
    );
  }

  let attempt = 0;
  let success = false;
  let lastError: Error | null = null;

  Logger.debugString(
    `Attempting bulk write of ${records.length} records to index '${indexName}'`
  );

  while (attempt < maxRetries && !success) {
    try {
      attempt++;
      Logger.debugString(`Bulk write attempt ${attempt}/${maxRetries}`);

      // Prepare bulk request body
      const body = records.flatMap((doc) => [
        { index: { _index: indexName } },
        doc,
      ]);

      // Execute bulk request
      const { body: result } = await client.bulk({
        body,
        refresh,
      });

      // Enhanced error handling for bulk response
      if (result.errors) {
        let failureCount = 0;
        const errorDetails: string[] = [];

        result.items.forEach((item: any, index: number) => {
          if (item.index?.error) {
            failureCount++;
            const error = item.index.error;
            const errorType = error.type || "unknown";
            const errorReason = error.reason || "unknown reason";

            Logger.errorString(
              `Bulk indexing error for record ${index}: status=${item.index.status}, type=${errorType}, reason=${errorReason}`
            );

            // Collect unique error types for better feedback
            const errorSummary = `${errorType}: ${errorReason}`;
            if (!errorDetails.includes(errorSummary)) {
              errorDetails.push(errorSummary);
            }
          }
        });

        onFailure(failureCount);

        // Enhanced error analysis and suggestions
        if (failureCount === records.length) {
          // All records failed
          throw ErrorFactory.index(
            `All ${records.length} records failed bulk indexing`,
            indexName,
            [
              "Check index mapping compatibility with data",
              "Verify index exists and is writable",
              "Review data format and field types",
              ...errorDetails.slice(0, 3).map((detail) => `Error: ${detail}`),
              "Use smaller batch sizes if documents are too large",
              "Check Elasticsearch cluster health and resources",
            ]
          );
        } else if (failureCount > records.length * 0.5) {
          // More than half failed
          Logger.warnString(
            `High failure rate: ${failureCount}/${records.length} records failed`
          );
          Logger.tipString("Consider reviewing data format and index mappings");
        }

        // If some records succeeded, consider it a partial success
        if (failureCount < records.length) {
          success = true;
          Logger.infoString(
            `Partial success: ${records.length - failureCount}/${
              records.length
            } records indexed successfully`
          );
        }
      } else {
        // All records succeeded
        success = true;
        Logger.debugString(
          `All ${records.length} records indexed successfully`
        );
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      Logger.errorString(
        `Bulk indexing attempt ${attempt} failed: ${lastError.message}`
      );
      onFailure(records.length);

      if (attempt < maxRetries) {
        const backoffDelay = 1000 * attempt; // Exponential backoff
        Logger.infoString(
          `Retrying in ${backoffDelay}ms... (${attempt}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }

  if (!success) {
    // Enhanced error message based on the type of failure
    const errorMessage = lastError?.message || "Unknown bulk operation error";

    let suggestions = [
      "Check Elasticsearch service connectivity and health",
      "Verify index exists and has proper permissions",
      "Review data format and compatibility with index mapping",
      "Consider reducing batch size for large documents",
      "Check cluster resources (disk space, memory)",
    ];

    // Add specific suggestions based on error patterns
    if (errorMessage.includes("timeout")) {
      suggestions.unshift("Increase timeout settings for large batches");
      suggestions.unshift("Try smaller batch sizes to reduce processing time");
    } else if (
      errorMessage.includes("memory") ||
      errorMessage.includes("heap")
    ) {
      suggestions.unshift("Reduce batch size to lower memory usage");
      suggestions.unshift("Check Elasticsearch heap size configuration");
    } else if (errorMessage.includes("mapping")) {
      suggestions.unshift("Check field mappings match your data types");
      suggestions.unshift("Update index mapping or modify data format");
    } else if (
      errorMessage.includes("permission") ||
      errorMessage.includes("403")
    ) {
      suggestions.unshift("Check index write permissions");
      suggestions.unshift("Verify authentication credentials");
    }

    throw ErrorFactory.connection(
      `Bulk indexing failed after ${maxRetries} attempts: ${errorMessage}`,
      "Elasticsearch",
      undefined,
      suggestions
    );
  }
}
